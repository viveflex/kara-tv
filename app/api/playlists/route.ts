import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue-manager';
import { listPlaylists, savePlaylist, loadPlaylist } from '@/lib/playlist-store';

export async function GET() {
  const list = listPlaylists();
  return NextResponse.json({ playlists: list });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, name } = body;

    if (!action || !name) {
      return NextResponse.json({ error: 'action and name required' }, { status: 400 });
    }

    if (action === 'save') {
      const state = queueManager.getState();
      const entry = savePlaylist(name, state.songs);
      return NextResponse.json({ success: true, playlist: { name: entry.name, updatedAt: entry.updatedAt, count: entry.songs.length } });
    }

    if (action === 'load') {
      const entry = loadPlaylist(name);
      if (!entry) return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
      queueManager.setQueue(entry.songs);
      return NextResponse.json({ success: true, playlist: { name: entry.name, count: entry.songs.length } });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Playlists API error:', error);
    return NextResponse.json({ error: 'Playlist operation failed' }, { status: 500 });
  }
}
