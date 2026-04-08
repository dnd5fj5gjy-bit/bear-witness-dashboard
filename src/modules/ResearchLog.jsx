import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { callAI } from '../lib/ai';
import {
  generateId, formatDate, formatDateTime, relativeTime, truncate, classNames,
  RESEARCH_CATEGORIES, PRIORITIES
} from '../lib/utils';
import {
  Search, Filter, Plus, X, ChevronDown, ChevronUp, Tag, Calendar,
  AlertCircle, BookOpen, MessageSquare, Sparkles, Save, Trash2, ExternalLink,
  SlidersHorizontal, Clock, Send, Loader
} from 'lucide-react';

const PRIORITY_COLORS = {
  Low: '#6B7280',
  Medium: '#3B82F6',
  High: '#F59E0B',
  Critical: '#EF4444',
};

function LoadingSkeleton({ lines = 3 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-[#1A1A26] rounded" style={{ width: `${85 - i * 15}%` }} />
      ))}
    </div>
  );
}

// ── Entry Form ──────────────────────────────────────────────────────────
function ResearchEntryForm({ clients, onSubmit, onCancel, editEntry }) {
  const [form, setForm] = useState({
    clientId: editEntry?.clientId || '',
    category: editEntry?.category || RESEARCH_CATEGORIES[0],
    title: editEntry?.title || '',
    content: editEntry?.content || '',
    tags: editEntry?.tags?.join(', ') || '',
    source: editEntry?.source || '',
    priority: editEntry?.priority || 'Medium',
    date: editEntry?.createdAt ? new Date(editEntry.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required';
    if (!form.content.trim()) errs.content = 'Note body is required';
    if (!form.clientId) errs.clientId = 'Select a client';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const tags = form.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    onSubmit({
      clientId: form.clientId,
      category: form.category,
      title: form.title,
      content: form.content,
      tags,
      source: form.source,
      priority: form.priority,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[rgba(255,255,255,0.9)] font-semibold text-base">
          {editEntry ? 'Edit Research Entry' : 'New Research Entry'}
        </h3>
        <button type="button" onClick={onCancel} className="text-[#6B7280] hover:text-[#9CA3AF] p-1">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Client *</label>
          <select
            value={form.clientId}
            onChange={e => handleChange('clientId', e.target.value)}
            className={classNames('w-full', errors.clientId && 'border-[#EF4444]')}
          >
            <option value="">Select client...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {errors.clientId && <p className="text-[#EF4444] text-xs mt-1">{errors.clientId}</p>}
        </div>

        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Category</label>
          <select value={form.category} onChange={e => handleChange('category', e.target.value)} className="w-full">
            {RESEARCH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Priority</label>
          <select value={form.priority} onChange={e => handleChange('priority', e.target.value)} className="w-full">
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[#9CA3AF] text-xs mb-1.5">Title *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => handleChange('title', e.target.value)}
          placeholder="Research entry title"
          className={classNames('w-full', errors.title && 'border-[#EF4444]')}
        />
        {errors.title && <p className="text-[#EF4444] text-xs mt-1">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-[#9CA3AF] text-xs mb-1.5">Note *</label>
        <textarea
          value={form.content}
          onChange={e => handleChange('content', e.target.value)}
          placeholder="Full research note..."
          rows={6}
          className={classNames('w-full resize-y min-h-[120px]', errors.content && 'border-[#EF4444]')}
        />
        {errors.content && <p className="text-[#EF4444] text-xs mt-1">{errors.content}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Tags (comma-separated)</label>
          <input
            type="text"
            value={form.tags}
            onChange={e => handleChange('tags', e.target.value)}
            placeholder="e.g. competitor, pricing, trend"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Source</label>
          <input
            type="text"
            value={form.source}
            onChange={e => handleChange('source', e.target.value)}
            placeholder="URL or reference"
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => handleChange('date', e.target.value)}
            className="w-full"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] text-sm">
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg"
        >
          {editEntry ? 'Update Entry' : 'Save Entry'}
        </button>
      </div>
    </form>
  );
}

// ── Research Entry Card ────────────────────────────────────────────────
function ResearchCard({ entry, clientName, onEdit, onDelete, expanded, onToggle }) {
  const bodyLines = (entry.content || '').split('\n');
  const preview = bodyLines.slice(0, 2).join('\n');
  const hasMore = bodyLines.length > 2 || (preview.length < (entry.content || '').length);

  return (
    <div className="bg-[#1A1A26] border border-[#2A2A3A] hover:border-[#3A3A4A] rounded-lg p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[#6B7280] text-xs flex items-center gap-1">
              <Clock size={12} />
              {formatDate(entry.createdAt)}
            </span>
            <span className="px-2 py-0.5 bg-[#222233] text-[#9CA3AF] text-xs rounded-md">
              {entry.category}
            </span>
            <span
              className="px-2 py-0.5 text-xs rounded-md font-medium"
              style={{
                backgroundColor: `${PRIORITY_COLORS[entry.priority]}20`,
                color: PRIORITY_COLORS[entry.priority],
              }}
            >
              {entry.priority}
            </span>
            {clientName && (
              <span className="text-xs text-[#10B981]">{clientName}</span>
            )}
          </div>
          <h4 className="text-[rgba(255,255,255,0.9)] font-medium text-sm mb-1">{entry.title}</h4>
          <p className="text-[#9CA3AF] text-sm whitespace-pre-line">
            {expanded ? entry.content : preview}
            {!expanded && hasMore && '...'}
          </p>
          {expanded && entry.source && (
            <a
              href={entry.source.startsWith('http') ? entry.source : `https://${entry.source}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3B82F6] text-xs hover:underline mt-2 inline-flex items-center gap-1"
            >
              <ExternalLink size={12} /> {entry.source}
            </a>
          )}
          {entry.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {entry.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-[#12121A] text-[#6B7280] text-xs rounded border border-[#2A2A3A]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasMore && (
            <button onClick={onToggle} className="text-[#6B7280] hover:text-[#9CA3AF] p-1">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <button onClick={() => onEdit(entry)} className="text-[#6B7280] hover:text-[#3B82F6] p-1">
            <BookOpen size={14} />
          </button>
          <button onClick={() => onDelete(entry.id)} className="text-[#6B7280] hover:text-[#EF4444] p-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AI Research Assistant ──────────────────────────────────────────────
function AIAssistantPanel({ research, clients }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAsk = async () => {
    if (!query.trim() || loading) return;
    const userQuery = query.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userQuery }]);
    setLoading(true);

    try {
      const clientMap = {};
      clients.forEach(c => { clientMap[c.id] = c.name; });

      const relevantNotes = research
        .filter(r => {
          const q = userQuery.toLowerCase();
          return (
            r.title?.toLowerCase().includes(q) ||
            (r.content || '').toLowerCase().includes(q) ||
            r.category?.toLowerCase().includes(q) ||
            r.tags?.some(t => t.toLowerCase().includes(q)) ||
            (clientMap[r.clientId] || '').toLowerCase().includes(q)
          );
        })
        .slice(0, 30);

      const allNotes = relevantNotes.length > 0 ? relevantNotes : research.slice(0, 20);

      const notesContext = allNotes.map(r =>
        `[${formatDate(r.createdAt)}] [${clientMap[r.clientId] || 'Unknown'}] [${r.category}] [${r.priority}]\nTitle: ${r.title}\n${r.content || ''}\nTags: ${(r.tags || []).join(', ')}${r.source ? `\nSource: ${r.source}` : ''}`
      ).join('\n\n---\n\n');

      const response = await callAI({
        system: `You are the Bear Witness research intelligence assistant. You have access to the agency's research log. Synthesise findings, identify patterns, and provide actionable intelligence. Be direct, use UK English, never use em dashes. Reference specific entries when relevant.`,
        user: `Research notes in the database:\n\n${notesContext}\n\nUser question: ${userQuery}`,
        maxTokens: 1500,
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg flex flex-col h-[500px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2A2A3A]">
        <Sparkles size={16} className="text-[#10B981]" />
        <h3 className="text-[rgba(255,255,255,0.9)] font-semibold text-sm">AI Research Assistant</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-[#6B7280] text-sm py-8">
            <Sparkles size={24} className="mx-auto mb-2 text-[#2A2A3A]" />
            <p>Ask questions about your research.</p>
            <p className="text-xs mt-1">The AI will synthesise relevant notes to answer.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={classNames('max-w-[85%] rounded-lg px-3 py-2 text-sm', msg.role === 'user' ? 'ml-auto bg-[#10B981]/15 text-[rgba(255,255,255,0.9)]' : 'bg-[#222233] text-[#9CA3AF]')}>
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="bg-[#222233] rounded-lg px-3 py-2 max-w-[85%]">
            <LoadingSkeleton lines={2} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-[#2A2A3A]">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your research..."
            className="flex-1"
            disabled={loading}
          />
          <button
            onClick={handleAsk}
            disabled={loading || !query.trim()}
            className="px-3 py-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 disabled:hover:bg-[#10B981] text-white rounded-lg"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filter Presets ─────────────────────────────────────────────────────
function FilterPresets({ presets, activePreset, onApply, onSave, onDelete }) {
  const [saving, setSaving] = useState(false);
  const [presetName, setPresetName] = useState('');

  const handleSave = () => {
    if (!presetName.trim()) return;
    onSave(presetName.trim());
    setPresetName('');
    setSaving(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {presets.map(p => (
        <div key={p.id} className="flex items-center gap-1">
          <button
            onClick={() => onApply(p)}
            className={classNames(
              'px-2.5 py-1 text-xs rounded-md border transition-colors',
              activePreset?.id === p.id
                ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                : 'bg-[#12121A] text-[#6B7280] border-[#2A2A3A] hover:border-[#3A3A4A]'
            )}
          >
            {p.name}
          </button>
          <button onClick={() => onDelete(p.id)} className="text-[#6B7280] hover:text-[#EF4444]">
            <X size={12} />
          </button>
        </div>
      ))}
      {saving ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={presetName}
            onChange={e => setPresetName(e.target.value)}
            placeholder="Preset name"
            className="text-xs py-1 px-2 w-32"
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <button onClick={handleSave} className="text-[#10B981] hover:text-[#059669] p-1">
            <Save size={14} />
          </button>
          <button onClick={() => setSaving(false)} className="text-[#6B7280] hover:text-[#9CA3AF] p-1">
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSaving(true)}
          className="px-2.5 py-1 text-xs rounded-md border border-dashed border-[#2A2A3A] text-[#6B7280] hover:text-[#9CA3AF] hover:border-[#3A3A4A]"
        >
          + Save Filter
        </button>
      )}
    </div>
  );
}

// ── Main Module ───────────────────────────────────────────────────────
export default function ResearchLog({ onNavigate, params } = {}) {
  const store = useStore();
  const { clients = [], research = [] } = store;

  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Presets
  const [filterPresets, setFilterPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bw:research-filter-presets') || '[]');
    } catch { return []; }
  });
  const [activePreset, setActivePreset] = useState(null);

  const savePresets = (presets) => {
    setFilterPresets(presets);
    localStorage.setItem('bw:research-filter-presets', JSON.stringify(presets));
  };

  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [clients]);

  const allTags = useMemo(() => {
    const tags = new Set();
    research.forEach(r => r.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [research]);

  const filteredResearch = useMemo(() => {
    let results = [...research];
    const q = searchQuery.toLowerCase();

    if (q) {
      results = results.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q) ||
        r.tags?.some(t => t.toLowerCase().includes(q)) ||
        (clientMap[r.clientId] || '').toLowerCase().includes(q)
      );
    }
    if (filterClient) results = results.filter(r => r.clientId === filterClient);
    if (filterCategory) results = results.filter(r => r.category === filterCategory);
    if (filterPriority) results = results.filter(r => r.priority === filterPriority);
    if (filterTag) results = results.filter(r => r.tags?.includes(filterTag));
    if (filterDateFrom) results = results.filter(r => new Date(r.createdAt) >= new Date(filterDateFrom));
    if (filterDateTo) results = results.filter(r => new Date(r.createdAt) <= new Date(filterDateTo + 'T23:59:59'));

    results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return results;
  }, [research, searchQuery, filterClient, filterCategory, filterPriority, filterTag, filterDateFrom, filterDateTo, clientMap]);

  const handleSubmitEntry = (data) => {
    if (editEntry) {
      store.updateResearch(editEntry.id, data);
      store.addActivity({ type: 'research', action: 'updated', title: data.title });
    } else {
      store.addResearch(data);
      store.addActivity({ type: 'research', action: 'created', title: data.title });
    }
    setShowForm(false);
    setEditEntry(null);
  };

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this research entry?')) {
      store.deleteResearch(id);
      store.addActivity({ type: 'research', action: 'deleted', title: 'Research entry' });
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterClient('');
    setFilterCategory('');
    setFilterPriority('');
    setFilterTag('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setActivePreset(null);
  };

  const handleSavePreset = (name) => {
    const preset = {
      id: generateId(),
      name,
      filters: { filterClient, filterCategory, filterPriority, filterTag, filterDateFrom, filterDateTo, searchQuery },
    };
    savePresets([...filterPresets, preset]);
  };

  const handleApplyPreset = (preset) => {
    const f = preset.filters;
    setSearchQuery(f.searchQuery || '');
    setFilterClient(f.filterClient || '');
    setFilterCategory(f.filterCategory || '');
    setFilterPriority(f.filterPriority || '');
    setFilterTag(f.filterTag || '');
    setFilterDateFrom(f.filterDateFrom || '');
    setFilterDateTo(f.filterDateTo || '');
    setActivePreset(preset);
  };

  const handleDeletePreset = (id) => {
    savePresets(filterPresets.filter(p => p.id !== id));
    if (activePreset?.id === id) setActivePreset(null);
  };

  const hasActiveFilters = filterClient || filterCategory || filterPriority || filterTag || filterDateFrom || filterDateTo;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[rgba(255,255,255,0.9)]">Research &amp; Intelligence Log</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">{research.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAI(!showAI)}
            className={classNames(
              'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
              showAI
                ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                : 'bg-[#1A1A26] text-[#9CA3AF] border-[#2A2A3A] hover:border-[#3A3A4A]'
            )}
          >
            <Sparkles size={16} />
            AI Assistant
          </button>
          <button
            onClick={() => { setShowForm(true); setEditEntry(null); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg"
          >
            <Plus size={16} />
            New Entry
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <ResearchEntryForm
          clients={clients}
          onSubmit={handleSubmitEntry}
          onCancel={() => { setShowForm(false); setEditEntry(null); }}
          editEntry={editEntry}
        />
      )}

      {/* Layout: feed + AI */}
      <div className={classNames('grid gap-5', showAI ? 'grid-cols-1 lg:grid-cols-[1fr_380px]' : 'grid-cols-1')}>
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search research entries..."
                className="w-full pl-10"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={classNames(
                'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors',
                showFilters || hasActiveFilters
                  ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                  : 'bg-[#1A1A26] text-[#9CA3AF] border-[#2A2A3A] hover:border-[#3A3A4A]'
              )}
            >
              <SlidersHorizontal size={16} />
              Filters
              {hasActiveFilters && (
                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full" />
              )}
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[#6B7280] text-xs mb-1">Client</label>
                  <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-full text-sm">
                    <option value="">All Clients</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[#6B7280] text-xs mb-1">Category</label>
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full text-sm">
                    <option value="">All Categories</option>
                    {RESEARCH_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[#6B7280] text-xs mb-1">Priority</label>
                  <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-full text-sm">
                    <option value="">All Priorities</option>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[#6B7280] text-xs mb-1">Tag</label>
                  <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className="w-full text-sm">
                    <option value="">All Tags</option>
                    {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[#6B7280] text-xs mb-1">From Date</label>
                  <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="w-full text-sm" />
                </div>
                <div>
                  <label className="block text-[#6B7280] text-xs mb-1">To Date</label>
                  <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="w-full text-sm" />
                </div>
                <div className="md:col-span-2 flex items-end">
                  <button onClick={clearFilters} className="text-[#6B7280] hover:text-[#9CA3AF] text-xs">
                    Clear all filters
                  </button>
                </div>
              </div>

              {/* Filter Presets */}
              <div className="pt-2 border-t border-[#2A2A3A]">
                <FilterPresets
                  presets={filterPresets}
                  activePreset={activePreset}
                  onApply={handleApplyPreset}
                  onSave={handleSavePreset}
                  onDelete={handleDeletePreset}
                />
              </div>
            </div>
          )}

          {/* Results count */}
          {(searchQuery || hasActiveFilters) && (
            <p className="text-[#6B7280] text-xs">
              {filteredResearch.length} result{filteredResearch.length !== 1 ? 's' : ''} found
            </p>
          )}

          {/* Entry List */}
          <div className="space-y-2">
            {filteredResearch.length === 0 ? (
              <div className="text-center py-12 text-[#6B7280]">
                <BookOpen size={32} className="mx-auto mb-3 text-[#2A2A3A]" />
                <p className="text-sm">
                  {research.length === 0
                    ? 'No research entries yet. Create your first one.'
                    : 'No entries match your filters.'}
                </p>
              </div>
            ) : (
              filteredResearch.map(entry => (
                <ResearchCard
                  key={entry.id}
                  entry={entry}
                  clientName={clientMap[entry.clientId]}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  expanded={expandedIds.has(entry.id)}
                  onToggle={() => toggleExpand(entry.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* AI Panel */}
        {showAI && (
          <AIAssistantPanel research={research} clients={clients} />
        )}
      </div>
    </div>
  );
}
