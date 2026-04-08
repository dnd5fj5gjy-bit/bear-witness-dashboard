import { useState, useMemo, useEffect, useCallback } from 'react';
import { useStore } from '../hooks/useStore';
import {
  Users, Plus, Search, ChevronRight, ArrowLeft, Edit3, Trash2,
  Globe, Mail, Phone, ExternalLink, Megaphone, Calendar,
  BookOpen, Brain, MessageSquare, Send, X, Check, Filter,
  Building2, Tag, AlertCircle, Loader2, ChevronLeft, UserPlus,
  Activity, Lightbulb, Clock, TrendingUp, Star,
} from 'lucide-react';
import {
  getInitials, getClientColor, formatDate, relativeTime,
  SECTORS, PLATFORMS, BUDGET_RANGES, PARTNERSHIP_TYPES, CLIENT_STATUSES, PRIORITIES,
} from '../lib/utils';
import { callAI } from '../lib/ai';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek, isToday, parseISO,
  differenceInDays,
} from 'date-fns';

const EMPTY_CONTACT = { name: '', role: '', email: '', phone: '' };

const EMPTY_CLIENT = {
  name: '', sector: '', platforms: [], partnershipType: '',
  status: 'Active', budgetRange: '', priority: 'Medium',
  contactName: '', contactEmail: '', contactPhone: '',
  contacts: [{ ...EMPTY_CONTACT }],
  website: '', socialHandles: { instagram: '', tiktok: '', youtube: '', linkedin: '', twitter: '' },
  brandVoice: '', targetAudience: '', keyMessages: [''],
  goals: '', notes: '', description: '', currentMarketing: '', dateOnboarded: '',
};

/* ─── Client Form ─── */
function ClientForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    const base = initial || EMPTY_CLIENT;
    return {
      ...EMPTY_CLIENT,
      ...base,
      contacts: base.contacts?.length ? base.contacts : (base.contactName ? [{ name: base.contactName, role: '', email: base.contactEmail || '', phone: base.contactPhone || '' }] : [{ ...EMPTY_CONTACT }]),
      keyMessages: base.keyMessages?.length ? base.keyMessages : [''],
      description: base.description || '',
      currentMarketing: base.currentMarketing || '',
      dateOnboarded: base.dateOnboarded || '',
    };
  });
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

  /* Contact management */
  const addContact = () => setForm(prev => ({ ...prev, contacts: [...prev.contacts, { ...EMPTY_CONTACT }] }));
  const updateContact = (idx, field, val) => {
    setForm(prev => {
      const contacts = [...prev.contacts];
      contacts[idx] = { ...contacts[idx], [field]: val };
      return { ...prev, contacts };
    });
  };
  const removeContact = (idx) => {
    setForm(prev => {
      const contacts = prev.contacts.filter((_, i) => i !== idx);
      return { ...prev, contacts: contacts.length ? contacts : [{ ...EMPTY_CONTACT }] };
    });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.sector) e.sector = 'Required';
    if (form.platforms.length === 0) e.platforms = 'Select at least one';
    if (!form.partnershipType) e.partnershipType = 'Required';
    const primaryContact = form.contacts[0];
    if (!primaryContact?.name?.trim()) e.contactPrimary = 'Primary contact name required';
    form.contacts.forEach((c, i) => {
      if (c.email && !/\S+@\S+\.\S+/.test(c.email)) e[`contactEmail_${i}`] = 'Invalid email';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const contactsClean = form.contacts.filter(c => c.name.trim());
    onSave({
      ...form,
      contacts: contactsClean.length ? contactsClean : [{ ...EMPTY_CONTACT }],
      contactName: contactsClean[0]?.name || '',
      contactEmail: contactsClean[0]?.email || '',
      contactPhone: contactsClean[0]?.phone || '',
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
  const textareaClass = 'w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors resize-none';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Business Information */}
      <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Building2 size={14} className="text-emerald-400" /> Business Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Company / Brand Name *</label>
          <input className={fieldClass('name')} value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ted's Health" />
          {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Sector *</label>
          <select className={fieldClass('sector')} value={form.sector} onChange={e => set('sector', e.target.value)}>
            <option value="">Select sector</option>
            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {errors.sector && <p className="text-xs text-red-400 mt-1">{errors.sector}</p>}
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Business Description</label>
          <textarea className={textareaClass} rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Brief description of what the business does..." />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Partnership Type *</label>
          <select className={fieldClass('partnershipType')} value={form.partnershipType} onChange={e => set('partnershipType', e.target.value)}>
            <option value="">Select type</option>
            {PARTNERSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.partnershipType && <p className="text-xs text-red-400 mt-1">{errors.partnershipType}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Status</label>
          <select className={fieldClass('status')} value={form.status} onChange={e => set('status', e.target.value)}>
            {CLIENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Budget Range</label>
          <select className={fieldClass('budgetRange')} value={form.budgetRange} onChange={e => set('budgetRange', e.target.value)}>
            <option value="">Select range</option>
            {BUDGET_RANGES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Priority</label>
          <select className={fieldClass('priority')} value={form.priority} onChange={e => set('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Date Onboarded</label>
          <input className={fieldClass('dateOnboarded')} type="date" value={form.dateOnboarded} onChange={e => set('dateOnboarded', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Website</label>
          <input className={fieldClass('website')} value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://..." />
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

      {/* Marketing */}
      <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2"><TrendingUp size={14} className="text-emerald-400" /> Current Marketing</h3>
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Current Marketing Practices</label>
        <textarea className={textareaClass} rows={3} value={form.currentMarketing} onChange={e => set('currentMarketing', e.target.value)} placeholder="Describe current marketing activities, channels, ad spend, existing content strategy..." />
      </div>

      <hr className="border-[#2A2A3A]" />

      {/* Key Contacts */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2"><UserPlus size={14} className="text-emerald-400" /> Key Contacts</h3>
        <button type="button" onClick={addContact} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
          <Plus size={12} /> Add Contact
        </button>
      </div>
      {errors.contactPrimary && <p className="text-xs text-red-400">{errors.contactPrimary}</p>}
      <div className="space-y-4">
        {form.contacts.map((contact, idx) => (
          <div key={idx} className="bg-[#12121A] border border-[#2A2A3A] rounded-md p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-wider text-[#6B7280] font-semibold">
                {idx === 0 ? 'Primary Contact *' : `Contact ${idx + 1}`}
              </span>
              {form.contacts.length > 1 && (
                <button type="button" onClick={() => removeContact(idx)} className="text-[#6B7280] hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] text-[#6B7280] mb-1">Name {idx === 0 ? '*' : ''}</label>
                <input className="w-full bg-[#0A0A0F] border border-[#2A2A3A] rounded-md px-2.5 py-1.5 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors" value={contact.name} onChange={e => updateContact(idx, 'name', e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-[10px] text-[#6B7280] mb-1">Role</label>
                <input className="w-full bg-[#0A0A0F] border border-[#2A2A3A] rounded-md px-2.5 py-1.5 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors" value={contact.role} onChange={e => updateContact(idx, 'role', e.target.value)} placeholder="e.g. Marketing Director" />
              </div>
              <div>
                <label className="block text-[10px] text-[#6B7280] mb-1">Email</label>
                <input className="w-full bg-[#0A0A0F] border border-[#2A2A3A] rounded-md px-2.5 py-1.5 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors" type="email" value={contact.email} onChange={e => updateContact(idx, 'email', e.target.value)} placeholder="email@co.com" />
                {errors[`contactEmail_${idx}`] && <p className="text-[10px] text-red-400 mt-0.5">{errors[`contactEmail_${idx}`]}</p>}
              </div>
              <div>
                <label className="block text-[10px] text-[#6B7280] mb-1">Phone</label>
                <input className="w-full bg-[#0A0A0F] border border-[#2A2A3A] rounded-md px-2.5 py-1.5 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors" value={contact.phone} onChange={e => updateContact(idx, 'phone', e.target.value)} placeholder="+44..." />
              </div>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-[#2A2A3A]" />

      {/* Social Handles */}
      <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2"><Globe size={14} className="text-emerald-400" /> Social Handles</h3>
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
      <h3 className="text-sm font-semibold text-white/90 flex items-center gap-2"><MessageSquare size={14} className="text-emerald-400" /> Brand & Strategy</h3>
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Brand Voice</label>
        <textarea className={textareaClass} rows={3} value={form.brandVoice} onChange={e => set('brandVoice', e.target.value)} placeholder="Describe the brand's tone and voice..." />
      </div>
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Target Audience</label>
        <textarea className={textareaClass} rows={3} value={form.targetAudience} onChange={e => set('targetAudience', e.target.value)} placeholder="Demographics, interests, markets..." />
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
        <textarea className={textareaClass} rows={3} value={form.goals} onChange={e => set('goals', e.target.value)} placeholder="Business and social media goals..." />
      </div>
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Internal Notes</label>
        <textarea className={textareaClass} rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." />
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

/* ─── Health Score Ring ─── */
function HealthScoreRing({ score, size = 64 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444';
  const bgColor = score >= 70 ? 'rgba(16,185,129,0.1)' : score >= 40 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2A2A3A" strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ backgroundColor: bgColor }}>
        <span className="text-sm font-bold" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}

/* ─── Health Score Calculator ─── */
function calculateHealthScore(client, campaigns, posts, research, strategies, activityFeed) {
  let score = 0;
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Active campaigns: 30% weight (max 30)
  const activeCampaigns = campaigns.filter(c => c.status === 'Active').length;
  score += Math.min(activeCampaigns * 15, 30);

  // Posts scheduled this week: 20% weight (max 20)
  const postsThisWeek = posts.filter(p => {
    if (!p.scheduledDate) return false;
    const d = new Date(p.scheduledDate).getTime();
    return d >= sevenDaysAgo && d <= now + 7 * 24 * 60 * 60 * 1000 && (p.status === 'Scheduled' || p.status === 'Published');
  }).length;
  score += Math.min(postsThisWeek * 5, 20);

  // Research notes in last 30 days: 20% weight (max 20)
  const recentResearch = research.filter(r => new Date(r.createdAt).getTime() >= thirtyDaysAgo).length;
  score += Math.min(recentResearch * 5, 20);

  // Strategies generated: 15% weight (max 15)
  score += Math.min(strategies.length * 5, 15);

  // Recent activity: 15% weight (max 15)
  const recentActivity = (activityFeed || []).filter(a => a.clientId === client.id && a.timestamp >= sevenDaysAgo).length;
  score += Math.min(recentActivity * 3, 15);

  return Math.min(Math.round(score), 100);
}

/* ─── AI Advisor ─── */
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
- Description: ${client.description || 'Not defined'}
- Current Marketing: ${client.currentMarketing || 'Not defined'}

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

/* ─── Mini Content Calendar ─── */
function MiniContentCalendar({ client, posts, onNavigate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getPostsForDay = (day) => {
    return posts.filter(p => {
      if (!p.scheduledDate) return false;
      try {
        const postDate = typeof p.scheduledDate === 'string' ? parseISO(p.scheduledDate) : new Date(p.scheduledDate);
        return isSameDay(postDate, day);
      } catch { return false; }
    });
  };

  const statusDotColor = (status) => {
    switch (status) {
      case 'Published': return 'bg-emerald-400';
      case 'Scheduled': return 'bg-blue-400';
      case 'Approved': return 'bg-cyan-400';
      case 'Draft': return 'bg-[#6B7280]';
      default: return 'bg-yellow-400';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1.5 text-[#6B7280] hover:text-white transition-colors rounded hover:bg-white/5">
          <ChevronLeft size={16} />
        </button>
        <h3 className="text-sm font-medium text-white/90">{format(currentMonth, 'MMMM yyyy')}</h3>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1.5 text-[#6B7280] hover:text-white transition-colors rounded hover:bg-white/5">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-[#2A2A3A] rounded-lg overflow-hidden">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="bg-[#12121A] text-center py-1.5 text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">{d}</div>
        ))}
        {days.map((day, idx) => {
          const dayPosts = getPostsForDay(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          return (
            <div
              key={idx}
              className={`bg-[#1A1A26] min-h-[60px] p-1 ${!inMonth ? 'opacity-30' : ''} ${today ? 'ring-1 ring-inset ring-emerald-500/40' : ''}`}
            >
              <span className={`text-[10px] font-medium ${today ? 'text-emerald-400' : 'text-[#9CA3AF]'}`}>
                {format(day, 'd')}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {dayPosts.slice(0, 3).map(post => (
                  <div
                    key={post.id}
                    onClick={() => onNavigate('content-calendar', { postId: post.id })}
                    className="flex items-center gap-1 cursor-pointer hover:bg-white/5 rounded px-0.5 py-0.5 transition-colors"
                    title={`${post.title} (${post.status})`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDotColor(post.status)}`} />
                    <span className="text-[9px] text-[#9CA3AF] truncate">{post.title}</span>
                  </div>
                ))}
                {dayPosts.length > 3 && (
                  <span className="text-[9px] text-[#6B7280] pl-0.5">+{dayPosts.length - 3} more</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-3 text-[10px] text-[#6B7280]">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Published</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Scheduled</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#6B7280]" /> Draft</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> Other</span>
      </div>
    </div>
  );
}

/* ─── Strategy Tab ─── */
function StrategyTab({ client, onNavigate }) {
  const store = useStore();
  const strategies = store.getClientStrategies(client.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#9CA3AF]">{strategies.length} strateg{strategies.length === 1 ? 'y' : 'ies'} generated</p>
        <button
          onClick={() => onNavigate('strategy-engine', { clientId: client.id })}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
        >
          <Lightbulb size={14} /> Generate New Strategy
        </button>
      </div>
      {strategies.length === 0 ? (
        <div className="text-center py-12">
          <Lightbulb size={32} className="text-[#6B7280] mx-auto mb-3" />
          <p className="text-sm text-[#6B7280]">No strategies generated yet</p>
          <p className="text-xs text-[#6B7280] mt-1">Head to the Strategy Engine to create one for {client.name}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {strategies.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(strat => (
            <div
              key={strat.id}
              className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4 hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer"
              onClick={() => onNavigate('strategy-engine', { strategyId: strat.id })}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white/90">{strat.title || 'Untitled Strategy'}</h3>
                  <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-2">{strat.summary || strat.content?.slice(0, 120) || 'No summary'}</p>
                </div>
                <div className="flex-shrink-0 ml-3 text-right">
                  <span className="text-[10px] text-[#6B7280]">{strat.createdAt ? formatDate(strat.createdAt) : 'Unknown date'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Client Profile ─── */
function ClientProfile({ client, onBack, onNavigate }) {
  const store = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [editing, setEditing] = useState(false);

  const campaigns = store.getClientCampaigns(client.id);
  const posts = store.getClientPosts(client.id);
  const research = store.getClientResearch(client.id);
  const strategies = store.getClientStrategies(client.id);

  const healthScore = useMemo(() =>
    calculateHealthScore(client, campaigns, posts, research, strategies, store.activityFeed),
    [client, campaigns, posts, research, strategies, store.activityFeed]
  );

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'campaigns', label: `Campaigns (${campaigns.length})` },
    { key: 'content', label: `Content (${posts.length})` },
    { key: 'calendar', label: 'Calendar' },
    { key: 'strategies', label: `Strategies (${strategies.length})` },
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

  const contacts = client.contacts?.length ? client.contacts : (client.contactName ? [{ name: client.contactName, role: '', email: client.contactEmail, phone: client.contactPhone }] : []);

  return (
    <div>
      {/* Header with Health Score */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-[#6B7280] hover:text-white transition-colors p-1">
          <ArrowLeft size={18} />
        </button>
        <HealthScoreRing score={healthScore} size={56} />
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ background: `${color}20`, color }}>
          {getInitials(client.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white/90">{client.name}</h2>
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            <span>{client.sector}</span>
            <span>-</span>
            <span>{client.partnershipType}</span>
            {client.dateOnboarded && (
              <>
                <span>-</span>
                <span>Since {formatDate(client.dateOnboarded)}</span>
              </>
            )}
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

      {/* Health Score Breakdown */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {[
          { label: 'Active Campaigns', value: campaigns.filter(c => c.status === 'Active').length, weight: '30%' },
          { label: 'Posts This Week', value: posts.filter(p => p.scheduledDate && (p.status === 'Scheduled' || p.status === 'Published')).length, weight: '20%' },
          { label: 'Research (30d)', value: research.filter(r => Date.now() - new Date(r.createdAt).getTime() < 30 * 86400000).length, weight: '20%' },
          { label: 'Strategies', value: strategies.length, weight: '15%' },
          { label: 'Recent Activity', value: (store.activityFeed || []).filter(a => a.clientId === client.id && a.timestamp >= Date.now() - 7 * 86400000).length, weight: '15%' },
        ].map((item, i) => (
          <div key={i} className="bg-[#12121A] border border-[#2A2A3A] rounded-md p-2 text-center">
            <div className="text-lg font-bold text-white/90">{item.value}</div>
            <div className="text-[9px] text-[#6B7280] leading-tight">{item.label}</div>
            <div className="text-[8px] text-[#6B7280] mt-0.5">({item.weight})</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2A2A3A] mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setEditing(false); }}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
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
            {/* Business Info */}
            <InfoCard title="Business Information" icon={Building2}>
              <InfoRow label="Sector" value={client.sector} />
              <InfoRow label="Partnership" value={client.partnershipType} />
              <InfoRow label="Budget Range" value={client.budgetRange} />
              <InfoRow label="Priority" value={client.priority} />
              <InfoRow label="Platforms" value={(client.platforms || []).join(', ')} />
              <InfoRow label="Website" value={client.website} link />
              {client.dateOnboarded && <InfoRow label="Onboarded" value={formatDate(client.dateOnboarded)} />}
              <InfoRow label="Created" value={formatDate(client.createdAt)} />
              <InfoRow label="Last Updated" value={relativeTime(client.updatedAt)} />
            </InfoCard>

            {client.description && (
              <InfoCard title="Business Description" icon={BookOpen}>
                <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{client.description}</p>
              </InfoCard>
            )}

            {/* Contacts */}
            <InfoCard title={`Key Contacts (${contacts.length})`} icon={Users}>
              {contacts.length > 0 ? (
                <div className="space-y-3">
                  {contacts.map((contact, idx) => (
                    <div key={idx} className={`${idx > 0 ? 'pt-3 border-t border-[#2A2A3A]' : ''}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white/90">{contact.name || 'Unnamed'}</span>
                        {contact.role && <span className="text-[10px] text-[#6B7280] bg-[#12121A] px-1.5 py-0.5 rounded">{contact.role}</span>}
                        {idx === 0 && <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Primary</span>}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-[#9CA3AF]">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                            <Mail size={11} /> {contact.email}
                          </a>
                        )}
                        {contact.phone && (
                          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-emerald-400 transition-colors">
                            <Phone size={11} /> {contact.phone}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#6B7280]">No contacts configured</p>
              )}
            </InfoCard>

            {/* Social Handles */}
            <InfoCard title="Social Handles" icon={Globe}>
              {Object.entries(client.socialHandles || {}).filter(([,v]) => v).map(([k, v]) => (
                <InfoRow key={k} label={k} value={v} />
              ))}
              {Object.values(client.socialHandles || {}).every(v => !v) && (
                <p className="text-xs text-[#6B7280]">No social handles configured</p>
              )}
            </InfoCard>
          </div>
          <div className="space-y-4">
            {/* Marketing */}
            {client.currentMarketing && (
              <InfoCard title="Current Marketing" icon={TrendingUp}>
                <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{client.currentMarketing}</p>
              </InfoCard>
            )}

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
              <InfoCard title="Internal Notes" icon={BookOpen}>
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

      {activeTab === 'calendar' && (
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-5">
          <MiniContentCalendar client={client} posts={posts} onNavigate={onNavigate} />
        </div>
      )}

      {activeTab === 'strategies' && (
        <StrategyTab client={client} onNavigate={onNavigate} />
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

/* ─── Shared Components ─── */
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

/* ─── Main Export ─── */
export default function ClientHub({ onNavigate, params }) {
  const store = useStore();
  const [view, setView] = useState('list');
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
        return (c.name.toLowerCase().includes(q) || c.sector.toLowerCase().includes(q) || (c.contactName || '').toLowerCase().includes(q));
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
            const clientCampaigns = store.getClientCampaigns(client.id);
            const clientPosts = store.getClientPosts(client.id);
            const clientResearch = store.getClientResearch(client.id);
            const clientStrategies = store.getClientStrategies(client.id);
            const activeCamps = clientCampaigns.filter(c => c.status === 'Active').length;
            const health = calculateHealthScore(client, clientCampaigns, clientPosts, clientResearch, clientStrategies, store.activityFeed);
            return (
              <div
                key={client.id}
                onClick={() => { setSelectedClient(client); setView('profile'); }}
                className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4 hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer flex items-center gap-4"
              >
                <HealthScoreRing score={health} size={40} />
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
