const memoryStore = new Map();

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readJSON(key, fallback) {
  try {
    const raw = isBrowser() ? window.localStorage.getItem(key) : memoryStore.get(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJSON(key, value) {
  const raw = JSON.stringify(value);
  if (isBrowser()) {
    window.localStorage.setItem(key, raw);
  } else {
    memoryStore.set(key, raw);
  }
}

export function removeKey(key) {
  if (isBrowser()) {
    window.localStorage.removeItem(key);
  } else {
    memoryStore.delete(key);
  }
}
