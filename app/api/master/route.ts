import { NextRequest, NextResponse } from 'next/server';
import { masterManager } from '@/lib/master-manager';

const MASTER_COOKIE = 'kara_master_player';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-master-token',
};

const corsJson = (body: any, status = 200) => NextResponse.json(body, { status, headers: corsHeaders });

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const { queueManager } = await import('@/lib/queue-manager');
  const cookieToken = request.headers.get('x-master-token') || request.cookies.get(MASTER_COOKIE)?.value;
  const state = masterManager.getState(cookieToken);
  const autoRecommend = queueManager.getAutoRecommend();
  
  const res = corsJson({ ...state, autoRecommend });
  if (state.youAreMaster && state.masterToken) {
    res.headers.set('x-master-token', state.masterToken);
    res.cookies.set(MASTER_COOKIE, state.masterToken, { path: '/', maxAge: 60 * 60 * 24 });
  }
  return res;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, label, lock, autoRecommend } = body;
    const cookieToken = request.headers.get('x-master-token') || request.cookies.get(MASTER_COOKIE)?.value;

    // Handle autoRecommend setting update
    if (autoRecommend !== undefined) {
      const { queueManager } = await import('@/lib/queue-manager');
      queueManager.setAutoRecommend(autoRecommend);
      return corsJson({ success: true, autoRecommend });
    }

    switch (action) {
      case 'claim': {
        const res = masterManager.claim(cookieToken, label, lock);
        if (!res.success) {
          return corsJson({ error: 'Master is locked' }, 409);
        }
        const json = NextResponse.json({ success: true, token: res.token, locked: res.locked });
        if (res.token) {
          json.cookies.set(MASTER_COOKIE, res.token, { path: '/', maxAge: 60 * 60 * 24 });
          json.headers.set('x-master-token', res.token);
        }
        return json;
      }
      case 'release': {
        const res = masterManager.release(cookieToken);
        if (!res.success) return NextResponse.json({ error: 'Not master' }, { status: 403 });
        const json = NextResponse.json({ success: true });
        json.cookies.set(MASTER_COOKIE, '', { path: '/', maxAge: 0 });
        return json;
      }
      case 'lock': {
        const res = masterManager.lock(cookieToken);
        if (!res.success) return corsJson({ error: 'Not master' }, 403);
        return corsJson({ success: true, locked: true });
      }
      case 'unlock': {
        const res = masterManager.unlock(cookieToken);
        if (!res.success) return corsJson({ error: 'Not master' }, 403);
        return corsJson({ success: true, locked: false });
      }
      default:
        return corsJson({ error: 'Invalid action' }, 400);
    }
  } catch (error) {
    console.error('Master API error:', error);
    return corsJson({ error: 'Master API failed' }, 500);
  }
}