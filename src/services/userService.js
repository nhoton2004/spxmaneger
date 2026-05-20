import { readJSON, writeJSON } from './storage';

const USERS_KEY = 'spx_users_v1';
const SESSION_KEY = 'spx_session_v1';

function seedIfEmpty() {
  const users = readJSON(USERS_KEY, null);
  if (Array.isArray(users) && users.length) return users;
  const admin = {
    uid: 'local-admin',
    email: 'admin@local.test',
    displayName: 'Local Admin',
    role: 'admin',
    assignedShops: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    disabled: false,
  };
  writeJSON(USERS_KEY, [admin]);
  return [admin];
}

export const userService = {
  list() {
    return seedIfEmpty();
  },

  getSession() {
    const session = readJSON(SESSION_KEY, null);
    if (session) return session;
    const admin = this.list()[0];
    writeJSON(SESSION_KEY, admin);
    return admin;
  },

  setSession(user) {
    writeJSON(SESSION_KEY, user);
  },

  signOut() {
    writeJSON(SESSION_KEY, null);
  },

  update(uid, patch) {
    const users = this.list();
    const idx = users.findIndex(u => u.uid === uid);
    if (idx < 0) return null;
    users[idx] = { ...users[idx], ...patch, updatedAt: new Date().toISOString() };
    writeJSON(USERS_KEY, users);
    if (this.getSession()?.uid === uid) this.setSession(users[idx]);
    return users[idx];
  },
};
