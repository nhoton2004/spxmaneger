import { readJSON, writeJSON } from './storage';

const SHOPS_KEY = 'spx_shops_v1';

function seedIfEmpty() {
  const current = readJSON(SHOPS_KEY, null);
  if (Array.isArray(current)) return current;
  const seed = [];
  writeJSON(SHOPS_KEY, seed);
  return seed;
}

function now() { return new Date().toISOString(); }

function makeCode() {
  return `SHOP_${Date.now()}`;
}

export const shopService = {
  list() {
    const shops = seedIfEmpty();
    return [...shops].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },

  getById(id) {
    return this.list().find(s => s.id === id) || null;
  },

  create(payload) {
    const shops = this.list();
    const next = {
      id: crypto?.randomUUID ? crypto.randomUUID() : `shop_${Date.now()}`,
      name: payload.name,
      code: payload.code || makeCode(),
      platform: payload.platform || 'spx',
      ownerId: payload.ownerId || null,
      assignedUsers: [],
      createdAt: now(),
      updatedAt: now(),
    };
    shops.unshift(next);
    writeJSON(SHOPS_KEY, shops);
    return next;
  },

  update(id, patch) {
    const shops = this.list();
    const idx = shops.findIndex(s => s.id === id);
    if (idx < 0) return null;
    shops[idx] = { ...shops[idx], ...patch, updatedAt: now() };
    writeJSON(SHOPS_KEY, shops);
    return shops[idx];
  },

  remove(id) {
    const shops = this.list();
    const next = shops.filter(s => s.id !== id);
    writeJSON(SHOPS_KEY, next);
    return true;
  },
};
