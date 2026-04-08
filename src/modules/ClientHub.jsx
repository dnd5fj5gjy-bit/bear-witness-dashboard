import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import {
  Users, Plus, Search, ChevronRight, ArrowLeft, Edit3, Trash2,
  Globe, Mail, Phone, ExternalLink, Megaphone, Calendar,
  BookOpen, Brain, MessageSquare, Send, X, Check, Filter,
  Building2, Tag, AlertCircle, Loader2,
} from 'lucide-react';
import {
  getInitials, getClientColor, formatDate, relativeTime,
  SECTORS, PLATFORMS, BUDGET_RANGES, PARTNERSHIP_TYPES, CLIENT_STATUSES, PRIORITIES,
} from '../lib/utils';
import { callAI } from '../lib/ai';

const EMPTY_CLIENT = {
  name: '', sector: '', platforms: [], partnershipType: '',
  status: 'Active', budgetRange: '', priority: 'Medium',
  contactName: '', contactEmail: '', contactPhone: '',
  website: '', socialHandles: { instagram: '', tiktok: '', youtube: '', linkedin: '', twitter: '' },
  brandVoice: '', targetAudience: '', keyMessages: [''],
  goals: '', notes: '',
};

function ClientForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_CLIENT);
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));
  const setSocial = (key, val) => setForm(prev => ({
    ...prev, socialHandles: { ...prev.socialHandles, [key]: val },
  }));

  const togglePlatform = (p) => {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(p)
        ? prev.platforms.filter(x => x !== p)
        : [...prev.platforms, p],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.sector) e.sector = 'Required';
    if (form.platforms.length === 0) e.platforms = 'Select at least one';
    if (!form.partnershipType) e.partnershipType = 'Required';
    if (!form.contactName.trim()) e.contactName = 'Required';
    if (form.contactEmail && !/\S+@\S+\.\S+/.test(form.contactEmail)) e.contactEmail = 'Invalid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      ...form,
      keyMessages: form.keyMessages.filter(m => m.trim()),
    });
  };

  const addKeyMessage = () => set('keyMessages', [...form.keyMessages, '']);
  const updateKeyMessage = (i, val) => {
    const msgs = [...form.keyMessages];
    msgs[i] = val;
    set('keyMessages', msgs);
  };
  const removeKeyMessage = (i) => {
    const msgs = form.keyMessages.filter((_, idx) => idx !== i);
    set('keyMessages', msgs.length ? msgs : ['']);
  };

  const fieldClass = (key) =>
    `w-full bg-[#12121A] border ${errors[key] ? 'border-red-500' : 'border-[#2A2A3A]'} rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors`;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Company name */}
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Company / Brand Name *</label>
          <input className={fieldClass('name')} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ted's Health" />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
        </div>

        {/* Sector */}
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Sector *</label>
          <select className={fieldClass('sector')} value={form.sector} onChange={e => set('sector', e.target.value)}>
            <option value="">Select sector</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.sector && <p className="text-xs text-red-400 mt-1">{errors.sector}</p>}
        </div>

        {/* Partnership Type */}
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Partnership Type *</label>
          <select className={fieldClass('partnershipType')} value={form.partnershipType} onChange={e => set('partnershipType', e.target.value)}>
            <option value="">Select type</option>
            {PARTNERSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.partnershipType && <p className="text-xs text-red-400 mt-1">{errors.partnershipType}</p>}
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Status</label>
          <select className={fieldClass('status')} value={form.status} onChange={e => set('status', e.target.value)}>
            {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Budget */}
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Budget Range</label>
          <select className={fieldClass('budgetRange')} value={form.budgetRange} onChange={e => set('budgetRange', e.target.value)}>
            <option value="">Select range</option>
            {BUDGET_RANGES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Priority</label>
          <select className={fieldClass('priority')} value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Platforms */}
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-2">Platforms *</label>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map(p => (
            <button
              key={p} type="button"
              onClick={() => togglePlatform(p)}
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

      <hr className="border-[#2A2A3A]" />

      {/* Contact info */}
      <h3 className="text-sm font-semibold text-white/90">Contact Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Contact Name *</label>
          <input className={fieldClass('contactName')} value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Full name" />
          {errors.contactName && <p className="text-xs text-red-400 mt-1">{errors.contactName}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Email</label>
          <input className={fieldClass('contactEmail')} type="email" value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="email@company.com" />
          {errors.contactEmail && <p className="text-xs text-red-400 mt-1">{errors.contactEmail}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Phone</label>
          <input className={fieldClass('contactPhone')} value={form.contactPhone} onChange={e => set('contactPhone', e.target.value)} placeholder="+44..." />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Website</label>
          <input className={fieldClass('website')} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
        </div>
      </div>

      {/* Social Handles */}
      <h3 className="text-sm font-semibold text-white/90">Social Handles</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Object.keys(form.socialHandles).map(platform => (
          <div key={platform}>
            <label className="block text-xs text-[#9CA3AF] mb-1.5 capitalize">{platform}</label>
            <input
              className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors"
              value={form.socialHandles[platform]}
              onChange={e => setSocial(platform, e.target.value)}
              placeholder={`@${platform}handle`}
            />
          </div>
        ))}
      </div>

      <hr className="border-[#2A2A3A]" />

      {/* Brand & Strategy */}
      <h3 className="text-sm font-semibold text-white/90">Brand & Strategy</h3>
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Brand Voice</label>
        <textarea className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors resize-none" rows={3} value={form.brandVoice} onChange={e => set('brandVoice', e.target.value)} placeholder="Describe the brand's tone and voice..." />
      </div>
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Target Audience</label>
        <textarea className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors resize-none" rows={3} value={form.targetAudience} onChange={e => set('targetAudience', e.target.value)} placeholder="Demographics, interests, markets..." />
      </div>

      {/* Key Messages */}
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-2">Key Messages</label>
        <div className="space-y-2">
          {form.keyMessages.map((msg, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="flex-1 bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors"
                value={msg}
                onChange={e => updateKeyMessage(i, e.target.value)}
                placeholder="Key message..."
              />
              {form.keyMessages.length > 1 && (
                <button type="button" onClick={() => removeKeyMessage(i)} className="text-[#6B7280] hover:text-red-400 transition-colors p-2">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button type="button" onClick={addKeyMessage} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
            <Plus size={12} /> Add message
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Goals</label>
        <textarea className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors resize-none" rows={3} value={form.goals} onChange={e => set('goals', e.target.value)} placeholder="Business and social media goals..." />
      </div>
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Notes</label>
        <textarea className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2">
          <Check size={15} /> {initial ? 'Update Client' : 'Add Client'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-[#1A1A26] border border-[#2A2A3A] text-[#9CA3AF] hover:text-white text-sm rounded-md transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

function AIAdvisor({ client }) {
  const { getClientCampaigns, getClientPosts, getClientResearch } = useStore();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const campaigns = getClientCampaigns(client.id);
  const posts = getClientPosts(client.id);
  const research = getClientResearch(client.id);

  const systemPrompt = `You are the Bear Witness AI Advisor — an expert social media strategist. You are advising on the client "${client.name}".

Client Details:
- Sector: ${client.sector}
- Platforms: ${client.platforms.join(', ')}
- Partnership Type: ${client.partnershipType}
- Brand Voice: ${client.brandVoice || 'Not defined'}
- Target Audience: ${client.targetAudience || 'Not defined'}
- Key Messages: ${(client.keyMessages || []).join('; ')}
- Goals: ${client.goals || 'Not defined'}

Active Campaigns: ${campaigns.map(c => `${c.name} (${c.status})`).join(', ') || 'None'}
Recent Posts: ${posts.slice(0, 5).map(p => `${p.title} [${p.platform}] (${p.status})`).join(', ') || 'None'}
Research Notes: ${research.slice(0, 3).map(r => r.title).join(', ') || 'None'}

Provide specific, actionable advice. Be direct and concise. Reference the client data when relevant.`;

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const conversationContext = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const fullPrompt = conversationContext ? `${conversationContext}\nUser: ${userMsg}` : userMsg;
      const response = await callAI({ system: systemPrompt, user: fullPrompt, maxTokens: 1024 });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px]">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 p-1">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Brain size={32} className="text-[#6B7280] mx-auto mb-3" />
            <p className="text-sm text-[#6B7280]">Ask me anything about {client.name}.</p>
            <p className="text-xs text-[#6B7280] mt-1">I have full context on this client's data, campaigns, and research.</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {['What content strategy would you recommend?', 'Analyse our campaign performance', 'Suggest 5 post ideas'].map(q => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-xs bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-1.5 text-[#9CA3AF] hover:text-white hover:border-[#3A3A4A] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-emerald-500/15 text-emerald-100 border border-emerald-500/20'
                : 'bg-[#12121A] text-[#9CA3AF] border border-[#2A2A3A]'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#12121A] border border-[#2A2A3A] rounded-lg px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="text-emerald-400 animate-spin" />
              <span className="text-sm text-[#6B7280]">Thinking...</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2.5 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors"
          placeholder={`Ask about ${client.name}...`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={loading}
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-[#1A1A26] disabled:text-[#6B7280] text-white text-sm rounded-md transition-colors flex items-center gap-2"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function ClientProfile({ client, onBack, onNavigate }) {
  const store = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);

  const campaigns = store.getClientCampaigns(client.id);
  const posts = store.getClientPosts(client.id);
  const research = store.getClientResearch(client.id);

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'campaigns', label: `Campaigns (${campaigns.length})` },
    { key: 'content', label: `Content (${posts.length})` },
    { key: 'research', label: `Research (${research.length})` },
    { key: 'ai-advisor', label: 'AI Advisor' },
  ];

  const handleUpdate = (data) => {
    store.updateClient(client.id, data);
    store.addActivity({ type: 'client_updated', message: `Updated client profile: ${data.name || client.name}`, clientId: client.id, entityId: client.id });
    setEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete ${client.name} and all associated data? This cannot be undone.`)) {
      store.deleteClient(client.id);
      onBack();
    }
  };

  const color = getClientColor(client.id);

  const statusColors = {
    Active: 'text-emerald-400 bg-emerald-500/10',
    Paused: 'text-yellow-400 bg-yellow-500/10',
    Offboarding: 'text-red-400 bg-red-500/10',
    Prospect: 'text-blue-400 bg-blue-500/10',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-[#6B7280] hover:text-white transition-colors p-1">
          <ArrowLeft size={18} />
        </button>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: `${color}20`, color }}>
          {getInitials(client.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white/90">{client.name}</h2>
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <span>{client.sector}</span>
            <span>-</span>
            <span>{client.partnershipType}</span>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[client.status] || 'text-[#6B7280] bg-[#12121A]'}`}>
          {client.status}
        </span>
        <button onClick={() => setEditing(!editing)} className="p-2 text-[#6B7280] hover:text-white transition-colors rounded-md hover:bg-white/5">
          <Edit3 size={15} />
        </button>
        <button onClick={handleDelete} className="p-2 text-[#6B7280] hover:text-red-400 transition-colors rounded-md hover:bg-white/5">
          <Trash2 size={15} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2A2A3A] mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setEditing(false); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.key
                ? 'text-emerald-400'
                : 'text-[#6B7280] hover:text-white'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-emerald-400" />}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && !editing && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <InfoCard title="Contact" icon={Mail}>
              <InfoRow label="Name" value={client.contactName} />
              <InfoRow label="Email" value={client.contactEmail} />
              <InfoRow label="Phone" value={client.contactPhone} />
              <InfoRow label="Website" value={client.website} link />
            </InfoCard>
            <InfoCard title="Social Handles" icon={Globe}>
              {Object.entries(client.socialHandles || {}).filter(([,v]) => v).map(([k, v]) => (
                <InfoRow key={k} label={k} value={v} />
              ))}
              {Object.values(client.socialHandles || {}).every(v => !v) && (
                <p className="text-xs text-[#6B7280]">No social handles configured</p>
              )}
            </InfoCard>
            <InfoCard title="Details" icon={Building2}>
              <InfoRow label="Budget Range" value={client.budgetRange} />
              <InfoRow label="Priority" value={client.priority} />
              <InfoRow label="Platforms" value={(client.platforms || []).join(', ')} />
              <InfoRow label="Created" value={formatDate(client.createdAt)} />
              <InfoRow label="Last Updated" value={relativeTime(client.updatedAt)} />
            </InfoCard>
          </div>
          <div className="space-y-4">
            <InfoCard title="Brand Voice" icon={MessageSquare}>
              <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{client.brandVoice || 'Not defined'}</p>
            </InfoCard>
            <InfoCard title="Target Audience" icon={Users}>
              <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{client.targetAudience || 'Not defined'}</p>
            </InfoCard>
            <InfoCard title="Key Messages" icon={Tag}>
              {(client.keyMessages || []).length > 0 ? (
                <ul className="space-y-1">
                  {client.keyMessages.map((m, i) => (
                    <li key={i} className="text-sm text-[#9CA3AF] flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">-</span> {m}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-[#6B7280]">None defined</p>}
            </InfoCard>
            <InfoCard title="Goals" icon={Brain}>
              <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{client.goals || 'Not defined'}</p>
            </InfoCard>
            {client.notes && (
              <InfoCard title="Notes" icon={BookOpen}>
                <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{client.notes}</p>
              </InfoCard>
            )}
          </div>
        </div>
      )}

      {activeTab === 'overview' && editing && (
        <ClientForm initial={client} onSave={handleUpdate} onCancel={() => setEditing(false)} />
      )}

      {activeTab === 'campaigns' && (
        <div>
          {campaigns.length === 0 ? (
            <EmptyState icon={Megaphone} message="No campaigns yet" action="Create Campaign" onAction={() => onNavigate('campaigns', { action: 'add', clientId: client.id })} />
          ) : (
            <div className="space-y-3">
              {campaigns.map(camp => (
                <div
                  key={camp.id}
                  className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4 hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer"
                  onClick={() => onNavigate('campaigns', { campaignId: camp.id })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white/90">{camp.name}</h3>
                      <p className="text-xs text-[#6B7280] mt-0.5">{camp.objective} - {camp.type} - {camp.platforms.join(', ')}</p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                      camp.status === 'Active' ? 'text-emerald-400 bg-emerald-500/10' :
                      camp.status === 'Planning' ? 'text-blue-400 bg-blue-500/10' :
                      camp.status === 'Paused' ? 'text-yellow-400 bg-yellow-500/10' :
                      'text-[#6B7280] bg-[#12121A]'
                    }`}>
                      {camp.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'content' && (
        <div>
          {posts.length === 0 ? (
            <EmptyState icon={Calendar} message="No content created yet" action="Create Post" onAction={() => onNavigate('content-calendar', { action: 'add', clientId: client.id })} />
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <div
                  key={post.id}
                  className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4 hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer"
                  onClick={() => onNavigate('content-calendar', { postId: post.id })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white/90">{post.title}</h3>
                      <p className="text-xs text-[#6B7280] mt-0.5">{post.platform} - {post.type} - {post.scheduledDate ? formatDate(post.scheduledDate) : 'No date'}</p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                      post.status === 'Published' ? 'text-emerald-400 bg-emerald-500/10' :
                      post.status === 'Scheduled' ? 'text-blue-400 bg-blue-500/10' :
                      post.status === 'Draft' ? 'text-[#6B7280] bg-[#12121A]' :
                      'text-yellow-400 bg-yellow-500/10'
                    }`}>
                      {post.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'research' && (
        <div>
          {research.length === 0 ? (
            <EmptyState icon={BookOpen} message="No research notes yet" action="Log Note" onAction={() => onNavigate('research-log', { action: 'add', clientId: client.id })} />
          ) : (
            <div className="space-y-3">
              {research.map(r => (
                <div
                  key={r.id}
                  className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4 hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer"
                  onClick={() => onNavigate('research-log', { researchId: r.id })}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-white/90">{r.title}</h3>
                      <p className="text-xs text-[#6B7280] mt-0.5">{r.category} - {formatDate(r.createdAt)}</p>
                    </div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${
                      r.priority === 'High' ? 'text-red-400 bg-red-500/10' :
                      r.priority === 'Medium' ? 'text-yellow-400 bg-yellow-500/10' :
                      'text-[#6B7280] bg-[#12121A]'
                    }`}>
                      {r.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'ai-advisor' && <AIAdvisor client={client} />}
    </div>
  );
}

function InfoCard({ title, icon: Icon, children }) {
  return (
    <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4">
      <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
        <Icon size={13} /> {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value, link }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#2A2A3A] last:border-0">
      <span className="text-xs text-[#6B7280]">{label}</span>
      {link ? (
        <a href={value} target="_blank" rel="noreferrer" className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors">
          {value} <ExternalLink size={11} />
        </a>
      ) : (
        <span className="text-sm text-white/90">{value}</span>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, message, action, onAction }) {
  return (
    <div className="text-center py-12">
      <Icon size={32} className="text-[#6B7280] mx-auto mb-3" />
      <p className="text-sm text-[#6B7280] mb-4">{message}</p>
      {action && (
        <button onClick={onAction} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm rounded-md transition-colors inline-flex items-center gap-2">
          <Plus size={14} /> {action}
        </button>
      )}
    </div>
  );
}

export default function ClientHub({ onNavigate, params }) {
  const store = useStore();
  const [view, setView] = useState('list'); // list, add, profile
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Handle incoming params
  useEffect(() => {
    if (params?.action === 'add') {
      setView('add');
    } else if (params?.clientId) {
      const client = store.clients.find(c => c.id === params.clientId);
      if (client) {
        setSelectedClient(client);
        setView('profile');
      }
    }
  }, [params, store.clients]);

  // Keep selectedClient in sync
  useEffect(() => {
    if (selectedClient) {
      const updated = store.clients.find(c => c.id === selectedClient.id);
      if (updated) setSelectedClient(updated);
    }
  }, [store.clients, selectedClient]);

  const filteredClients = useMemo(() => {
    return store.clients.filter(c => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q) || c.contactName.toLowerCase().includes(q));
      }
      return true;
    });
  }, [store.clients, searchQuery, statusFilter]);

  const handleAddClient = (data) => {
    const client = store.addClient(data);
    store.addActivity({ type: 'client_created', message: `Added new client: ${data.name}`, clientId: client.id, entityId: client.id });
    setSelectedClient(client);
    setView('profile');
  };

  if (view === 'add') {
    return (
      <div className="max-w-[800px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="text-[#6B7280] hover:text-white transition-colors p-1">
            <ArrowLeft size={18} />
          </button>
          <h2 className="text-lg font-semibold text-white/90">Add New Client</h2>
        </div>
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-6">
          <ClientForm onSave={handleAddClient} onCancel={() => setView('list')} />
        </div>
      </div>
    );
  }

  if (view === 'profile' && selectedClient) {
    return (
      <div className="max-w-[1000px]">
        <ClientProfile
          client={selectedClient}
          onBack={() => { setView('list'); setSelectedClient(null); }}
          onNavigate={onNavigate}
        />
      </div>
    );
  }

  // List View
  return (
    <div className="max-w-[1000px]">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white/90">Clients</h2>
        <button
          onClick={() => setView('add')}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
        >
          <Plus size={15} /> Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-[#1A1A26] border border-[#2A2A3A] rounded-md px-3 py-2 flex-1 max-w-[300px]">
          <Search size={14} className="text-[#6B7280] flex-shrink-0" />
          <input
            className="bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-[#6B7280] w-full p-0"
            placeholder="Search clients..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-[#6B7280]" />
          {['all', ...CLIENT_STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                statusFilter === s
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-[#6B7280] hover:text-white border border-transparent'
              }`}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-12">
          <Users size={32} className="text-[#6B7280] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">{store.clients.length === 0 ? 'No clients yet' : 'No clients match your filters'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClients.map(client => {
            const color = getClientColor(client.id);
            const activeCamps = store.getClientCampaigns(client.id).filter(c => c.status === 'Active').length;
            return (
              <div
                key={client.id}
                onClick={() => { setSelectedClient(client); setView('profile'); }}
                className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4 hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0" style={{ background: `${color}20`, color }}>
                  {getInitials(client.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-white/90">{client.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      client.status === 'Active' ? 'text-emerald-400 bg-emerald-500/10' :
                      client.status === 'Paused' ? 'text-yellow-400 bg-yellow-500/10' :
                      client.status === 'Prospect' ? 'text-blue-400 bg-blue-500/10' :
                      'text-[#6B7280] bg-[#12121A]'
                    }`}>
                      {client.status}
                    </span>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-0.5">{client.sector} - {client.partnershipType} - {activeCamps} active campaign{activeCamps !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex -space-x-1">
                    {(client.platforms || []).slice(0, 3).map(p => (
                      <span key={p} className="text-[10px] bg-[#12121A] text-[#9CA3AF] px-1.5 py-0.5 rounded border border-[#2A2A3A]">{p}</span>
                    ))}
                    {(client.platforms || []).length > 3 && (
                      <span className="text-[10px] bg-[#12121A] text-[#6B7280] px-1.5 py-0.5 rounded border border-[#2A2A3A]">+{client.platforms.length - 3}</span>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-[#6B7280]" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
