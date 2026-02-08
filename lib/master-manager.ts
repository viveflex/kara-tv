import { randomUUID } from 'crypto';

interface ClientInfo {
  id: string; // stable device id
  socketId: string;
  userAgent?: string;
  ip?: string;
  connectedAt: number;
  lastSeen: number;
}

interface MasterState {
  token: string | null;
  label: string | null;
  locked: boolean;
  lastSeen: number;
}

class MasterManager {
  private master: MasterState = {
    token: null,
    label: null,
    locked: false,
    lastSeen: 0,
  };

  private clients = new Map<string, ClientInfo>();

  getState(currentToken?: string) {
    return {
      masterToken: this.master.token,
      masterLabel: this.master.label,
      locked: this.master.locked,
      lastSeen: this.master.lastSeen,
      connections: Array.from(this.clients.values()),
      youAreMaster: !!currentToken && currentToken === this.master.token,
    };
  }

  authorize(token: string | null | undefined) {
    if (!this.master.token) {
      const newToken = token || `master-${randomUUID()}`;
      this.master.token = newToken;
      this.master.lastSeen = Date.now();
      return { allowed: true, newToken, locked: this.master.locked };
    }

    if (!this.master.locked) {
      // When not locked, allow any caller and refresh lastSeen for the current master token
      this.master.lastSeen = Date.now();
      return { allowed: true, locked: false, masterToken: this.master.token };
    }

    if (this.master.locked && token !== this.master.token) {
      return { allowed: false, locked: true }; // locked requires exact token
    }

    if (token === this.master.token) {
      this.master.lastSeen = Date.now();
      return { allowed: true, locked: this.master.locked };
    }

    return { allowed: false, locked: this.master.locked };
  }

  claim(token: string | null | undefined, label?: string, lock?: boolean) {
    if (this.master.locked && token !== this.master.token) {
      return { success: false, locked: true };
    }

    const newToken = token || `master-${randomUUID()}`;
    this.master.token = newToken;
    this.master.label = label || null;
    this.master.locked = !!lock;
    this.master.lastSeen = Date.now();
    return { success: true, token: newToken, locked: this.master.locked };
  }

  release(token: string | null | undefined) {
    if (token && token !== this.master.token) return { success: false };
    this.master = { token: null, label: null, locked: false, lastSeen: 0 };
    return { success: true };
  }

  lock(token: string | null | undefined) {
    if (token !== this.master.token) return { success: false };
    this.master.locked = true;
    this.master.lastSeen = Date.now();
    return { success: true, locked: true };
  }

  unlock(token: string | null | undefined) {
    if (token !== this.master.token) return { success: false };
    this.master.locked = false;
    this.master.lastSeen = Date.now();
    return { success: true, locked: false };
  }

  registerClient(id: string, socketId: string, userAgent?: string, ip?: string) {
    const now = Date.now();
    const existing = this.clients.get(id);
    this.clients.set(id, {
      id,
      socketId,
      userAgent: userAgent || existing?.userAgent,
      ip: ip || existing?.ip,
      connectedAt: existing?.connectedAt ?? now,
      lastSeen: now,
    });
  }

  updateClient(id: string, socketId?: string) {
    const client = this.clients.get(id);
    if (client) {
      if (socketId) client.socketId = socketId;
      client.lastSeen = Date.now();
    }
  }

  unregisterClient(id: string) {
    this.clients.delete(id);
  }
}

const globalForMaster = global as unknown as { masterManager?: MasterManager };
export const masterManager = globalForMaster.masterManager ?? new MasterManager();
if (process.env.NODE_ENV !== 'production') {
  globalForMaster.masterManager = masterManager;
}