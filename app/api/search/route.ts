import { NextRequest, NextResponse } from 'next/server';
import { YouTubeSearchResult } from '@/types';
import { configManager } from '@/lib/config-manager';

const DEFAULT_MAX_RESULTS = 10;

const buildSearchQuery = (query: string, mode: string, karaokeOnly: boolean = true) => {
  const trimmed = query.trim();
  
  if (!karaokeOnly) {
    // Return query as-is for non-karaoke searches
    return trimmed;
  }
  
  switch (mode) {
    case 'artist':
      return `${trimmed} karaoke songs`;
    case 'genre':
      return `${trimmed} karaoke playlist`;
    case 'decade':
      return `${trimmed} karaoke hits`;
    default:
      return `${trimmed} karaoke`;
  }
};

const clampLimit = (rawLimit: string | null, fallback: number) => {
  const parsed = rawLimit ? parseInt(rawLimit, 10) : NaN;
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 25));
};

const isoToDuration = (iso?: string) => {
  if (!iso) return '0:00';
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!match) return '0:00';
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  const totalMinutes = hours * 60 + minutes;
  const paddedSeconds = seconds.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:${paddedSeconds}` : `${totalMinutes}:${paddedSeconds}`;
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const mode = searchParams.get('mode') || 'song';
  const limitParam = searchParams.get('limit');
  const includeUnembeddableParam = searchParams.get('includeUnembeddable');
  const karaokeOnlyParam = searchParams.get('karaokeOnly');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  try {
    const apiKey = configManager.getYouTubeApiKey();
    const config = configManager.getConfig();

    const includeUnembeddableDefault = config.search?.includeUnembeddable ?? true;
    const includeUnembeddable = includeUnembeddableParam === 'true'
      ? true
      : includeUnembeddableParam === 'false'
        ? false
        : includeUnembeddableDefault;

    const karaokeOnly = karaokeOnlyParam === 'false' ? false : true;
    const maxResults = clampLimit(limitParam, config.search?.maxResults ?? DEFAULT_MAX_RESULTS);
    const searchQuery = buildSearchQuery(query, mode, karaokeOnly);

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoEmbeddable=${includeUnembeddable ? 'any' : 'true'}&maxResults=${maxResults}&key=${apiKey}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('YouTube API error:', response.status, errorData);
      throw new Error(`YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();

    const videoIds = data.items
      .map((item: any) => item.id?.videoId)
      .filter(Boolean);

    let embeddability: Record<string, { embeddable: boolean; blockedReason?: string; duration?: string }> = {};

    if (videoIds.length > 0) {
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,status&id=${videoIds.join(',')}&key=${apiKey}`;
      const detailsResponse = await fetch(detailsUrl);

      if (detailsResponse.ok) {
        const detailsData = await detailsResponse.json();
        embeddability = (detailsData.items || []).reduce((acc: Record<string, any>, item: any) => {
          const id = item.id;
          const embeddable = item.status?.embeddable !== false;
          const blockedReason = !embeddable ? (item.status?.rejectionReason || item.status?.failureReason || 'Not embeddable') : undefined;
          acc[id] = { embeddable, blockedReason, duration: isoToDuration(item.contentDetails?.duration) };
          return acc;
        }, {});
      } else {
        console.warn('Failed to fetch video details for embeddability check');
      }
    }

    const results: YouTubeSearchResult[] = data.items
      .map((item: any) => {
        const videoId = item.id.videoId;
        const embedInfo = embeddability[videoId] ?? { embeddable: true };
        return {
          videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnail: item.snippet.thumbnails.medium.url,
          duration: embedInfo.duration || '0:00',
          embeddable: embedInfo.embeddable,
          blockedReason: embedInfo.blockedReason,
        } as YouTubeSearchResult;
      })
      .filter((result: YouTubeSearchResult) => (includeUnembeddable ? true : result.embeddable));

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search YouTube' },
      { status: 500 }
    );
  }
}
