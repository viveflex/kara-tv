import { NextRequest, NextResponse } from 'next/server';

// This endpoint is deprecated - use /api/lg-video instead
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    error: 'This endpoint is deprecated. Use /api/lg-video instead.' 
  }, { status: 410 });
}

// Legacy code kept for reference:
// import ytdl from '@distube/ytdl-core';

// export async function GET(request: NextRequest) {
//   const searchParams = request.nextUrl.searchParams;
//   const videoId = searchParams.get('v');

//   if (!videoId) {
//     return NextResponse.json({ error: 'Video ID required' }, { status: 400 });
//   }

//   try {
//     const url = `https://www.youtube.com/watch?v=${videoId}`;
    
//     // Get video info
//     const info = await ytdl.getInfo(url);
    
//     // Get the best audio+video format that's likely to work on webOS
//     // Prefer mp4 format for maximum compatibility
//     const formats = ytdl.filterFormats(info.formats, 'audioandvideo');
    
//     // Sort by quality and prefer mp4
//     const mp4Formats = formats.filter(f => f.container === 'mp4');
//     const sortedFormats = mp4Formats.sort((a, b) => {
//       const qualityA = parseInt(a.qualityLabel || '0');
//       const qualityB = parseInt(b.qualityLabel || '0');
//       return qualityB - qualityA;
//     });

//     // Pick best mp4 format, fallback to any format
//     const format = sortedFormats[0] || formats[0];
    
//     if (!format || !format.url) {
//       return NextResponse.json({ error: 'No playable format found' }, { status: 404 });
//     }

//     // Return the direct stream URL and video info
//     return NextResponse.json({
//       streamUrl: format.url,
//       title: info.videoDetails.title,
//       duration: parseInt(info.videoDetails.lengthSeconds),
//       quality: format.qualityLabel || 'unknown',
//       container: format.container
//     });

//   } catch (error) {
//     console.error('Stream error:', error);
//     return NextResponse.json({ 
//       error: 'Failed to get stream URL',
//       details: error instanceof Error ? error.message : 'Unknown error'
//     }, { status: 500 });
//   }
// }

