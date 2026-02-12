import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue-manager';
import { Song } from '@/types';
import { configManager } from '@/lib/config-manager';

// POST /api/recommendations - Generate recommended songs based on play history
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const count = body.count || 5;
    
    const state = queueManager.getState();
    const playHistory = state.playHistory;
    
    // Get YouTube API key from config
    const config = configManager.getConfig();
    const apiKey = config.youtube.apiKeys[0];
    
    if (!apiKey) {
      console.error('No YouTube API key configured');
      return NextResponse.json(
        { error: 'YouTube API key not configured' },
        { status: 500 }
      );
    }
    
    // Determine search query
    let searchQuery: string;
    if (playHistory.length > 0) {
      // Get a random recent song from history
      const recentSongs = playHistory.slice(-10);
      const seedSong = recentSongs[Math.floor(Math.random() * recentSongs.length)];
      console.log('Getting recommendations based on:', seedSong.title);
      searchQuery = `${seedSong.artist} ${seedSong.title} karaoke`;
    } else {
      // No play history yet - use a default popular karaoke query
      console.log('No play history yet - using default karaoke search');
      searchQuery = 'karaoke popular songs';
    }
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', searchQuery);
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('videoCategoryId', '10'); // Music category
    searchUrl.searchParams.set('maxResults', String(count));
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('safeSearch', 'none');
    
    const response = await fetch(searchUrl.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch recommendations' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    const recommendations: Song[] = data.items.map((item: any) => ({
      id: `yt-fallback-${item.id.videoId}-${Date.now()}`,
      videoId: item.id.videoId,
      title: item.snippet.title,
      artist: item.snippet.channelTitle,
      duration: 0, // Duration not available in search results
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
      source: 'youtube' as const,
      addedAt: Date.now(),
      addedBy: 'system',
      isFallback: true
    }));
    
    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error('Recommendations error:', error);
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
