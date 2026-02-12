'use client';

import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface Song {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  addedAt: number;
  source: 'youtube';
}

interface SearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration?: string;
  embeddable?: boolean;
  blockedReason?: string;
}

interface QueueState {
  songs: Song[];
  currentIndex: number;
  isPlaying: boolean;
}

// Use relative URLs so requests go to the same host the page was loaded from
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

const getWsUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://localhost:3000';
};

export default function MobilePage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'song' | 'artist' | 'genre' | 'decade'>('song');
  const [hideUnembeddable, setHideUnembeddable] = useState(true);
  const [karaokeOnly, setKaraokeOnly] = useState(true);
  const [resultLimit, setResultLimit] = useState(10);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [queue, setQueue] = useState<QueueState>({ songs: [], currentIndex: -1, isPlaying: false, playHistory: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [deviceId] = useState(() => {
    if (typeof window !== 'undefined') {
      let id = localStorage.getItem('kara_device_id');
      if (!id) {
        id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('kara_device_id', id);
      }
      return id;
    }
    return 'unknown';
  });

  useEffect(() => {
    setMounted(true);
    
    const API_URL = getApiUrl();
    const WS_URL = getWsUrl();
    
    // Initialize Socket.IO on server by calling the API route
    fetch('/api/socket').catch(err => console.error('Socket init error:', err));
    
    // Fetch initial queue state
    fetch(`${API_URL}/api/queue`)
      .then(res => res.json())
      .then(state => {
        console.log('Initial queue:', state);
        setQueue(state);
      })
      .catch(err => console.error('Failed to fetch initial queue:', err));

    // Connect to WebSocket with custom path
    console.log('Connecting to WebSocket at:', WS_URL);
    const newSocket = io(WS_URL, { 
      path: '/api/socket',
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Connected to server, socket ID:', newSocket.id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    newSocket.on('queue_update', (state: QueueState) => {
      console.log('📨 Received queue_update:', state);
      console.log('📨 Current queue before update:', queue);
      setQueue(state);
      console.log('📨 setQueue called with:', state);
    });

    newSocket.on('song_added', (song) => {
      console.log('🎵 Song added event:', song);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const API_URL = getApiUrl();
      const params = new URLSearchParams({
        q: karaokeOnly ? searchQuery : searchQuery + ' (any song)',
        mode: searchMode,
        includeUnembeddable: hideUnembeddable ? 'false' : 'true',
        limit: String(resultLimit),
        karaokeOnly: String(karaokeOnly)
      });
      const response = await fetch(`${API_URL}/api/search?${params.toString()}`);
      if (response.ok) {
        const results = await response.json();
        setSearchResults(results);
      } else {
        alert('Search failed. Please try again.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddSong = async (result: SearchResult) => {
    if (result.embeddable === false) {
      const proceed = window.confirm('This video may not be embeddable. Add it anyway?');
      if (!proceed) return;
    }

    const song: Song = {
      id: `yt-${result.videoId}-${Date.now()}`,
      videoId: result.videoId,
      title: result.title,
      artist: result.channelTitle,
      duration: 0,
      thumbnail: result.thumbnail,
      addedAt: Date.now(),
      source: 'youtube',
      addedBy: deviceId
    };

    try {
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/queue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(song)
      });

      if (response.ok && searchMode === 'song') {
        setSearchResults([]);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error adding song:', error);
      alert('Failed to add song');
    }
  };

  const handleRetractSong = async (songId: string) => {
    try {
      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/queue/${songId}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        alert('Failed to remove song');
      }
    } catch (error) {
      console.error('Error removing song:', error);
      alert('Failed to remove song');
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-red-500">🎤 Mobile Queue</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-3 py-1 bg-gray-700 rounded text-sm"
        >
          ⚙️
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-800 p-4 border-b border-gray-700">
          <h2 className="font-bold mb-2">Info</h2>
          <p className="text-sm text-gray-400 mb-2">
            ℹ️ API keys and settings are managed in Master Control
          </p>
          <p className="text-xs text-gray-500">
            Visit /master to configure app settings
          </p>
        </div>
      )}

      {/* Search */}
      <div className="p-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-2">
            <select
              value={searchMode}
              onChange={(e) => setSearchMode(e.target.value as any)}
              className="px-3 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="song">Search song</option>
              <option value="artist">Search by artist</option>
              <option value="genre">Search by genre</option>
              <option value="decade">Search by decade/era</option>
            </select>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for songs..."
              className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed"
            >
              {isSearching ? '...' : '🔍'}
            </button>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={karaokeOnly}
              onChange={(e) => setKaraokeOnly(e.target.checked)}
              className="h-4 w-4"
            />
            Karaoke songs only
          </label>

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={hideUnembeddable}
              onChange={(e) => setHideUnembeddable(e.target.checked)}
              className="h-4 w-4"
            />
            Hide videos that are likely unembeddable
          </label>

          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>Results</span>
            <input
              type="number"
              min={1}
              max={25}
              value={resultLimit}
              onChange={(e) => setResultLimit(Math.min(25, Math.max(1, Number(e.target.value) || 1)))}
              className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            />
          </div>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            {searchResults.map((result) => (
              <div
                key={result.videoId}
                className="bg-gray-800 p-3 rounded-lg flex gap-3 items-center"
              >
                <img
                  src={result.thumbnail}
                  alt=""
                  className="w-24 h-16 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{result.title}</div>
                  <div className="text-gray-400 text-xs truncate">{result.channelTitle}</div>
                  {result.embeddable === false && (
                    <div className="text-yellow-400 text-xs mt-1 truncate">
                      ⚠️ Not embeddable ({result.blockedReason || 'likely blocked'})
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleAddSong(result)}
                  className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 text-sm shrink-0"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Current Queue */}
      <div className="px-4 pb-4">
        <h2 className="font-bold mb-2">Queue ({mounted ? queue.songs.length : 0})</h2>
        {!mounted ? (
          <div className="text-center text-gray-500 py-8">
            <p>Loading...</p>
          </div>
        ) : queue.songs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>Queue is empty</p>
            <p className="text-sm mt-1">Search and add songs above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.songs.map((song, index) => (
              <div
                key={song.id}
                className={`bg-gray-800 p-3 rounded-lg flex gap-3 items-center ${
                  index === queue.currentIndex ? 'border-2 border-red-500' : ''
                } ${song.isFallback ? 'border-l-4 border-l-blue-500' : ''}`}
              >
                <img
                  src={song.thumbnail}
                  alt=""
                  className="w-20 h-14 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{song.title}</div>
                  <div className="text-gray-400 text-xs truncate">{song.artist}</div>
                  {song.isFallback && (
                    <div className="text-blue-400 text-xs mt-1">🎲 Auto-recommended</div>
                  )}
                </div>
                {index === queue.currentIndex && (
                  <span className="text-red-500 text-xl">▶</span>
                )}
                {song.addedBy === deviceId && index !== queue.currentIndex && (
                  <button
                    onClick={() => handleRetractSong(song.id)}
                    className="px-3 py-1 bg-red-700 hover:bg-red-800 rounded text-xs"
                    title="Remove your song"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
