import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue-manager';
import { Song } from '@/types';
import { ensureListenersAttached } from '@/lib/socket';

// GET /api/queue - Get current queue state
export async function GET() {
  const state = queueManager.getState();
  return NextResponse.json(state);
}

// POST /api/queue - Add song to queue
export async function POST(request: NextRequest) {
  try {
    // Ensure socket listeners are attached (fixes hot reload issues)
    ensureListenersAttached();
    
    const song: Song = await request.json();
    
    if (!song.videoId || !song.title) {
      return NextResponse.json(
        { error: 'Invalid song data' },
        { status: 400 }
      );
    }

    queueManager.addSong(song);
    
    return NextResponse.json({ success: true, song });
  } catch (error) {
    console.error('Add song error:', error);
    return NextResponse.json(
      { error: 'Failed to add song' },
      { status: 500 }
    );
  }
}

// DELETE /api/queue - Clear entire queue
export async function DELETE() {
  queueManager.clearQueue();
  return NextResponse.json({ success: true });
}
