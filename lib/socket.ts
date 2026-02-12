import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Use global to ensure Socket.IO instance is shared across all module contexts
const globalForSocket = global as typeof globalThis & {
  io?: SocketIOServer;
};

let listenersAttached = false;

export function initSocketIO(httpServer: HTTPServer) {
  if (globalForSocket.io) {
    console.log('Socket.IO already initialized, reattaching listeners...');
    attachQueueListeners();
    return globalForSocket.io;
  }

  globalForSocket.io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  console.log('Socket.IO server initialized');

  // Attach queue manager listeners
  attachQueueListeners();

  globalForSocket.io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send current state to newly connected client
    const { queueManager } = require('./queue-manager');
    if (queueManager) {
      socket.emit('queue_update', queueManager.getState());
    }
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return globalForSocket.io;
}

function attachQueueListeners() {
  const io = globalForSocket.io;
  if (!io) {
    console.log('⚠️ Cannot attach listeners, Socket.IO not initialized');
    return;
  }

  // Import queue-manager to ensure global singleton is created
  const { queueManager } = require('./queue-manager');
  
  // Verify we got the instance
  if (!queueManager) {
    console.log('⚠️ Queue manager failed to initialize');
    return;
  }
  
  // Remove old listeners if any
  queueManager.removeAllListeners('update');
  queueManager.removeAllListeners('song_added');
  queueManager.removeAllListeners('song_removed');
  queueManager.removeAllListeners('current_changed');
  queueManager.removeAllListeners('playback_state');
  queueManager.removeAllListeners('queue_empty');
  queueManager.removeAllListeners('fallback_interrupted');
  
  console.log('Attaching queue listeners to global singleton...');

  // Broadcast queue updates to all connected clients
  queueManager.on('update', (state: any) => {
    console.log('Broadcasting queue_update, songs:', state.songs.length);
    io.emit('queue_update', state);
  });

  queueManager.on('song_added', (song: any) => {
    console.log('Broadcasting song_added:', song.title);
    io.emit('song_added', song);
  });

  queueManager.on('song_removed', (song: any) => {
    console.log('Broadcasting song_removed:', song.id);
    io.emit('song_removed', song);
  });

  queueManager.on('current_changed', (song: any) => {
    console.log('Broadcasting current_changed:', song?.title);
    io.emit('current_changed', song);
  });

  queueManager.on('playback_state', (isPlaying: boolean) => {
    console.log('Broadcasting playback_state:', isPlaying);
    io.emit('playback_state', isPlaying);
  });

  queueManager.on('queue_empty', () => {
    console.log('🚨 Broadcasting queue_empty for auto-recommend to', io.sockets.sockets.size, 'clients');
    io.emit('queue_empty');
    console.log('✅ queue_empty event emitted');
  });
  
  console.log('✓ queue_empty listener registered, count:', queueManager.listenerCount('queue_empty'));

  queueManager.on('fallback_interrupted', () => {
    console.log('Broadcasting fallback_interrupted');
    io.emit('fallback_interrupted');
  });
  
  listenersAttached = true;
}

export function getIO() {
  return globalForSocket.io || null;
}

export function emitToClients(event: string, data?: any) {
  const io = globalForSocket.io;
  if (!io) {
    console.log('⚠️ Socket.IO not initialized, cannot emit', event);
    return false;
  }
  console.log(`📡 Emitting ${event} to`, io.sockets.sockets.size, 'clients');
  io.emit(event, data);
  return true;
}

// Call this to ensure listeners are attached (useful after hot reload)
export function ensureListenersAttached() {
  const io = globalForSocket.io;
  if (!io) {
    console.log('⚠️ Socket.IO not initialized yet');
    return;
  }
  
  // Import to ensure it's initialized
  const { queueManager } = require('./queue-manager');
  if (!queueManager) {
    console.log('⚠️ Queue manager not initialized yet');
    return;
  }
  
  const listenerCount = queueManager.listenerCount('queue_empty');
  
  if (listenerCount === 0) {
    console.log('⚠️ Listeners detached (count: 0), reattaching...');
    attachQueueListeners();
  } else {
    console.log('✓ Listeners OK, count:', listenerCount);
  }
  return true;
}
