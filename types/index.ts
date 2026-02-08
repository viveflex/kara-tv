export interface Song {
  id: string;
  videoId: string;
  title: string;
  artist: string;
  duration: number;
  thumbnail: string;
  source: 'youtube';
  addedAt: number;
  addedBy?: string; // Device identifier
}

export interface QueueState {
  songs: Song[];
  currentIndex: number;
  isPlaying: boolean;
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
  type: 'queue_update' | 'song_added' | 'song_removed' | 'playback_state' | 'current_changed';
  data: any;
}

export interface AppSettings {
  youtubeApiKey: string;
  completedLimit: number;
  videoQuality: string;
}
