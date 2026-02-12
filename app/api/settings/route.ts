import { NextRequest, NextResponse } from 'next/server';
import { queueManager } from '@/lib/queue-manager';

// GET /api/settings - Get current settings
export async function GET() {
  return NextResponse.json({
    autoRecommend: queueManager.getAutoRecommend()
  });
}

// POST /api/settings - Update settings
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (typeof body.autoRecommend === 'boolean') {
      queueManager.setAutoRecommend(body.autoRecommend);
    }
    
    return NextResponse.json({
      success: true,
      autoRecommend: queueManager.getAutoRecommend()
    });
  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
