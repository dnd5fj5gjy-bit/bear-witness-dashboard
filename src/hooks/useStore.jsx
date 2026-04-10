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
  const initializedRef = useRef(false);

  // Load data on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      const storedClients = await storage.get(KEYS.clients);
      const storedCampaigns = await storage.get(KEYS.campaigns);
      const storedPosts = await storage.get(KEYS.posts);
      const storedResearch = await storage.get(KEYS.research);
      const storedStrategies = await storage.get(KEYS.strategies);
      const storedProposals = await storage.get(KEYS.proposals);
      const storedActivity = await storage.get(KEYS.activityFeed);
      const storedSettings = await storage.get(KEYS.settings);

      // Start clean — no sample data
      {
        setClients(storedClients || []);
        setCampaigns(storedCampaigns || []);
        setPosts(storedPosts || []);
        setResearch(storedResearch || []);
        setStrategies(storedStrategies || []);
        setProposals(storedProposals || []);
        setActivityFeed(storedActivity || []);
        setSettings(storedSettings || sampleSettings);
      }

      setLoaded(true);
    }

    init();
  }, []);

  // Persist helper
  const persist = useCallback(async (key, data) => {
    await storage.set(key, data);
  }, []);

  // --- CLIENTS ---
  const addClient = useCallback((data) => {
    const client = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setClients(prev => {
      const next = [...prev, client];
      persist(KEYS.clients, next);
      return next;
    });
    return client;
  }, [persist]);

  const updateClient = useCallback((id, data) => {
    setClients(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...data, updatedAt: Date.now() } : c);
      persist(KEYS.clients, next);
      return next;
    });
  }, [persist]);

  const deleteClient = useCallback((id) => {
    setClients(prev => {
      const next = prev.filter(c => c.id !== id);
      persist(KEYS.clients, next);
      return next;
    });
    // Also delete associated data
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
  }, [persist]);

  // --- CAMPAIGNS ---
  const addCampaign = useCallback((data) => {
    const campaign = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setCampaigns(prev => {
      const next = [...prev, campaign];
      persist(KEYS.campaigns, next);
      return next;
    });
    return campaign;
  }, [persist]);

  const updateCampaign = useCallback((id, data) => {
    setCampaigns(prev => {
      const next = prev.map(c => c.id === id ? { ...c, ...data, updatedAt: Date.now() } : c);
      persist(KEYS.campaigns, next);
      return next;
    });
  }, [persist]);

  const deleteCampaign = useCallback((id) => {
    setCampaigns(prev => {
      const next = prev.filter(c => c.id !== id);
      persist(KEYS.campaigns, next);
      return next;
    });
  }, [persist]);

  // --- POSTS ---
  const addPost = useCallback((data) => {
    const post = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setPosts(prev => {
      const next = [...prev, post];
      persist(KEYS.posts, next);
      return next;
    });
    return post;
  }, [persist]);

  const updatePost = useCallback((id, data) => {
    setPosts(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p);
      persist(KEYS.posts, next);
      return next;
    });
  }, [persist]);

  const deletePost = useCallback((id) => {
    setPosts(prev => {
      const next = prev.filter(p => p.id !== id);
      persist(KEYS.posts, next);
      return next;
    });
  }, [persist]);

  // --- RESEARCH ---
  const addResearch = useCallback((data) => {
    const note = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setResearch(prev => {
      const next = [...prev, note];
      persist(KEYS.research, next);
      return next;
    });
    return note;
  }, [persist]);

  const updateResearch = useCallback((id, data) => {
    setResearch(prev => {
      const next = prev.map(r => r.id === id ? { ...r, ...data, updatedAt: Date.now() } : r);
      persist(KEYS.research, next);
      return next;
    });
  }, [persist]);

  const deleteResearch = useCallback((id) => {
    setResearch(prev => {
      const next = prev.filter(r => r.id !== id);
      persist(KEYS.research, next);
      return next;
    });
  }, [persist]);

  // --- STRATEGIES ---
  const addStrategy = useCallback((data) => {
    const strategy = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setStrategies(prev => {
      const next = [...prev, strategy];
      persist(KEYS.strategies, next);
      return next;
    });
    return strategy;
  }, [persist]);

  const updateStrategy = useCallback((id, data) => {
    setStrategies(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...data, updatedAt: Date.now() } : s);
      persist(KEYS.strategies, next);
      return next;
    });
  }, [persist]);

  const deleteStrategy = useCallback((id) => {
    setStrategies(prev => {
      const next = prev.filter(s => s.id !== id);
      persist(KEYS.strategies, next);
      return next;
    });
  }, [persist]);

  // --- PROPOSALS ---
  const addProposal = useCallback((data) => {
    const proposal = { ...data, id: generateId(), createdAt: Date.now(), updatedAt: Date.now() };
    setProposals(prev => {
      const next = [...prev, proposal];
      persist(KEYS.proposals, next);
      return next;
    });
    return proposal;
  }, [persist]);

  const updateProposal = useCallback((id, data) => {
    setProposals(prev => {
      const next = prev.map(p => p.id === id ? { ...p, ...data, updatedAt: Date.now() } : p);
      persist(KEYS.proposals, next);
      return next;
    });
  }, [persist]);

  const deleteProposal = useCallback((id) => {
    setProposals(prev => {
      const next = prev.filter(p => p.id !== id);
      persist(KEYS.proposals, next);
      return next;
    });
  }, [persist]);

  // --- ACTIVITY FEED ---
  const addActivity = useCallback((entry) => {
    const activity = { ...entry, id: generateId(), timestamp: Date.now() };
    setActivityFeed(prev => {
      const next = [activity, ...prev].slice(0, 100); // Keep last 100
      persist(KEYS.activityFeed, next);
      return next;
    });
  }, [persist]);

  // --- SETTINGS ---
  const updateSettings = useCallback((data) => {
    setSettings(prev => {
      const next = { ...prev, ...data };
      persist(KEYS.settings, next);
      return next;
    });
  }, [persist]);

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
