"use client";

import { useEffect, useState } from 'react';

type ClientInfo = {
  id: string;
  userAgent?: string;
  ip?: string;
  connectedAt: number;
  lastSeen: number;
};

type MasterState = {
  masterToken: string | null;
  masterLabel: string | null;
  locked: boolean;
  lastSeen: number;
  connections: ClientInfo[];
  youAreMaster: boolean;
};

const fetchState = async (): Promise<MasterState> => {
  const res = await fetch('/api/master', { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load master state');
  return res.json();
};

export default function MasterPage() {
  const [state, setState] = useState<MasterState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [autoRecommend, setAutoRecommend] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch('/api/master', { cache: 'no-store' });
      const data = await resp.json();
      const tokenHeader = resp.headers.get('x-master-token');
      if (tokenHeader) localStorage.setItem('kara_master_token', tokenHeader);
      setState(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadSettings();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await res.json();
      setAutoRecommend(data.autoRecommend || false);
    } catch (err: any) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleAutoRecommendToggle = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoRecommend: enabled }),
      });
      if (res.ok) {
        setAutoRecommend(enabled);
      } else {
        setError('Failed to update settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    }
  };

  const post = async (action: string, extra?: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Action failed');
      }
      await load();
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const claim = (lock: boolean) => {
    post('claim', { label, lock });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleTimeString()}`;
  };

  const savePlaylist = async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save', name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Save failed');
      }
      alert('Playlist saved');
    } catch (err: any) {
      setError(err.message || 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylist = async (name: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load', name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Load failed');
      }
      alert('Playlist loaded to queue');
    } catch (err: any) {
      setError(err.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Master Control</h1>
          <p className="text-sm text-gray-400">No auth yet; available to all viewers.</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded"
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Device label (optional)"
            className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm"
          />
          <button
            onClick={() => claim(false)}
            className="px-4 py-2 bg-red-600 rounded disabled:bg-gray-700"
            disabled={loading}
          >
            Set as Master
          </button>
          <button
            onClick={() => claim(true)}
            className="px-4 py-2 bg-red-700 rounded disabled:bg-gray-700"
            disabled={loading}
          >
            Set & Lock
          </button>
          <button
            onClick={() => post('release')}
            className="px-4 py-2 bg-gray-700 rounded disabled:bg-gray-800"
            disabled={loading}
          >
            Release
          </button>
          <button
            onClick={() => post('lock')}
            className="px-4 py-2 bg-gray-700 rounded disabled:bg-gray-800"
            disabled={loading}
          >
            Lock
          </button>
          <button
            onClick={() => post('unlock')}
            className="px-4 py-2 bg-gray-700 rounded disabled:bg-gray-800"
            disabled={loading}
          >
            Unlock
          </button>
        </div>
        {state && (
          <div className="text-sm text-gray-300 space-y-1">
            <div>Master: {state.masterLabel || state.masterToken || 'None'}</div>
            <div>Status: {state.locked ? 'Locked' : 'Unlocked'}</div>
            <div>Last seen: {state.lastSeen ? formatTime(state.lastSeen) : '—'}</div>
            <div>You are master: {state.youAreMaster ? 'Yes' : 'No'}</div>
          </div>4">
        <h2 className="font-semibold">Settings</h2>
        
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={autoRecommend}
            onChange={(e) => handleAutoRecommendToggle(e.target.checked)}
            className="h-4 w-4"
          />
          <div>
            <div className="text-white">Auto-play recommendations when queue ends</div>
            <div className="text-xs text-gray-400">
              Automatically plays similar songs when the queue is empty based on play history
            </div>
          </div>
        </label>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 space-y-
        )}
        {error && <div className="text-red-400 text-sm">{error}</div>}
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Connected Devices</h2>
          <span className="text-sm text-gray-400">{state?.connections.length || 0}</span>
        </div>
        <div className="space-y-2 text-sm">
          {state?.connections.map((c) => (
            <div key={c.id} className="bg-gray-900 border border-gray-700 rounded p-3">
              <div className="flex justify-between">
                <div className="font-mono text-xs">{c.id}</div>
                <div className="text-gray-400">Last seen: {formatTime(c.lastSeen)}</div>
              </div>
              <div className="text-gray-300 mt-1 truncate">{c.userAgent || 'Unknown UA'}</div>
              <div className="text-gray-500 text-xs">IP: {c.ip || 'n/a'}</div>
              <div className="text-gray-500 text-xs">Connected: {formatTime(c.connectedAt)}</div>
            </div>
          ))}
          {state?.connections.length === 0 && (
            <div className="text-gray-400">No active connections.</div>
          )}
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Playlists</h2>
          <button
            onClick={load}
            className="px-3 py-1 bg-gray-700 rounded text-xs"
            disabled={loading}
          >
            Refresh list
          </button>
        </div>
        <PlaylistManager
          loading={loading}
          onSave={savePlaylist}
          onLoad={loadPlaylist}
        />
      </div>
    </div>
  );
}

function PlaylistManager({ loading, onSave, onLoad }: { loading: boolean; onSave: (name: string) => void; onLoad: (name: string) => void }) {
  const [name, setName] = useState('');
  const [list, setList] = useState<{ name: string; updatedAt: number; count: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      const res = await fetch('/api/playlists', { cache: 'no-store' });
      const data = await res.json();
      setList(data.playlists || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load playlists');
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex gap-2 flex-wrap">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Playlist name"
          className="px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm"
        />
        <button
          onClick={() => name && onSave(name)}
          className="px-4 py-2 bg-red-600 rounded disabled:bg-gray-700"
          disabled={loading || !name}
        >
          Save current queue
        </button>
        <button
          onClick={() => name && onLoad(name)}
          className="px-4 py-2 bg-gray-700 rounded disabled:bg-gray-800"
          disabled={loading || !name}
        >
          Load to queue
        </button>
        <button
          onClick={fetchList}
          className="px-3 py-2 bg-gray-700 rounded"
          disabled={loading}
        >
          Refresh
        </button>
      </div>
      {error && <div className="text-red-400">{error}</div>}
      <div className="space-y-2">
        {list.map((p) => (
          <div key={p.name} className="bg-gray-900 border border-gray-700 rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{p.name}</div>
              <div className="text-gray-400 text-xs">Songs: {p.count} · Updated: {new Date(p.updatedAt).toLocaleString()}</div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-gray-700 rounded" onClick={() => onLoad(p.name)} disabled={loading}>Load</button>
              <button className="px-3 py-1 bg-gray-800 rounded" onClick={() => setName(p.name)}>Use name</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="text-gray-400">No playlists yet.</div>}
      </div>
    </div>
  );
}
