# Kara-TV

A modern, networked karaoke system built with Next.js that enables multi-device control and real-time synchronization for group karaoke sessions.

## Features

### 🎤 YouTube Integration
- **Smart Search**: Search for karaoke videos by song title, artist, genre, or decade
- **Embeddability Filtering**: Automatically filters out videos that cannot be embedded
- **Video Library Management**: Auto-saves frequently-played videos and manages temporary video cache

### 🎵 Queue Management
- **Add/Remove Songs**: Users can easily add songs to the queue from their mobile devices
- **Reorder Queue**: Drag and drop to rearrange the song order
- **Current Song Tracking**: Visual indication of currently playing song
- **Playlist Persistence**: Save and load playlists for future karaoke sessions

### 📱 Multi-Device Support
- **Master Control Panel**: Device for managing the entire karaoke system
- **Mobile Interface**: User-friendly interface for searching and adding songs to the queue
- **TV Display**: Fullscreen karaoke video display optimized for large screens
- **Real-time Synchronization**: All devices stay in sync via WebSocket connections

### 🎮 Playback Controls
- **Play/Pause**: Control playback from the master device
- **Skip/Previous**: Navigate through the queue
- **Master Device Locking**: Prevent interference by locking the master control

### 📊 Device Management
- **Connected Device Tracking**: Monitor all active clients with timestamps and user agents
- **QR Code Generation**: Easy device connection via QR codes
- **Master Claiming**: Secure master device assignment with optional locking

## Installation Guide

### Prerequisites

Before installing Kara-TV, ensure you have the following software installed:

1. **Node.js** (version 18.x or higher recommended)
   - Download from [nodejs.org](https://nodejs.org/)
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **Git** (for cloning the repository)
   - Download from [git-scm.com](https://git-scm.com/)
   - Verify installation: `git --version`

4. **YouTube Data API Key**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable YouTube Data API v3
   - Create credentials (API key)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/viveflex/kara-tv.git
   cd kara-tv
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure the Application**
   
   Edit the `config.yml` file and add your YouTube API key:
   ```yaml
   youtube:
     apiKeys:
       - YOUR_YOUTUBE_API_KEY_HERE
   
   server:
     apiPort: 3000
     wsPort: 3001
   ```

4. **Start the Development Servers**
   
   To run both the Next.js server and WebSocket server:
   ```bash
   npm run dev:all
   ```
   
   Or run them separately:
   ```bash
   # Terminal 1: Next.js development server
   npm run dev
   
   # Terminal 2: WebSocket server
   npm run dev:ws
   ```

5. **Access the Application**
   
   Open your browser and navigate to:
   - **Master Control**: [http://localhost:3000/master](http://localhost:3000/master)
   - **Mobile Interface**: [http://localhost:3000/mobile](http://localhost:3000/mobile)
   - **TV Display**: [http://localhost:3000/tv](http://localhost:3000/tv)

### Production Build

To create a production build:
```bash
npm run build
npm run start
```

## Current Limitations

1. **YouTube API Dependency**: The application relies on YouTube Data API, which has daily quota limits (10,000 units/day by default)

2. **Manual API Key Rotation**: While the configuration supports multiple API keys, automatic rotation between keys is not currently implemented; keys must be manually switched

3. **Local Storage Only**: Video library and playlist data are stored locally on the server; no cloud storage integration

4. **WebSocket Connection Required**: Real-time synchronization requires stable WebSocket connections; disconnections may cause sync issues

5. **No User Authentication**: Currently no user login system; master control is based on device claiming without user accounts

6. **Embeddability Restrictions**: Some YouTube videos cannot be embedded due to copyright restrictions, limiting available content

7. **Single Server Instance**: Designed for single-server deployment; no multi-server clustering support

## Next Target Features

The following features are planned for future releases:

1. **Automatic API Key Rotation**: Implement automatic rotation through multiple YouTube API keys to extend daily quota limits beyond a single key's allocation

2. **User Authentication System**: User accounts with profiles, favorites, and personalized playlists

3. **Advanced Search Filters**: Additional filters for video duration, upload date, view count, and channel

4. **Cloud Storage Integration**: Option to sync playlists and library across devices using cloud storage (AWS S3, Google Drive)

5. **Progressive Web App (PWA)**: Offline support and installable mobile app experience

6. **Lyrics Display**: Real-time synchronized lyrics display alongside video playback

7. **Multi-language Support**: Internationalization for global karaoke sessions

8. **Analytics Dashboard**: Track popular songs, usage statistics, and session history

9. **Audio Effects**: Voice effects and audio processing for enhanced karaoke experience

10. **Social Features**: Share playlists, rate performances, and connect with other karaoke enthusiasts

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [React Documentation](https://react.dev/) - Learn about React
- [Socket.IO Documentation](https://socket.io/docs/) - Learn about real-time communication
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - Learn about utility-first CSS

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.
