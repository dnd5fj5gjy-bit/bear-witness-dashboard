import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '../lib/storage';
import { generateId } from '../lib/utils';
import {
  sampleClients,
  sampleCampaigns,
  samplePosts,
  sampleResearch,
  sampleActivityFeed,
  sampleSettings,
} from '../lib/sampleData';

const StoreContext = createContext(null);

const KEYS = {
  clients: 'data:clients',
  campaigns: 'data:campaigns',
  posts: 'data:posts',
  research: 'data:research',
  strategies: 'data:strategies',
  proposals: 'data:proposals',
  activityFeed: 'data:activityFeed',
  settings: 'settings:global',
};

// ---------------------------------------------------------------------------
// Server-mode helpers
// ---------------------------------------------------------------------------

function getServerConfig() {
  try {
    const url = localStorage.getItem('bw2:serverUrl');
    const key = localStorage.getItem('bw2:serverApiKey');
    if (url && url.trim()) {
      return { serverUrl: url.trim().replace(/\/+$/, ''), serverApiKey: key || '' };
    }
  } catch { /* ignore */ }
  return null;
}

async function apiFetch(path, options = {}) {
  const cfg = getServerConfig();
  if (!cfg) throw new Error('Server not configured');

  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (cfg.serverApiKey) {
    headers['X-API-Key'] = cfg.serverApiKey;
  }

  const res = await fetch(`${cfg.serverUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}

// API endpoint mapping
const API_PATHS = {
  clients: '/api/clients',
  campaigns: '/api/campaigns',
  posts: '/api/content-posts',
  research: '/api/research',
  strategies: '/api/strategies',
  proposals: '/api/proposals',
  activityFeed: '/api/activity',
  settings: '/api/settings',
};

export function StoreProvider({ children }) {
  const [clients, setClients] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [posts, setPosts] = useState([]);
  const [research, setResearch] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [settings, setSettings] = useState(sampleSettings);
  const [loaded, setLoaded] = useState(false);
  const [isServerMode, setIsServerMode] = useState(false);
  const initializedRef = useRef(false);

  // Check if server mode is available
  const checkServerMode = useCallback(() => {
    const cfg = getServerConfig();
    setIsServerMode(!!cfg);
    return !!cfg;
  }, []);

  // Load data on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      const cfg = getServerConfig();

      if (cfg) {
        // Try to load from server
        try {
          const [
            serverClients,
            serverCampaigns,
            serverPosts,
            serverResearch,
            serverStrategies,
            serverProposals,
            serverActivity,
            serverSettings,
          ] = await Promise.all([
            apiFetch(API_PATHS.clients),
            apiFetch(API_PATHS.campaigns),
            apiFetch(API_PATHS.posts),
            apiFetch(API_PATHS.research),
            apiFetch(API_PATHS.strategies),
            apiFetch(API_PATHS.proposals),
            apiFetch(API_PATHS.activityFeed),
            apiFetch(API_PATHS.settings),
          ]);

          setClients(Array.isArray(serverClients) ? serverClients : []);
          setCampaigns(Array.isArray(serverCampaigns) ? serverCampaigns : []);
          setPosts(Array.isArray(serverPosts) ? serverPosts : []);
          setResearch(Array.isArray(serverResearch) ? serverResearch : []);
          setStrategies(Array.isArray(serverStrategies) ? serverStrategies : []);
          setProposals(Array.isArray(serverProposals) ? serverProposals : []);
          setActivityFeed(Array.isArray(serverActivity) ? serverActivity : []);
          setSettings(serverSettings && typeof serverSettings === 'object' && Object.keys(serverSettings).length > 0
            ? serverSettings
            : sampleSettings);
          setIsServerMode(true);
          setLoaded(true);
          return;
        } catch (err) {
          console.warn('Server mode failed, falling back to localStorage:', err.message);
        }
      }

      // Fallback: localStorage
      const storedClients = await storage.get(KEYS.clients);
      const storedCampaigns = await storage.get(KEYS.campaigns);
      const storedPosts = await storage.get(KEYS.posts);
      const storedResearch = await storage.get(KEYS.research);
      const storedStrategies = await storage.get(KEYS.strategies);
      const storedProposals = await storage.get(KEYS.proposals);
      const storedActivity = await storage.get(KEYS.activityFeed);
      const storedSettings = await storage.get(KEYS.settings);

      setClients(storedClients || []);
      setCampaigns(storedCampaigns || []);
      setPosts(storedPosts || []);
      setResearch(storedResearch || []);
      setStrategies(storedStrategies || []);
      setProposals(storedProposals || []);
      setActivityFeed(storedActivity || []);
      setSettings(storedSettings || sampleSettings);
      setIsServerMode(false);
      setLoaded(true);
    }

    init();
  }, []);

  // Persist helper — writes to server or localStorage
  const persist = useCallback(async (key, data) => {
    await storage.set(key, data);
  }, []);

  // Fire-and-forget API call (for server mode). Does not block UI.
  const apiCall = useCallback((path, method, body) => {
    if (!getServerConfig()) return;
    apiFetch(path, {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }).catch(err => {
      console.warn(`API ${method} ${path} failed:`, err.message);
    });
  }, []);

  // --- CLIENTS ---
  const addClient = useCallback((data) => {
    const client = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setClients(prev => {
      const next = [...prev, client];
      persist(KEYS.clients, next);
      return next;
    });
    apiCall(API_PATHS.clients, 'POST', client);
    return client;
  }, [persist, apiCall]);

  const updateClient = useCallback((id, data) => {
    let updated;
    setClients(prev => {
      const next = prev.map(c => {
        if (c.id === id) {
          updated = { ...c, ...data, updatedAt: Date.now() };
          return updated;
        }
        return c;
      });
      persist(KEYS.clients, next);
      return next;
    });
    // updated gets set synchronously in the map above
    if (getServerConfig()) {
      // Defer to next tick so `updated` is populated
      setTimeout(() => {
        if (updated) apiCall(`${API_PATHS.clients}/${id}`, 'PUT', data);
      }, 0);
    }
  }, [persist, apiCall]);

  const deleteClient = useCallback((id) => {
    setClients(prev => {
      const next = prev.filter(c => c.id !== id);
      persist(KEYS.clients, next);
      return next;
    });
    setCampaigns(prev => {
      const next = prev.filter(c => c.clientId !== id);
      persist(KEYS.campaigns, next);
      return next;
    });
    setPosts(prev => {
      const next = prev.filter(p => p.clientId !== id);
      persist(KEYS.posts, next);
      return next;
    });
    setResearch(prev => {
      const next = prev.filter(r => r.clientId !== id);
      persist(KEYS.research, next);
      return next;
    });
    setStrategies(prev => {
      const next = prev.filter(s => s.clientId !== id);
      persist(KEYS.strategies, next);
      return next;
    });
    setProposals(prev => {
      const next = prev.filter(p => p.clientId !== id);
      persist(KEYS.proposals, next);
      return next;
    });
    apiCall(`${API_PATHS.clients}/${id}`, 'DELETE');
  }, [persist, apiCall]);

  // --- CAMPAIGNS ---
  const addCampaign = useCallback((data) => {
    const campaign = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setCampaigns(prev => {
      const next = [...prev, campaign];
      persist(KEYS.campaigns, next);
      return next;
    });
    apiCall(API_PATHS.campaigns, 'POST', campaign);
    return campaign;
  }, [persist, apiCall]);

  const updateCampaign = useCallback((id, data) => {
    setCampaigns(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...data, updatedAt: Date.now() } : c);
      persist(KEYS.campaigns, next);
      return next;
    });
    apiCall(`${API_PATHS.campaigns}/${id}`, 'PUT', data);
  }, [persist, apiCall]);

  const deleteCampaign = useCallback((id) => {
    setCampaigns(prev => {
      const next = prev.filter(c => c.id !== id);
      persist(KEYS.campaigns, next);
      return next;
    });
    apiCall(`${API_PATHS.campaigns}/${id}`, 'DELETE');
  }, [persist, apiCall]);

  // --- POSTS ---
  const addPost = useCallback((data) => {
    const post = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setPosts(prev => {
      const next = [...prev, post];
      persist(KEYS.posts, next);
      return next;
    });
    apiCall(API_PATHS.posts, 'POST', post);
    return post;
  }, [persist, apiCall]);

  const updatePost = useCallback((id, data) => {
    setPosts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p);
      persist(KEYS.posts, next);
      return next;
    });
    apiCall(`${API_PATHS.posts}/${id}`, 'PUT', data);
  }, [persist, apiCall]);

  const deletePost = useCallback((id) => {
    setPosts(prev => {
      const next = prev.filter(p => p.id !== id);
      persist(KEYS.posts, next);
      return next;
    });
    apiCall(`${API_PATHS.posts}/${id}`, 'DELETE');
  }, [persist, apiCall]);

  // --- RESEARCH ---
  const addResearch = useCallback((data) => {
    const note = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setResearch(prev => {
      const next = [...prev, note];
      persist(KEYS.research, next);
      return next;
    });
    apiCall(API_PATHS.research, 'POST', note);
    return note;
  }, [persist, apiCall]);

  const updateResearch = useCallback((id, data) => {
    setResearch(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...data, updatedAt: Date.now() } : r);
      persist(KEYS.research, next);
      return next;
    });
    apiCall(`${API_PATHS.research}/${id}`, 'PUT', data);
  }, [persist, apiCall]);

  const deleteResearch = useCallback((id) => {
    setResearch(prev => {
      const next = prev.filter(r => r.id !== id);
      persist(KEYS.research, next);
      return next;
    });
    apiCall(`${API_PATHS.research}/${id}`, 'DELETE');
  }, [persist, apiCall]);

  // --- STRATEGIES ---
  const addStrategy = useCallback((data) => {
    const strategy = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setStrategies(prev => {
      const next = [...prev, strategy];
      persist(KEYS.strategies, next);
      return next;
    });
    apiCall(API_PATHS.strategies, 'POST', strategy);
    return strategy;
  }, [persist, apiCall]);

  const updateStrategy = useCallback((id, data) => {
    setStrategies(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...data, updatedAt: Date.now() } : s);
      persist(KEYS.strategies, next);
      return next;
    });
    apiCall(`${API_PATHS.strategies}/${id}`, 'PUT', data);
  }, [persist, apiCall]);

  const deleteStrategy = useCallback((id) => {
    setStrategies(prev => {
      const next = prev.filter(s => s.id !== id);
      persist(KEYS.strategies, next);
      return next;
    });
    apiCall(`${API_PATHS.strategies}/${id}`, 'DELETE');
  }, [persist, apiCall]);

  // --- PROPOSALS ---
  const addProposal = useCallback((data) => {
    const proposal = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setProposals(prev => {
      const next = [...prev, proposal];
      persist(KEYS.proposals, next);
      return next;
    });
    apiCall(API_PATHS.proposals, 'POST', proposal);
    return proposal;
  }, [persist, apiCall]);

  const updateProposal = useCallback((id, data) => {
    setProposals(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p);
      persist(KEYS.proposals, next);
      return next;
    });
    apiCall(`${API_PATHS.proposals}/${id}`, 'PUT', data);
  }, [persist, apiCall]);

  const deleteProposal = useCallback((id) => {
    setProposals(prev => {
      const next = prev.filter(p => p.id !== id);
      persist(KEYS.proposals, next);
      return next;
    });
    apiCall(`${API_PATHS.proposals}/${id}`, 'DELETE');
  }, [persist, apiCall]);

  // --- ACTIVITY FEED ---
  const addActivity = useCallback((entry) => {
    const activity = { ...entry, id: generateId(), timestamp: Date.now() };
    setActivityFeed(prev => {
      const next = [activity, ...prev].slice(0, 100);
      persist(KEYS.activityFeed, next);
      return next;
    });
    apiCall(API_PATHS.activityFeed, 'POST', activity);
  }, [persist, apiCall]);

  // --- SETTINGS ---
  const updateSettings = useCallback((data) => {
    setSettings(prev => {
      const next = { ...prev, ...data };
      persist(KEYS.settings, next);
      return next;
    });
    apiCall(API_PATHS.settings, 'PUT', data);
  }, [persist, apiCall]);

  // --- Re-fetch from server (called after server config changes) ---
  const refreshFromServer = useCallback(async () => {
    const cfg = getServerConfig();
    if (!cfg) {
      setIsServerMode(false);
      return;
    }

    try {
      const [
        serverClients,
        serverCampaigns,
        serverPosts,
        serverResearch,
        serverStrategies,
        serverProposals,
        serverActivity,
        serverSettings,
      ] = await Promise.all([
        apiFetch(API_PATHS.clients),
        apiFetch(API_PATHS.campaigns),
        apiFetch(API_PATHS.posts),
        apiFetch(API_PATHS.research),
        apiFetch(API_PATHS.strategies),
        apiFetch(API_PATHS.proposals),
        apiFetch(API_PATHS.activityFeed),
        apiFetch(API_PATHS.settings),
      ]);

      setClients(Array.isArray(serverClients) ? serverClients : []);
      setCampaigns(Array.isArray(serverCampaigns) ? serverCampaigns : []);
      setPosts(Array.isArray(serverPosts) ? serverPosts : []);
      setResearch(Array.isArray(serverResearch) ? serverResearch : []);
      setStrategies(Array.isArray(serverStrategies) ? serverStrategies : []);
      setProposals(Array.isArray(serverProposals) ? serverProposals : []);
      setActivityFeed(Array.isArray(serverActivity) ? serverActivity : []);
      setSettings(serverSettings && typeof serverSettings === 'object' && Object.keys(serverSettings).length > 0
        ? serverSettings
        : sampleSettings);
      setIsServerMode(true);
    } catch (err) {
      console.warn('refreshFromServer failed:', err.message);
      setIsServerMode(false);
    }
  }, []);

  // --- QUERIES ---
  const getClientCampaigns = useCallback((clientId) => {
    return campaigns.filter(c => c.clientId === clientId);
  }, [campaigns]);

  const getClientPosts = useCallback((clientId) => {
    return posts.filter(p => p.clientId === clientId);
  }, [posts]);

  const getClientResearch = useCallback((clientId) => {
    return research.filter(r => r.clientId === clientId);
  }, [research]);

  const getClientStrategies = useCallback((clientId) => {
    return strategies.filter(s => s.clientId === clientId);
  }, [strategies]);

  const getClientProposals = useCallback((clientId) => {
    return proposals.filter(p => p.clientId === clientId);
  }, [proposals]);

  // --- GLOBAL SEARCH ---
  const globalSearch = useCallback((query) => {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    const results = [];

    clients.forEach(c => {
      const searchable = `${c.name} ${c.sector} ${c.contactName} ${c.notes || ''}`.toLowerCase();
      if (searchable.includes(q)) {
        results.push({ type: 'client', id: c.id, name: c.name, subtitle: c.sector, data: c });
      }
    });

    campaigns.forEach(c => {
      const client = clients.find(cl => cl.id === c.clientId);
      const searchable = `${c.name} ${c.description || ''} ${c.objective}`.toLowerCase();
      if (searchable.includes(q)) {
        results.push({ type: 'campaign', id: c.id, name: c.name, subtitle: client?.name || 'Unknown client', data: c });
      }
    });

    posts.forEach(p => {
      const client = clients.find(cl => cl.id === p.clientId);
      const searchable = `${p.title} ${p.content} ${p.platform}`.toLowerCase();
      if (searchable.includes(q)) {
        results.push({ type: 'post', id: p.id, name: p.title, subtitle: `${p.platform} - ${client?.name || ''}`, data: p });
      }
    });

    research.forEach(r => {
      const client = clients.find(cl => cl.id === r.clientId);
      const searchable = `${r.title} ${r.content} ${r.category}`.toLowerCase();
      if (searchable.includes(q)) {
        results.push({ type: 'research', id: r.id, name: r.title, subtitle: `${r.category} - ${client?.name || ''}`, data: r });
      }
    });

    strategies.forEach(s => {
      const client = clients.find(cl => cl.id === s.clientId);
      const searchable = `${s.title} ${s.content || ''} ${s.summary || ''}`.toLowerCase();
      if (searchable.includes(q)) {
        results.push({ type: 'strategy', id: s.id, name: s.title, subtitle: client?.name || '', data: s });
      }
    });

    proposals.forEach(p => {
      const client = clients.find(cl => cl.id === p.clientId);
      const searchable = `${p.title} ${p.content || ''} ${p.summary || ''}`.toLowerCase();
      if (searchable.includes(q)) {
        results.push({ type: 'proposal', id: p.id, name: p.title, subtitle: client?.name || '', data: p });
      }
    });

    return results.slice(0, 20);
  }, [clients, campaigns, posts, research, strategies, proposals]);

  const value = {
    loaded,
    isServerMode,
    refreshFromServer,
    clients, addClient, updateClient, deleteClient,
    campaigns, addCampaign, updateCampaign, deleteCampaign,
    posts, addPost, updatePost, deletePost,
    research, addResearch, updateResearch, deleteResearch,
    strategies, addStrategy, updateStrategy, deleteStrategy,
    proposals, addProposal, updateProposal, deleteProposal,
    activityFeed, addActivity,
    settings, updateSettings,
    getClientCampaigns, getClientPosts, getClientResearch,
    getClientStrategies, getClientProposals,
    globalSearch,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
