import fs from 'fs';
import path from 'path';
import { Song } from '@/types';

interface PlaylistData {
  name: string;
  songs: Song[];
  updatedAt: number;
}

const STORE_PATH = path.join(process.cwd(), 'library', 'playlists.json');

function ensureStore() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify([], null, 2));
  }
}

function readStore(): PlaylistData[] {
  ensureStore();
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    return JSON.parse(raw) as PlaylistData[];
  } catch (err) {
    console.error('Failed to read playlists:', err);
    return [];
  }
}

function writeStore(data: PlaylistData[]) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
}

export function listPlaylists() {
  return readStore().map(({ name, updatedAt, songs }) => ({ name, updatedAt, count: songs.length }));
}

export function savePlaylist(name: string, songs: Song[]) {
  const data = readStore();
  const idx = data.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
  const entry: PlaylistData = { name, songs, updatedAt: Date.now() };
  if (idx >= 0) data[idx] = entry; else data.push(entry);
  writeStore(data);
  return entry;
}

export function loadPlaylist(name: string): PlaylistData | null {
  const data = readStore();
  return data.find((p) => p.name.toLowerCase() === name.toLowerCase()) || null;
}
