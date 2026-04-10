// Storage abstraction layer - uses localStorage with JSON serialization
const STORAGE_PREFIX = 'bw2:';
const STORAGE_VERSION = '2';

// Auto-clear old data on first load of new version
(function migrateClearOldData() {
  const vKey = 'bw2:_version';
  const current = localStorage.getItem(vKey);
  if (current !== STORAGE_VERSION) {
    // Clear all old bw: and bw2: keys
    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('bw:') || key.startsWith('bw2:'))) {
        toRemove.push(key);
      }
    }
    toRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(vKey, STORAGE_VERSION);
  }
})();

export const storage = {
  async get(key) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn(`Storage get error for ${key}:`, e);
      return null;
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`Storage set error for ${key}:`, e);
      return false;
    }
  },

  async remove(key) {
    try {
      localStorage.removeItem(STORAGE_PREFIX + key);
      return true;
    } catch (e) {
      console.warn(`Storage remove error for ${key}:`, e);
      return false;
    }
  },

  async exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(STORAGE_PREFIX) && !key.endsWith('_version')) {
        data[key.slice(STORAGE_PREFIX.length)] = JSON.parse(localStorage.getItem(key));
      }
    }
    return data;
  },

  async importAll(data) {
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    }
  },

  async clearAll() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(STORAGE_PREFIX) && !key.endsWith('_version')) keys.push(key);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }
};
