'use client';

import { useState, useEffect, useRef } from 'react';
import Script from 'next/script';
import { io, Socket } from 'socket.io-client';
import { Song, QueueState } from '@/types';

// Declare YT namespace for TypeScript
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

export default function TVPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [queue, setQueue] = useState<QueueState>({ songs: [], currentIndex: -1, isPlaying: false, playHistory: [] });
  const [status, setStatus] = useState('Connecting...');
  const [showSettings, setShowSettings] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [autoRecommend, setAutoRecommend] = useState(true); // Default to true
  const [youtubeReady, setYoutubeReady] = useState(false);
  const [loadedVideoId, setLoadedVideoId] = useState<string | null>(null); // Track what's actually loaded
  const playerRef = useRef<any>(null);
  const socketRef = useRef<any>(null);
  const prevQueueRef = useRef<QueueState | null>(null);

  useEffect(() => {
    const API_URL = getApiUrl();
    
    // Set YouTube API ready handler BEFORE loading script
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube IFrame API Ready');
      setYoutubeReady(true);
    };
    
    // Check if YT is already loaded
    if (window.YT && window.YT.Player) {
      console.log('YouTube API already loaded');
      setYoutubeReady(true);
    }
    
    // Load auto-recommend setting
    fetch(`${API_URL}/api/master`)
      .then(res => res.json())
      .then(data => {
        if (data.autoRecommend !== undefined) {
          setAutoRecommend(data.autoRecommend);
        }
      })
      .catch(err => console.error('Failed to load settings:', err));
    
    fetch('/api/socket').catch(err => console.error('Socket init error:', err));
    
    fetch(`${API_URL}/api/queue`)
      .then(res => res.json())
      .then(state => {
        setQueue(state);
        if (state.songs.length > 0 && state.currentIndex >= 0) {
          const currentSong = state.songs[state.currentIndex];
          if (currentSong) {
            setCurrentVideoId(currentSong.videoId);
          }
        }
      })
      .catch(err => console.error('Failed to fetch queue:', err));

    const newSocket = io(API_URL, { 
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('TV: Connected to socket, ID:', newSocket.id);
      setStatus('Connected');
    });

    newSocket.on('disconnect', () => {
      console.log('TV: Disconnected from socket');
      setStatus('Disconnected');
    });

    // Test: log ALL events
    newSocket.onAny((eventName, ...args) => {
      console.log(`🔔 Socket event: ${eventName}`, args);
    });

    newSocket.on('queue_update', (state: QueueState) => {
      console.log('TV: Received queue_update:', state);
      const prev = prevQueueRef.current;
      const wasEmpty = !prev || prev.songs.length === 0;
      const wasCurrentIndex = prev ? prev.currentIndex : -1;

      setQueue(state);

      if (state.songs.length > 0 && state.currentIndex >= 0) {
        const currentSong = state.songs[state.currentIndex];
        if (currentSong) {
          console.log('TV: Updating video to:', currentSong.videoId);
          setCurrentVideoId(currentSong.videoId);
        }
      } else {
        setCurrentVideoId(null);
      }

      // If queue was empty and now has songs but currentIndex is still -1,
      // this likely means recommendations were just added. Start the first song.
      if (wasEmpty && state.songs.length > 0 && state.currentIndex === -1) {
        console.log('Queue transitioned from empty → populated; starting first song');
        fetch(`${API_URL}/api/playback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'play_at', index: 0 })
        }).catch(err => console.error('Failed to start recommended song:', err));
      }

      // Update previous queue ref
      prevQueueRef.current = state;
    });

    newSocket.on('queue_empty', async () => {
      console.log('✨ Queue empty event received, fetching recommendations...');
      try {
        const res = await fetch(`${API_URL}/api/recommendations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ count: 5 })
        });
        console.log('Recommendations API response:', res.status, res.ok);
        if (res.ok) {
          const { recommendations } = await res.json();
          console.log(`Got ${recommendations.length} recommendations:`, recommendations.map((s: any) => s.title));
          for (const song of recommendations) {
            console.log('Adding recommendation to queue:', song.title);
            await fetch(`${API_URL}/api/queue`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(song)
            });
          }
          console.log('✅ All recommendations added to queue');
        } else {
          const errorText = await res.text();
          console.error('Recommendations API error:', res.status, errorText);
        }
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      }
    });

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    if (!youtubeReady || !currentVideoId) {
      console.log('Not ready:', { youtubeReady, currentVideoId });
      return;
    }

    // Prevent reloading the same video
    if (loadedVideoId === currentVideoId) {
      console.log('Video already loaded, skipping:', currentVideoId);
      return;
    }
    
    console.log('Attempting to create/update player for:', currentVideoId);
    
    if (!playerRef.current) {
      console.log('Creating new YouTube player');
      try {
        playerRef.current = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: currentVideoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
            iv_load_policy: 3,
            disablekb: 1
          },
          events: {
            onReady: (event: any) => {
              console.log('Player ready');
              setLoadedVideoId(currentVideoId); // Mark as loaded
              event.target.playVideo();
            },
            onStateChange: (event: any) => {
              console.log('Player state changed:', event.data);
              if (event.data === window.YT.PlayerState.ENDED) {
                handleVideoEnded();
              }
            },
            onError: (event: any) => {
              console.error('Player error:', event.data);
              // Error codes:
              // 2 = Invalid parameter
              // 5 = HTML5 player error
              // 100 = Video not found or private
              // 101, 150 = Video owner does not allow embedding
              if (event.data === 100 || event.data === 101 || event.data === 150) {
                console.log('Video cannot be played, skipping to next...');
                // Auto-skip to next video after 2 seconds
                setTimeout(() => {
                  handlePlayback('skip');
                }, 2000);
              }
            }
          }
        });
      } catch (error) {
        console.error('Failed to create player:', error);
      }
    } else {
      console.log('Loading video into existing player:', currentVideoId);
      try {
        setLoadedVideoId(currentVideoId); // Mark as loaded
        playerRef.current.loadVideoById(currentVideoId);
      } catch (error) {
        console.error('Failed to load video:', error);
      }
    }
  }, [youtubeReady, currentVideoId, loadedVideoId]);

  const handleVideoEnded = () => {
    console.log('Video ended, calling API');
    const API_URL = getApiUrl();
    fetch(`${API_URL}/api/playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete' })
    });
  };

  const handlePlayback = (action: string) => {
    const API_URL = getApiUrl();
    fetch(`${API_URL}/api/playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
  };

  const playSongAt = (index: number) => {
    const API_URL = getApiUrl();
    fetch(`${API_URL}/api/playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'play_at', index })
    });
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === toIndex) return;
    
    const API_URL = getApiUrl();
    fetch(`${API_URL}/api/playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', fromIndex: draggedIndex, toIndex })
    });
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const API_URL = getApiUrl();
    fetch(`${API_URL}/api/playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', fromIndex: index, toIndex: index - 1 })
    });
  };

  const moveDown = (index: number) => {
    if (index >= queue.songs.length - 1) return;
    const API_URL = getApiUrl();
    fetch(`${API_URL}/api/playback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', fromIndex: index, toIndex: index + 1 })
    });
  };

  const currentSong = queue.currentIndex >= 0 ? queue.songs[queue.currentIndex] : null;

  return (
    <>
      <Script 
        src="https://www.youtube.com/iframe_api" 
        onLoad={() => {
          // If YT is already loaded, trigger ready
          if (window.YT && window.YT.Player) {
            setYoutubeReady(true);
          }
        }}
      />
      <div style={{ width: '100vw', height: '100vh', backgroundColor: '#0F0F0F', color: '#fff', display: 'flex', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0, overflow: 'hidden' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundColor: '#1A1A1A', padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF0000' }}>🎤 KARA TV</div>
            <div style={{ fontSize: '14px', color: status === 'Connected' ? '#00FF00' : '#FF0000', marginTop: '4px' }}>
              {status}
            </div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} style={{ backgroundColor: '#333', color: '#fff', border: 'none', padding: '8px 16px', fontSize: '20px', borderRadius: '8px', cursor: 'pointer' }} title="Settings">⚙️</button>
        </div>
        <div style={{ flex: 1, backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          {currentVideoId ? (
            <div id="youtube-player" style={{ width: '100%', height: '100%' }}></div>
          ) : (
            <div style={{ position: 'absolute', textAlign: 'center', color: '#666' }}>
              <div style={{ fontSize: '80px', marginBottom: '20px' }}>🎵</div>
              <div style={{ fontSize: '20px' }}>No video playing</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>Add songs from mobile app</div>
            </div>
          )}
        </div>
        <div style={{ backgroundColor: '#1A1A1A', padding: '20px', borderTop: '1px solid #333', display: 'flex', justifyContent: 'center', gap: '15px' }}>
          <button onClick={() => handlePlayback('previous')} disabled={queue.currentIndex <= 0} style={{ backgroundColor: queue.currentIndex <= 0 ? '#333' : '#FF0000', color: '#fff', border: 'none', padding: '12px 24px', fontSize: '16px', borderRadius: '8px', cursor: queue.currentIndex <= 0 ? 'not-allowed' : 'pointer' }}>⏮️ Previous</button>
          <button onClick={() => { handlePlayback('play'); playerRef.current?.playVideo(); }} disabled={!currentSong} style={{ backgroundColor: !currentSong ? '#333' : '#FF0000', color: '#fff', border: 'none', padding: '12px 24px', fontSize: '16px', borderRadius: '8px', cursor: !currentSong ? 'not-allowed' : 'pointer' }}>▶️ Play</button>
          <button onClick={() => handlePlayback('next')} disabled={!currentSong} style={{ backgroundColor: !currentSong ? '#333' : '#FF0000', color: '#fff', border: 'none', padding: '12px 24px', fontSize: '16px', borderRadius: '8px', cursor: !currentSong ? 'not-allowed' : 'pointer' }}>⏭️ Next</button>
          <button onClick={() => handlePlayback('skip')} disabled={queue.currentIndex >= queue.songs.length - 1} style={{ backgroundColor: queue.currentIndex >= queue.songs.length - 1 ? '#333' : '#FF0000', color: '#fff', border: 'none', padding: '12px 24px', fontSize: '16px', borderRadius: '8px', cursor: queue.currentIndex >= queue.songs.length - 1 ? 'not-allowed' : 'pointer' }}>⏩ Skip</button>
        </div>
      </div>
      <div style={{ width: '400px', backgroundColor: '#1A1A1A', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Queue (<span>{queue.songs.length}</span>)</div>
          <button onClick={() => setShowQR(!showQR)} style={{ backgroundColor: '#333', color: '#fff', border: 'none', padding: '6px 12px', fontSize: '14px', borderRadius: '6px', cursor: 'pointer' }}>📱 QR</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
          {queue.songs.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px 20px' }}>
              <div>Queue is empty</div>
              <div style={{ fontSize: '12px', marginTop: '8px' }}>Add songs from mobile</div>
            </div>
          ) : (
            queue.songs.map((song, index) => (
              <div 
                key={song.id} 
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                style={{ 
                  backgroundColor: '#0F0F0F', 
                  padding: '12px', 
                  marginBottom: '8px', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  gap: '12px', 
                  alignItems: 'center', 
                  border: index === queue.currentIndex ? '2px solid #FF0000' : 'none',
                  opacity: draggedIndex === index ? 0.5 : 1
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveUp(index); }} 
                    disabled={index === 0}
                    style={{ backgroundColor: index === 0 ? '#222' : '#333', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '12px', borderRadius: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer' }}
                    title="Move up"
                  >↑</button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); moveDown(index); }} 
                    disabled={index === queue.songs.length - 1}
                    style={{ backgroundColor: index === queue.songs.length - 1 ? '#222' : '#333', color: '#fff', border: 'none', padding: '4px 8px', fontSize: '12px', borderRadius: '4px', cursor: index === queue.songs.length - 1 ? 'not-allowed' : 'pointer' }}
                    title="Move down"
                  >↓</button>
                </div>
                <img 
                  src={song.thumbnail} 
                  alt="" 
                  style={{ width: '80px', height: '60px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer' }} 
                  onClick={() => playSongAt(index)}
                />
                <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => playSongAt(index)}>
                  <div style={{ fontWeight: 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{song.title}</div>
                  <div style={{ fontSize: '12px', color: '#999', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.artist}</div>
                  {song.isFallback && <div style={{ fontSize: '11px', color: '#3B82F6', marginTop: '4px' }}>🤖 Auto-recommended</div>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {showSettings && (
        <div onClick={() => setShowSettings(false)} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: '#1A1A1A', padding: '30px', borderRadius: '12px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ fontSize: '24px', marginBottom: '20px', color: '#FF0000', marginTop: 0 }}>Settings</h2>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '12px', backgroundColor: '#252525', borderRadius: '8px' }}>
                <input 
                  type="checkbox" 
                  checked={autoRecommend}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    setAutoRecommend(newValue);
                    try {
                      await fetch(`${getApiUrl()}/api/master`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ autoRecommend: newValue })
                      });
                    } catch (error) {
                      console.error('Failed to save setting:', error);
                    }
                  }}
                  style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Auto-recommend songs</div>
                  <div style={{ fontSize: '12px', color: '#888' }}>Automatically add recommended songs when queue is empty</div>
                </div>
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowSettings(false)} style={{ padding: '12px 24px', backgroundColor: '#FF0000', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>Close</button>
            </div>
          </div>
        </div>
      )}
      
      {showQR && (
        <div onClick={() => setShowQR(false)} style={{ position: 'fixed', bottom: '20px', right: '20px', backgroundColor: '#1A1A1A', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.5)', zIndex: 1000, maxWidth: '280px' }}>
          <div onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#FF0000', textAlign: 'center' }}>Scan to Add Songs</div>
            <img src={`${getApiUrl()}/api/qr?data=${encodeURIComponent(`${getApiUrl()}/mobile`)}&size=200`} alt="QR Code" style={{ width: '200px', height: '200px', display: 'block' }} />
            <div style={{ color: '#888', marginTop: '10px', fontSize: '12px', textAlign: 'center', wordBreak: 'break-all' }}>
              {getApiUrl().replace('http://', '').replace('https://', '')}/mobile
            </div>
            <button onClick={() => setShowQR(false)} style={{ marginTop: '15px', width: '100%', padding: '8px', backgroundColor: '#333', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Close</button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
