import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '../hooks/useStore';
import {
  Megaphone, Plus, Search, ArrowLeft, Edit3, Trash2, X, Check,
  LayoutGrid, List, Filter, ChevronRight, Calendar, Target,
  DollarSign, Users, Brain, Send, Loader2, GripVertical,
  ArrowRight, BarChart3, Copy, ArrowUp, ArrowDown, CheckSquare,
  Square, Clock, MessageCircle, ChevronDown,
} from 'lucide-react';
import {
  getInitials, getClientColor, formatDate, relativeTime, truncate,
  CAMPAIGN_OBJECTIVES, CAMPAIGN_TYPES, CAMPAIGN_STATUSES, PLATFORMS,
} from '../lib/utils';
import { callAI } from '../lib/ai';
import { differenceInDays, parseISO, format } from 'date-fns';

const EMPTY_CAMPAIGN = {
  clientId: '', name: '', objective: '', type: '', status: 'Planning',
  platforms: [], startDate: '', endDate: '', budget: '', budgetSpent: 0,
  description: '', keyMessages: [''], targetMetrics: { reach: '', engagement: '', conversions: '' },
  notes: '', performanceNotes: [],
};

const KANBAN_COLUMNS = ['Planning', 'Active', 'Paused', 'Complete'];

/* ─── Budget Bar ─── */
function BudgetBar({ allocated, spent, showLabel = true, mini = false }) {
  const alloc = Number(allocated) || 0;
  const sp = Number(spent) || 0;
  if (alloc === 0) return showLabel ? <span className="text-xs text-[#6B7280]">No budget set</span> : null;
  const pct = Math.min(Math.round((sp / alloc) * 100), 100);
  const color = pct < 70 ? 'bg-emerald-500' : pct < 90 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = pct < 70 ? 'text-emerald-400' : pct < 90 ? 'text-yellow-400' : 'text-red-400';

  if (mini) {
    return (
      <div className="w-full">
        <div className="h-1.5 bg-[#2A2A3A] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[#9CA3AF]">Budget Spent</span>
          <span className={`text-xs font-medium ${textColor}`}>
            {"\u00A3"}{sp.toLocaleString()} / {"\u00A3"}{alloc.toLocaleString()} ({pct}%)
          </span>
        </div>
      )}
      <div className="h-2.5 bg-[#2A2A3A] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ─── Performance Notes Timeline ─── */
function PerformanceNotes({ campaign }) {
  const store = useStore();
  const [newNote, setNewNote] = useState('');

  const notes = campaign.performanceNotes || [];

  const handleAdd = () => {
    if (!newNote.trim()) return;
    const updated = [...notes, { id: Date.now().toString(36), text: newNote.trim(), date: Date.now() }];
    store.updateCampaign(campaign.id, { performanceNotes: updated });
    setNewNote('');
  };

  const handleDelete = (noteId) => {
    const updated = notes.filter(n => n.id !== noteId);
    store.updateCampaign(campaign.id, { performanceNotes: updated });
  };

  return (
    <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A3A]">
        <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
          <MessageCircle size={13} /> Performance Notes
        </h3>
        <span className="text-[10px] text-[#6B7280]">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="p-4">
        {/* Add new note */}
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors"
            placeholder="Add a performance note..."
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newNote.trim()}
            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-[#1A1A26] disabled:text-[#6B7280] text-white text-sm rounded-md transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Timeline */}
        {notes.length === 0 ? (
          <p className="text-xs text-[#6B7280] text-center py-4">No performance notes yet. Add observations, metrics updates, or feedback.</p>
        ) : (
          <div className="space-y-0">
            {[...notes].sort((a, b) => (b.date || 0) - (a.date || 0)).map((note, idx) => (
              <div key={note.id} className="flex gap-3 group">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500/60 mt-1.5 flex-shrink-0" />
                  {idx < notes.length - 1 && <div className="w-px flex-1 bg-[#2A2A3A] mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm text-[#9CA3AF] leading-relaxed">{note.text}</p>
                      <span className="text-[10px] text-[#6B7280] mt-1 block">
                        {note.date ? format(new Date(note.date), 'd MMM yyyy, HH:mm') : 'Unknown date'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-[#6B7280] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Campaign Form ─── */
function CampaignForm({ initial, clients, onSave, onCancel, defaultClientId }) {
  const [form, setForm] = useState(() => {
    if (initial) return {
      ...initial,
      keyMessages: initial.keyMessages?.length ? initial.keyMessages : [''],
      budgetSpent: initial.budgetSpent || 0,
      performanceNotes: initial.performanceNotes || [],
    };
    return { ...EMPTY_CAMPAIGN, clientId: defaultClientId || '' };
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const setMetric = (key, val) => setForm(prev => ({ ...prev, targetMetrics: { ...prev.targetMetrics, [key]: val } }));

  const togglePlatform = (p) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p) ? prev.platforms.filter(x => x !== p) : [...prev.platforms, p],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.clientId) e.clientId = 'Required';
    if (!form.name.trim()) e.name = 'Required';
    if (!form.objective) e.objective = 'Required';
    if (!form.type) e.type = 'Required';
    if (form.platforms.length === 0) e.platforms = 'Select at least one';
    if (!form.startDate) e.startDate = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, keyMessages: form.keyMessages.filter(m => m.trim()) });
  };

  const fieldClass = (key) =>
    `w-full bg-[#12121A] border ${errors[key] ? 'border-red-500' : 'border-[#2A2A3A]'} rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Client *</label>
          <select className={fieldClass('clientId')} value={form.clientId} onChange={e => set('clientId', e.target.value)}>
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.clientId && <p className="text-xs text-red-400 mt-1">{errors.clientId}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Campaign Name *</label>
          <input className={fieldClass('name')} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Summer Launch Campaign" />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Objective *</label>
          <select className={fieldClass('objective')} value={form.objective} onChange={e => set('objective', e.target.value)}>
            <option value="">Select objective</option>
            {CAMPAIGN_OBJECTIVES.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {errors.objective && <p className="text-xs text-red-400 mt-1">{errors.objective}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Campaign Type *</label>
          <select className={fieldClass('type')} value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="">Select type</option>
            {CAMPAIGN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.type && <p className="text-xs text-red-400 mt-1">{errors.type}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Status</label>
          <select className={fieldClass('status')} value={form.status} onChange={e => set('status', e.target.value)}>
            {CAMPAIGN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Budget (Allocated)</label>
          <input className={fieldClass('budget')} type="number" value={form.budget} onChange={e => set('budget', e.target.value)} placeholder="e.g. 5000" />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Budget Spent</label>
          <input className={fieldClass('budgetSpent')} type="number" value={form.budgetSpent} onChange={e => set('budgetSpent', e.target.value)} placeholder="e.g. 2000" />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Start Date *</label>
          <input className={fieldClass('startDate')} type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} />
          {errors.startDate && <p className="text-xs text-red-400 mt-1">{errors.startDate}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">End Date</label>
          <input className={fieldClass('endDate')} type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} />
        </div>
      </div>

      {/* Platforms */}
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-2">Platforms *</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button key={p} type="button" onClick={() => togglePlatform(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                form.platforms.includes(p)
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#12121A] text-[#6B7280] border border-[#2A2A3A] hover:text-white hover:border-[#3A3A4A]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        {errors.platforms && <p className="text-xs text-red-400 mt-1">{errors.platforms}</p>}
      </div>

      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Description</label>
        <textarea className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors resize-none" rows={4} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Campaign brief and overview..." />
      </div>

      {/* Key Messages */}
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-2">Key Messages</label>
        <div className="space-y-2">
          {form.keyMessages.map((msg, i) => (
            <div key={i} className="flex gap-2">
              <input className="flex-1 bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors" value={msg} onChange={e => { const m = [...form.keyMessages]; m[i] = e.target.value; set('keyMessages', m); }} placeholder="Key message..." />
              {form.keyMessages.length > 1 && (
                <button type="button" onClick={() => set('keyMessages', form.keyMessages.filter((_, idx) => idx !== i))} className="text-[#6B7280] hover:text-red-400 transition-colors p-2"><X size={14} /></button>
              )}
            </div>
          ))}
          <button type="button" onClick={() => set('keyMessages', [...form.keyMessages, ''])} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"><Plus size={12} /> Add message</button>
        </div>
      </div>

      {/* Target Metrics */}
      <h3 className="text-sm font-semibold text-white/90">Target Metrics</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Target Reach</label>
          <input className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors" type="number" value={form.targetMetrics.reach} onChange={e => setMetric('reach', e.target.value)} placeholder="e.g. 500000" />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Target Engagement %</label>
          <input className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors" type="number" step="0.1" value={form.targetMetrics.engagement} onChange={e => setMetric('engagement', e.target.value)} placeholder="e.g. 4.5" />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Target Conversions</label>
          <input className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors" type="number" value={form.targetMetrics.conversions} onChange={e => setMetric('conversions', e.target.value)} placeholder="e.g. 2000" />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Notes</label>
        <textarea className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2">
          <Check size={15} /> {initial ? 'Update Campaign' : 'Create Campaign'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-[#1A1A26] border border-[#2A2A3A] text-[#9CA3AF] hover:text-white text-sm rounded-md transition-colors">Cancel</button>
      </div>
    </form>
  );
}

/* ─── Campaign Detail (slide-in panel style) ─── */
function CampaignDetail({ campaign, onBack, onNavigate, isPanel = false, onClose }) {
  const store = useStore();
  const [editing, setEditing] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const client = store.clients.find(c => c.id === campaign.clientId);
  const campaignPosts = store.posts.filter(p => p.campaignId === campaign.id);
  const color = client ? getClientColor(client.id) : '#6B7280';

  const daysActive = campaign.startDate ? differenceInDays(new Date(), parseISO(campaign.startDate)) : 0;

  const nextScheduledPost = campaignPosts
    .filter(p => p.status === 'Scheduled' && p.scheduledDate)
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];

  const handleUpdate = (data) => {
    store.updateCampaign(campaign.id, data);
    store.addActivity({ type: 'campaign_updated', message: `Updated campaign: ${data.name || campaign.name}`, clientId: campaign.clientId, entityId: campaign.id });
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete "${campaign.name}"? This cannot be undone.`)) {
      store.deleteCampaign(campaign.id);
      if (isPanel && onClose) onClose();
      else onBack();
    }
  };

  const handleDuplicate = () => {
    const dup = {
      ...campaign,
      name: `${campaign.name} (Copy)`,
      status: 'Planning',
      budgetSpent: 0,
      performanceNotes: [],
    };
    delete dup.id;
    delete dup.createdAt;
    delete dup.updatedAt;
    const newCampaign = store.addCampaign(dup);
    store.addActivity({ type: 'campaign_created', message: `Duplicated campaign: ${campaign.name}`, clientId: campaign.clientId, entityId: newCampaign.id });
  };

  const handleAISend = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg = aiInput.trim();
    setAiInput('');
    setAiMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setAiLoading(true);

    const systemPrompt = `You are the Bear Witness Campaign Advisor. You are advising on the campaign "${campaign.name}" for client "${client?.name || 'Unknown'}".

Campaign Details:
- Objective: ${campaign.objective}
- Type: ${campaign.type}
- Status: ${campaign.status}
- Platforms: ${campaign.platforms.join(', ')}
- Budget: ${campaign.budget || 'Not set'} (Spent: ${campaign.budgetSpent || 0})
- Timeline: ${campaign.startDate} to ${campaign.endDate || 'Ongoing'}
- Description: ${campaign.description || 'None'}
- Key Messages: ${(campaign.keyMessages || []).join('; ')}
- Target Metrics: Reach ${campaign.targetMetrics?.reach || 'N/A'}, Engagement ${campaign.targetMetrics?.engagement || 'N/A'}%, Conversions ${campaign.targetMetrics?.conversions || 'N/A'}
- Posts created: ${campaignPosts.length} (${campaignPosts.filter(p => p.status === 'Published').length} published)

Provide specific, actionable campaign advice. Be direct.`;

    try {
      const context = aiMessages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const response = await callAI({ system: systemPrompt, user: context ? `${context}\nUser: ${userMsg}` : userMsg, maxTokens: 1024 });
      setAiMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setAiLoading(false);
    }
  };

  const statusConfig = {
    Planning: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
    Active: { color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    Paused: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    Complete: { color: 'text-[#9CA3AF]', bg: 'bg-[#12121A]' },
    Cancelled: { color: 'text-red-400', bg: 'bg-red-500/10' },
  };

  const sc = statusConfig[campaign.status] || statusConfig.Planning;

  if (editing) {
    return (
      <div className={isPanel ? '' : 'max-w-[800px]'}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setEditing(false)} className="text-[#6B7280] hover:text-white transition-colors p-1"><ArrowLeft size={18} /></button>
          <h2 className="text-lg font-semibold text-white/90">Edit Campaign</h2>
        </div>
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-6">
          <CampaignForm initial={campaign} clients={store.clients} onSave={handleUpdate} onCancel={() => setEditing(false)} />
        </div>
      </div>
    );
  }

  return (
    <div className={isPanel ? '' : 'max-w-[1000px]'}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {!isPanel && <button onClick={onBack} className="text-[#6B7280] hover:text-white transition-colors p-1"><ArrowLeft size={18} /></button>}
        <div className="flex-1 min-w-0">
          <h2 className={`${isPanel ? 'text-base' : 'text-lg'} font-semibold text-white/90`}>{campaign.name}</h2>
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            {client && (
              <button onClick={() => onNavigate('client-hub', { clientId: client.id })} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: `${color}30`, color }}>{getInitials(client.name)}</div>
                {client.name}
              </button>
            )}
            <span>-</span>
            <span>{campaign.objective}</span>
            <span>-</span>
            <span>{campaign.type}</span>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sc.color} ${sc.bg}`}>{campaign.status}</span>
        <button onClick={() => setEditing(true)} className="p-2 text-[#6B7280] hover:text-white transition-colors rounded-md hover:bg-white/5" title="Edit"><Edit3 size={15} /></button>
        <button onClick={handleDuplicate} className="p-2 text-[#6B7280] hover:text-blue-400 transition-colors rounded-md hover:bg-white/5" title="Duplicate"><Copy size={15} /></button>
        <button onClick={() => setShowAI(!showAI)} className={`p-2 transition-colors rounded-md hover:bg-white/5 ${showAI ? 'text-emerald-400' : 'text-[#6B7280] hover:text-white'}`} title="AI Advisor"><Brain size={15} /></button>
        <button onClick={handleDelete} className="p-2 text-[#6B7280] hover:text-red-400 transition-colors rounded-md hover:bg-white/5" title="Delete"><Trash2 size={15} /></button>
        {isPanel && onClose && (
          <button onClick={onClose} className="p-2 text-[#6B7280] hover:text-white transition-colors rounded-md hover:bg-white/5" title="Close"><X size={15} /></button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`${showAI ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-6`}>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Calendar size={13} className="text-[#6B7280]" />
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Timeline</span>
              </div>
              <div className="text-sm text-white/90">{campaign.startDate ? formatDate(campaign.startDate) : 'TBD'}</div>
              <div className="text-xs text-[#6B7280]">to {campaign.endDate ? formatDate(campaign.endDate) : 'Ongoing'}</div>
            </div>
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={13} className="text-[#6B7280]" />
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Days Active</span>
              </div>
              <div className="text-sm text-white/90">{daysActive > 0 ? `${daysActive} day${daysActive !== 1 ? 's' : ''}` : 'Not started'}</div>
            </div>
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target size={13} className="text-[#6B7280]" />
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Target Reach</span>
              </div>
              <div className="text-sm text-white/90">{campaign.targetMetrics?.reach ? Number(campaign.targetMetrics.reach).toLocaleString() : 'N/A'}</div>
            </div>
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 size={13} className="text-[#6B7280]" />
                <span className="text-[10px] text-[#6B7280] uppercase tracking-wider">Posts</span>
              </div>
              <div className="text-sm text-white/90">{campaignPosts.filter(p => p.status === 'Published').length} / {campaignPosts.length}</div>
              <div className="text-xs text-[#6B7280]">published</div>
            </div>
          </div>

          {/* Budget Tracking */}
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4">
            <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
              <DollarSign size={13} /> Budget Tracking
            </h3>
            <BudgetBar allocated={campaign.budget} spent={campaign.budgetSpent} />
          </div>

          {/* Description */}
          {campaign.description && (
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4">
              <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Description</h3>
              <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{campaign.description}</p>
            </div>
          )}

          {/* Key Messages & Platforms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4">
              <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Key Messages</h3>
              {(campaign.keyMessages || []).length > 0 ? (
                <ul className="space-y-1.5">
                  {campaign.keyMessages.map((m, i) => (
                    <li key={i} className="text-sm text-[#9CA3AF] flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">-</span> {m}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-[#6B7280]">None defined</p>}
            </div>
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4">
              <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Platforms</h3>
              <div className="flex flex-wrap gap-2">
                {campaign.platforms.map(p => (
                  <span key={p} className="text-xs bg-[#12121A] text-[#9CA3AF] px-2 py-1 rounded border border-[#2A2A3A]">{p}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Notes Timeline */}
          <PerformanceNotes campaign={campaign} />

          {/* Posts */}
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A3A]">
              <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">Campaign Posts</h3>
              <button onClick={() => onNavigate('content-calendar', { action: 'add', campaignId: campaign.id, clientId: campaign.clientId })} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
                <Plus size={12} /> Add Post
              </button>
            </div>
            {campaignPosts.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-[#6B7280]">No posts created for this campaign yet</p>
              </div>
            ) : (
              <div className="divide-y divide-[#2A2A3A]">
                {campaignPosts.map(post => (
                  <div
                    key={post.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => onNavigate('content-calendar', { postId: post.id })}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/90 truncate">{post.title}</div>
                      <div className="text-xs text-[#6B7280]">{post.platform} - {post.type} - {post.scheduledDate ? formatDate(post.scheduledDate) : 'No date'}</div>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                      post.status === 'Published' ? 'text-emerald-400 bg-emerald-500/10' :
                      post.status === 'Scheduled' ? 'text-blue-400 bg-blue-500/10' :
                      post.status === 'Draft' ? 'text-[#6B7280] bg-[#12121A]' :
                      'text-yellow-400 bg-yellow-500/10'
                    }`}>{post.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {campaign.notes && (
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4">
              <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Notes</h3>
              <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{campaign.notes}</p>
            </div>
          )}
        </div>

        {/* AI Advisor Panel */}
        {showAI && (
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg flex flex-col h-[600px]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2A2A3A]">
              <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-2">
                <Brain size={13} className="text-emerald-400" /> Campaign Advisor
              </h3>
              <button onClick={() => setShowAI(false)} className="text-[#6B7280] hover:text-white transition-colors"><X size={14} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {aiMessages.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-[#6B7280]">Ask about strategy, optimization, or content ideas for this campaign.</p>
                </div>
              )}
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-500/20'
                      : 'bg-[#12121A] text-[#9CA3AF] border border-[#2A2A3A]'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#12121A] border border-[#2A2A3A] rounded-lg px-3 py-2 flex items-center gap-2">
                    <Loader2 size={13} className="text-emerald-400 animate-spin" />
                    <span className="text-xs text-[#6B7280]">Thinking...</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-3 border-t border-[#2A2A3A] flex gap-2">
              <input
                className="flex-1 bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors"
                placeholder="Ask about this campaign..."
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAISend()}
                disabled={aiLoading}
              />
              <button onClick={handleAISend} disabled={aiLoading || !aiInput.trim()} className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-[#1A1A26] disabled:text-[#6B7280] text-white text-sm rounded-md transition-colors">
                <Send size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Sortable Table Header ─── */
function SortHeader({ label, sortKey, currentSort, onSort }) {
  const isActive = currentSort.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  return (
    <th
      className="text-left px-4 py-3 text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold cursor-pointer hover:text-white transition-colors select-none"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="inline-flex flex-col leading-none">
          {isActive ? (
            direction === 'asc' ? <ArrowUp size={10} className="text-emerald-400" /> : <ArrowDown size={10} className="text-emerald-400" />
          ) : (
            <span className="text-[#3A3A4A]"><ArrowUp size={10} /></span>
          )}
        </span>
      </div>
    </th>
  );
}

/* ─── Bulk Status Change Dropdown ─── */
function BulkStatusDropdown({ selectedIds, onStatusChange, onClear }) {
  const [open, setOpen] = useState(false);

  if (selectedIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2 bg-[#222233] border border-emerald-500/30 rounded-md px-3 py-1.5">
      <span className="text-xs text-emerald-400 font-medium">{selectedIds.length} selected</span>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-white/90 bg-[#1A1A26] border border-[#2A2A3A] rounded px-2.5 py-1 flex items-center gap-1 hover:border-[#3A3A4A] transition-colors"
        >
          Change Status <ChevronDown size={11} />
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 bg-[#1A1A26] border border-[#2A2A3A] rounded-md shadow-lg z-20 min-w-[120px]">
            {CAMPAIGN_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { onStatusChange(s); setOpen(false); }}
                className="block w-full text-left px-3 py-1.5 text-xs text-[#9CA3AF] hover:text-white hover:bg-white/5 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <button onClick={onClear} className="text-[#6B7280] hover:text-white transition-colors">
        <X size={13} />
      </button>
    </div>
  );
}

/* ─── Main Export ─── */
export default function CampaignCommand({ onNavigate, params }) {
  const store = useStore();
  const [view, setView] = useState('kanban');
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [panelCampaign, setPanelCampaign] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [displayMode, setDisplayMode] = useState('kanban');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState([]);

  // Handle incoming params
  useEffect(() => {
    if (params?.action === 'add') {
      setView('add');
    } else if (params?.campaignId) {
      const camp = store.campaigns.find(c => c.id === params.campaignId);
      if (camp) { setSelectedCampaign(camp); setView('detail'); }
    }
  }, [params, store.campaigns]);

  // Keep selected in sync
  useEffect(() => {
    if (selectedCampaign) {
      const updated = store.campaigns.find(c => c.id === selectedCampaign.id);
      if (updated) setSelectedCampaign(updated);
    }
  }, [store.campaigns, selectedCampaign]);

  // Keep panel campaign in sync
  useEffect(() => {
    if (panelCampaign) {
      const updated = store.campaigns.find(c => c.id === panelCampaign.id);
      if (updated) setPanelCampaign(updated);
      else setPanelCampaign(null);
    }
  }, [store.campaigns, panelCampaign]);

  const filteredCampaigns = useMemo(() => {
    return store.campaigns.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (clientFilter !== 'all' && c.clientId !== clientFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [store.campaigns, searchQuery, statusFilter, clientFilter]);

  const sortedCampaigns = useMemo(() => {
    const sorted = [...filteredCampaigns];
    sorted.sort((a, b) => {
      let valA, valB;
      switch (sortConfig.key) {
        case 'name':
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case 'client': {
          const clientA = store.clients.find(c => c.id === a.clientId);
          const clientB = store.clients.find(c => c.id === b.clientId);
          valA = (clientA?.name || '').toLowerCase();
          valB = (clientB?.name || '').toLowerCase();
          break;
        }
        case 'platform':
          valA = (a.platforms || [])[0] || '';
          valB = (b.platforms || [])[0] || '';
          break;
        case 'status':
          valA = a.status;
          valB = b.status;
          break;
        case 'budget':
          valA = Number(a.budget) || 0;
          valB = Number(b.budget) || 0;
          break;
        case 'startDate':
          valA = a.startDate || '';
          valB = b.startDate || '';
          break;
        default:
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredCampaigns, sortConfig, store.clients]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  }, []);

  const handleAddCampaign = (data) => {
    const campaign = store.addCampaign(data);
    const client = store.clients.find(c => c.id === data.clientId);
    store.addActivity({ type: 'campaign_created', message: `Created campaign: ${data.name} for ${client?.name || 'unknown'}`, clientId: data.clientId, entityId: campaign.id });
    setSelectedCampaign(campaign);
    setView('detail');
  };

  const handleDragStart = (e, campaignId) => {
    e.dataTransfer.setData('campaignId', campaignId);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const campaignId = e.dataTransfer.getData('campaignId');
    if (campaignId) {
      store.updateCampaign(campaignId, { status: newStatus });
      store.addActivity({ type: 'campaign_updated', message: `Moved campaign to ${newStatus}`, entityId: campaignId });
    }
  };

  const handleDragOver = (e) => e.preventDefault();

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === sortedCampaigns.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedCampaigns.map(c => c.id));
    }
  };

  const handleBulkStatusChange = (newStatus) => {
    selectedIds.forEach(id => {
      store.updateCampaign(id, { status: newStatus });
      store.addActivity({ type: 'campaign_updated', message: `Bulk status change to ${newStatus}`, entityId: id });
    });
    setSelectedIds([]);
  };

  const handleDuplicateCampaign = (camp, e) => {
    e.stopPropagation();
    const dup = {
      ...camp,
      name: `${camp.name} (Copy)`,
      status: 'Planning',
      budgetSpent: 0,
      performanceNotes: [],
    };
    delete dup.id;
    delete dup.createdAt;
    delete dup.updatedAt;
    const newCampaign = store.addCampaign(dup);
    store.addActivity({ type: 'campaign_created', message: `Duplicated campaign: ${camp.name}`, clientId: camp.clientId, entityId: newCampaign.id });
  };

  const openCampaignPanel = (camp) => {
    if (displayMode === 'list') {
      setPanelCampaign(camp);
    } else {
      setSelectedCampaign(camp);
      setView('detail');
    }
  };

  if (view === 'add') {
    return (
      <div className="max-w-[800px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView(displayMode)} className="text-[#6B7280] hover:text-white transition-colors p-1"><ArrowLeft size={18} /></button>
          <h2 className="text-lg font-semibold text-white/90">Create Campaign</h2>
        </div>
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-6">
          <CampaignForm clients={store.clients} onSave={handleAddCampaign} onCancel={() => setView(displayMode)} defaultClientId={params?.clientId} />
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedCampaign) {
    return (
      <CampaignDetail
        campaign={selectedCampaign}
        onBack={() => { setView(displayMode); setSelectedCampaign(null); }}
        onNavigate={onNavigate}
      />
    );
  }

  // Kanban / List View with optional slide-in panel
  return (
    <div className="flex gap-0">
      <div className={`flex-1 min-w-0 transition-all duration-300 ${panelCampaign ? 'mr-[420px]' : ''}`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white/90">Campaigns</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#1A1A26] border border-[#2A2A3A] rounded-md overflow-hidden">
              <button onClick={() => { setDisplayMode('kanban'); setView('kanban'); setPanelCampaign(null); setSelectedIds([]); }} className={`px-3 py-1.5 text-xs transition-colors ${displayMode === 'kanban' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#6B7280] hover:text-white'}`}>
                <LayoutGrid size={14} />
              </button>
              <button onClick={() => { setDisplayMode('list'); setView('list'); }} className={`px-3 py-1.5 text-xs transition-colors ${displayMode === 'list' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#6B7280] hover:text-white'}`}>
                <List size={14} />
              </button>
            </div>
            <button onClick={() => setView('add')} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2">
              <Plus size={15} /> Create Campaign
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <div className="flex items-center gap-2 bg-[#1A1A26] border border-[#2A2A3A] rounded-md px-3 py-2 w-[250px]">
            <Search size={14} className="text-[#6B7280] flex-shrink-0" />
            <input className="bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-[#6B7280] w-full p-0" placeholder="Search campaigns..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <select className="bg-[#1A1A26] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-[#9CA3AF] outline-none" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
            <option value="all">All Clients</option>
            {store.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {displayMode === 'list' && (
            <select className="bg-[#1A1A26] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-[#9CA3AF] outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {CAMPAIGN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <BulkStatusDropdown
            selectedIds={selectedIds}
            onStatusChange={handleBulkStatusChange}
            onClear={() => setSelectedIds([])}
          />
        </div>

        {/* Kanban View */}
        {displayMode === 'kanban' && (
          <div className="grid grid-cols-4 gap-4 min-h-[500px]">
            {KANBAN_COLUMNS.map(status => {
              const columnCampaigns = filteredCampaigns.filter(c => c.status === status);
              const columnColors = {
                Planning: 'text-blue-400 border-blue-500/30',
                Active: 'text-emerald-400 border-emerald-500/30',
                Paused: 'text-yellow-400 border-yellow-500/30',
                Complete: 'text-[#9CA3AF] border-[#3A3A4A]',
              };
              const cc = columnColors[status];
              return (
                <div
                  key={status}
                  className="bg-[#12121A] rounded-lg border border-[#2A2A3A] flex flex-col"
                  onDragOver={handleDragOver}
                  onDrop={e => handleDrop(e, status)}
                >
                  <div className={`px-3 py-2.5 border-b ${cc} flex items-center justify-between`}>
                    <span className="text-xs font-semibold uppercase tracking-wider">{status}</span>
                    <span className="text-[10px] text-[#6B7280] bg-[#1A1A26] px-1.5 py-0.5 rounded">{columnCampaigns.length}</span>
                  </div>
                  <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                    {columnCampaigns.map(camp => {
                      const client = store.clients.find(c => c.id === camp.clientId);
                      const dActive = camp.startDate ? differenceInDays(new Date(), parseISO(camp.startDate)) : 0;
                      const campPosts = store.posts.filter(p => p.campaignId === camp.id);
                      const nextPost = campPosts
                        .filter(p => p.status === 'Scheduled' && p.scheduledDate)
                        .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];

                      return (
                        <div
                          key={camp.id}
                          draggable
                          onDragStart={e => handleDragStart(e, camp.id)}
                          onClick={() => { setSelectedCampaign(camp); setView('detail'); }}
                          className="bg-[#1A1A26] border border-[#2A2A3A] rounded-md p-3 cursor-pointer hover:border-[rgba(16,185,129,0.3)] transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <GripVertical size={12} className="text-[#6B7280] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
                              <span className="text-[10px] text-[#6B7280]">{client?.name}</span>
                            </div>
                            <button
                              onClick={(e) => handleDuplicateCampaign(camp, e)}
                              className="text-[#6B7280] hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all"
                              title="Duplicate"
                            >
                              <Copy size={11} />
                            </button>
                          </div>
                          <div className="text-sm text-white/90 font-medium mb-1">{camp.name}</div>
                          <div className="text-xs text-[#6B7280] mb-2">{camp.objective}</div>

                          {/* Days active */}
                          {dActive > 0 && (
                            <div className="flex items-center gap-1 text-[10px] text-[#6B7280] mb-1.5">
                              <Clock size={10} /> {dActive}d active
                            </div>
                          )}

                          {/* Next scheduled post */}
                          {nextPost && (
                            <div className="flex items-center gap-1 text-[10px] text-blue-400 mb-1.5">
                              <Calendar size={10} /> Next: {format(new Date(nextPost.scheduledDate), 'd MMM')}
                            </div>
                          )}

                          {/* Mini budget bar */}
                          {camp.budget && Number(camp.budget) > 0 && (
                            <div className="mb-2">
                              <BudgetBar allocated={camp.budget} spent={camp.budgetSpent} showLabel={false} mini />
                              <div className="text-[9px] text-[#6B7280] mt-0.5">
                                {"\u00A3"}{Number(camp.budgetSpent || 0).toLocaleString()} / {"\u00A3"}{Number(camp.budget).toLocaleString()}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1">
                            {camp.platforms.slice(0, 2).map(p => (
                              <span key={p} className="text-[9px] bg-[#12121A] text-[#9CA3AF] px-1.5 py-0.5 rounded">{p}</span>
                            ))}
                            {camp.platforms.length > 2 && <span className="text-[9px] text-[#6B7280]">+{camp.platforms.length - 2}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {displayMode === 'list' && (
          <div>
            {sortedCampaigns.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone size={32} className="text-[#6B7280] mx-auto mb-3" />
                <p className="text-sm text-[#6B7280]">No campaigns match your filters</p>
              </div>
            ) : (
              <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A2A3A]">
                      <th className="w-10 px-3 py-3">
                        <button onClick={toggleSelectAll} className="text-[#6B7280] hover:text-white transition-colors">
                          {selectedIds.length === sortedCampaigns.length && sortedCampaigns.length > 0 ? <CheckSquare size={14} className="text-emerald-400" /> : <Square size={14} />}
                        </button>
                      </th>
                      <SortHeader label="Campaign" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
                      <SortHeader label="Client" sortKey="client" currentSort={sortConfig} onSort={handleSort} />
                      <SortHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                      <SortHeader label="Platform" sortKey="platform" currentSort={sortConfig} onSort={handleSort} />
                      <SortHeader label="Budget" sortKey="budget" currentSort={sortConfig} onSort={handleSort} />
                      <SortHeader label="Start Date" sortKey="startDate" currentSort={sortConfig} onSort={handleSort} />
                      <th className="w-16 px-2 py-3 text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2A3A]">
                    {sortedCampaigns.map(camp => {
                      const client = store.clients.find(c => c.id === camp.clientId);
                      const isSelected = selectedIds.includes(camp.id);
                      const sc2 = {
                        Planning: 'text-blue-400 bg-blue-500/10',
                        Active: 'text-emerald-400 bg-emerald-500/10',
                        Paused: 'text-yellow-400 bg-yellow-500/10',
                        Complete: 'text-[#9CA3AF] bg-[#12121A]',
                        Cancelled: 'text-red-400 bg-red-500/10',
                      }[camp.status] || '';
                      const budgetPct = camp.budget && Number(camp.budget) > 0 ? Math.round((Number(camp.budgetSpent || 0) / Number(camp.budget)) * 100) : null;
                      const budgetColor = budgetPct !== null ? (budgetPct < 70 ? 'text-emerald-400' : budgetPct < 90 ? 'text-yellow-400' : 'text-red-400') : 'text-[#6B7280]';

                      return (
                        <tr
                          key={camp.id}
                          className={`hover:bg-white/[0.02] transition-colors cursor-pointer ${isSelected ? 'bg-emerald-500/5' : ''}`}
                          onClick={() => openCampaignPanel(camp)}
                        >
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <button onClick={() => toggleSelect(camp.id)} className="text-[#6B7280] hover:text-white transition-colors">
                              {isSelected ? <CheckSquare size={14} className="text-emerald-400" /> : <Square size={14} />}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-white/90 font-medium">{camp.name}</div>
                            <div className="text-xs text-[#6B7280]">{camp.objective}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#9CA3AF]">{client?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${sc2}`}>{camp.status}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {camp.platforms.slice(0, 2).map(p => (
                                <span key={p} className="text-[10px] bg-[#12121A] text-[#9CA3AF] px-1.5 py-0.5 rounded">{p}</span>
                              ))}
                              {camp.platforms.length > 2 && <span className="text-[10px] text-[#6B7280]">+{camp.platforms.length - 2}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {camp.budget ? (
                              <div>
                                <span className={`text-xs font-medium ${budgetColor}`}>
                                  {"\u00A3"}{Number(camp.budget).toLocaleString()}
                                </span>
                                {budgetPct !== null && (
                                  <div className="w-16 mt-1">
                                    <BudgetBar allocated={camp.budget} spent={camp.budgetSpent} showLabel={false} mini />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-[#6B7280]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#6B7280]">{camp.startDate ? formatDate(camp.startDate) : '-'}</td>
                          <td className="px-2 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => handleDuplicateCampaign(camp, e)}
                                className="p-1 text-[#6B7280] hover:text-blue-400 transition-colors"
                                title="Duplicate"
                              >
                                <Copy size={13} />
                              </button>
                              <button
                                onClick={() => openCampaignPanel(camp)}
                                className="p-1 text-[#6B7280] hover:text-white transition-colors"
                                title="View details"
                              >
                                <ChevronRight size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Slide-in Detail Panel */}
      {panelCampaign && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setPanelCampaign(null)} />
          {/* Panel */}
          <div className="fixed top-0 right-0 bottom-0 w-[420px] bg-[#0A0A0F] border-l border-[#2A2A3A] z-40 overflow-y-auto shadow-2xl animate-in slide-in-from-right">
            <div className="p-5">
              <CampaignDetail
                campaign={panelCampaign}
                onBack={() => setPanelCampaign(null)}
                onNavigate={onNavigate}
                isPanel
                onClose={() => setPanelCampaign(null)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
