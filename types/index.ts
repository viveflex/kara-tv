export interface Song {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  source: 'youtube';
  addedAt: number;
  addedBy?: string; // Device identifier (e.g., socket ID or user ID)
  isFallback?: boolean; // True if this is an auto-recommended song
}

export interface QueueState {
  songs: Song[];
  currentIndex: number;
  isPlaying: boolean;
  playHistory: Song[]; // Recently played songs for recommendations
}

export interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
   embeddable: boolean;
   blockedReason?: string;
}

export interface WSMessage {
  type: 'queue_update' | 'song_added' | 'song_removed' | 'playback_state' | 'current_changed' | 'fallback_interrupted';
  data: any;
}

export interface AppSettings {
  youtubeApiKey: string;
  completedLimit: number;
  videoQuality: string;
  autoRecommend: boolean; // Auto-play recommended songs when queue is empty
}
