import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import {
  Calendar, Plus, Search, ArrowLeft, Edit3, Trash2, X, Check,
  ChevronLeft, ChevronRight, List, LayoutGrid, Filter,
  Brain, Send, Loader2, Eye, BarChart3, Clock,
  Image, Film, MessageSquare, FileText, Hash,
} from 'lucide-react';
import {
  formatDate, getClientColor, getInitials, truncate,
  PLATFORMS, POST_TYPES, POST_STATUSES, PLATFORM_CHAR_LIMITS,
} from '../lib/utils';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, addMonths, subMonths, addWeeks, subWeeks,
  isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { callAI } from '../lib/ai';

const EMPTY_POST = {
  clientId: '', campaignId: '', platform: '', type: '', status: 'Draft',
  title: '', content: '', scheduledDate: '', hashtags: [],
  notes: '', analytics: null,
};

function PostForm({ initial, clients, campaigns, onSave, onCancel, defaultClientId, defaultCampaignId }) {
  const [form, setForm] = useState(() => {
    if (initial) return { ...initial, hashtagInput: '' };
    return { ...EMPTY_POST, clientId: defaultClientId || '', campaignId: defaultCampaignId || '', hashtagInput: '' };
  });
  const [errors, setErrors] = useState({});

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const clientCampaigns = useMemo(() => {
    if (!form.clientId) return [];
    return campaigns.filter(c => c.clientId === form.clientId);
  }, [form.clientId, campaigns]);

  const charLimit = PLATFORM_CHAR_LIMITS[form.platform] || null;
  const charCount = form.content?.length || 0;
  const overLimit = charLimit && charCount > charLimit;

  const addHashtag = () => {
    const tag = form.hashtagInput.trim().replace(/^#/, '');
    if (tag && !(form.hashtags || []).includes(tag)) {
      set('hashtags', [...(form.hashtags || []), tag]);
      set('hashtagInput', '');
    }
  };

  const removeHashtag = (tag) => {
    set('hashtags', (form.hashtags || []).filter(t => t !== tag));
  };

  const validate = () => {
    const e = {};
    if (!form.clientId) e.clientId = 'Required';
    if (!form.platform) e.platform = 'Required';
    if (!form.type) e.type = 'Required';
    if (!form.title.trim()) e.title = 'Required';
    if (!form.content.trim()) e.content = 'Required';
    if (overLimit) e.content = `Exceeds ${form.platform} character limit`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const { hashtagInput, ...data } = form;
    onSave(data);
  };

  const fieldClass = (key) =>
    `w-full bg-[#12121A] border ${errors[key] ? 'border-red-500' : 'border-[#2A2A3A]'} rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Client *</label>
          <select className={fieldClass('clientId')} value={form.clientId} onChange={e => { set('clientId', e.target.value); set('campaignId', ''); }}>
            <option value="">Select client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {errors.clientId && <p className="text-xs text-red-400 mt-1">{errors.clientId}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Campaign</label>
          <select className={fieldClass('campaignId')} value={form.campaignId} onChange={e => set('campaignId', e.target.value)} disabled={!form.clientId}>
            <option value="">No campaign (standalone)</option>
            {clientCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Platform *</label>
          <select className={fieldClass('platform')} value={form.platform} onChange={e => set('platform', e.target.value)}>
            <option value="">Select platform</option>
            {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {errors.platform && <p className="text-xs text-red-400 mt-1">{errors.platform}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Post Type *</label>
          <select className={fieldClass('type')} value={form.type} onChange={e => set('type', e.target.value)}>
            <option value="">Select type</option>
            {POST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {errors.type && <p className="text-xs text-red-400 mt-1">{errors.type}</p>}
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Status</label>
          <select className={fieldClass('status')} value={form.status} onChange={e => set('status', e.target.value)}>
            {POST_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#9CA3AF] mb-1.5">Scheduled Date & Time</label>
          <input className={fieldClass('scheduledDate')} type="datetime-local" value={form.scheduledDate ? form.scheduledDate.slice(0, 16) : ''} onChange={e => set('scheduledDate', e.target.value ? new Date(e.target.value).toISOString() : '')} />
        </div>
      </div>

      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Title *</label>
        <input className={fieldClass('title')} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Post title / headline" />
        {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs text-[#9CA3AF]">Content *</label>
          <div className="flex items-center gap-2">
            {charLimit && (
              <span className={`text-xs font-mono ${overLimit ? 'text-red-400' : charCount > charLimit * 0.9 ? 'text-yellow-400' : 'text-[#6B7280]'}`}>
                {charCount} / {charLimit}
              </span>
            )}
            {!charLimit && <span className="text-xs text-[#6B7280] font-mono">{charCount} chars</span>}
          </div>
        </div>
        <textarea
          className={`w-full bg-[#12121A] border ${errors.content || overLimit ? 'border-red-500' : 'border-[#2A2A3A]'} rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors resize-none`}
          rows={8}
          value={form.content}
          onChange={e => set('content', e.target.value)}
          placeholder="Write your post content..."
        />
        {errors.content && <p className="text-xs text-red-400 mt-1">{errors.content}</p>}
      </div>

      {/* Hashtags */}
      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Hashtags</label>
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors"
            value={form.hashtagInput}
            onChange={e => set('hashtagInput', e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHashtag(); } }}
            placeholder="Add hashtag and press Enter"
          />
          <button type="button" onClick={addHashtag} className="px-3 py-2 bg-[#1A1A26] border border-[#2A2A3A] text-[#9CA3AF] hover:text-white rounded-md transition-colors">
            <Hash size={14} />
          </button>
        </div>
        {(form.hashtags || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.hashtags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-500/20">
                #{tag}
                <button type="button" onClick={() => removeHashtag(tag)} className="hover:text-white transition-colors"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Analytics (for published posts) */}
      {form.status === 'Published' && (
        <>
          <h3 className="text-sm font-semibold text-white/90">Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {['views', 'likes', 'comments', 'shares', 'saves'].map(metric => (
              <div key={metric}>
                <label className="block text-xs text-[#9CA3AF] mb-1.5 capitalize">{metric}</label>
                <input
                  className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors"
                  type="number"
                  value={form.analytics?.[metric] || ''}
                  onChange={e => set('analytics', { ...(form.analytics || {}), [metric]: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            ))}
          </div>
        </>
      )}

      <div>
        <label className="block text-xs text-[#9CA3AF] mb-1.5">Notes</label>
        <textarea className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Internal notes..." />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2">
          <Check size={15} /> {initial ? 'Update Post' : 'Create Post'}
        </button>
        <button type="button" onClick={onCancel} className="px-5 py-2.5 bg-[#1A1A26] border border-[#2A2A3A] text-[#9CA3AF] hover:text-white text-sm rounded-md transition-colors">Cancel</button>
      </div>
    </form>
  );
}

function PostDetail({ post, onBack, onEdit, onDelete, onNavigate }) {
  const { clients, campaigns } = useStore();
  const client = clients.find(c => c.id === post.clientId);
  const campaign = campaigns.find(c => c.id === post.campaignId);
  const color = client ? getClientColor(client.id) : '#6B7280';

  const statusColors = {
    Draft: 'text-[#6B7280] bg-[#12121A]',
    'Ready for Review': 'text-yellow-400 bg-yellow-500/10',
    Approved: 'text-blue-400 bg-blue-500/10',
    Scheduled: 'text-purple-400 bg-purple-500/10',
    Published: 'text-emerald-400 bg-emerald-500/10',
    Rejected: 'text-red-400 bg-red-500/10',
  };

  const typeIcons = {
    'Image Post': Image,
    'Carousel': LayoutGrid,
    'Reel/Short Video': Film,
    'Story': Clock,
    'Text Post': MessageSquare,
    'Thread': MessageSquare,
    'Long-Form Video': Film,
    'Newsletter': FileText,
    'Blog Post': FileText,
  };
  const TypeIcon = typeIcons[post.type] || FileText;

  return (
    <div className="max-w-[800px]">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-[#6B7280] hover:text-white transition-colors p-1"><ArrowLeft size={18} /></button>
        <TypeIcon size={18} className="text-[#6B7280]" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white/90">{post.title}</h2>
          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
            {client && <span>{client.name}</span>}
            <span>-</span>
            <span>{post.platform}</span>
            <span>-</span>
            <span>{post.type}</span>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[post.status] || ''}`}>{post.status}</span>
        <button onClick={onEdit} className="p-2 text-[#6B7280] hover:text-white transition-colors rounded-md hover:bg-white/5"><Edit3 size={15} /></button>
        <button onClick={onDelete} className="p-2 text-[#6B7280] hover:text-red-400 transition-colors rounded-md hover:bg-white/5"><Trash2 size={15} /></button>
      </div>

      <div className="space-y-4">
        {/* Meta */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {post.scheduledDate && (
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-3">
              <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Scheduled</div>
              <div className="text-sm text-white/90">{formatDate(post.scheduledDate)}</div>
            </div>
          )}
          {campaign && (
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-3 cursor-pointer hover:border-[rgba(16,185,129,0.3)] transition-colors" onClick={() => onNavigate('campaigns', { campaignId: campaign.id })}>
              <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Campaign</div>
              <div className="text-sm text-emerald-400">{campaign.name}</div>
            </div>
          )}
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-3">
            <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1">Characters</div>
            <div className="text-sm text-white/90">{post.content?.length || 0}{PLATFORM_CHAR_LIMITS[post.platform] ? ` / ${PLATFORM_CHAR_LIMITS[post.platform]}` : ''}</div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-5">
          <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">Content</h3>
          <div className="text-sm text-[#9CA3AF] whitespace-pre-wrap leading-relaxed">{post.content}</div>
        </div>

        {/* Hashtags */}
        {(post.hashtags || []).length > 0 && (
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4">
            <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Hashtags</h3>
            <div className="flex flex-wrap gap-2">
              {post.hashtags.map(tag => (
                <span key={tag} className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">#{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Analytics */}
        {post.analytics && (
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4">
            <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart3 size={13} /> Analytics
            </h3>
            <div className="grid grid-cols-5 gap-3">
              {Object.entries(post.analytics).map(([key, val]) => (
                <div key={key} className="text-center">
                  <div className="text-lg font-bold text-white/90">{(val || 0).toLocaleString()}</div>
                  <div className="text-[10px] text-[#6B7280] uppercase tracking-wider capitalize">{key}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {post.notes && (
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4">
            <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Notes</h3>
            <p className="text-sm text-[#9CA3AF] whitespace-pre-wrap">{post.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AIContentAssistant({ clients }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const systemPrompt = `You are the Bear Witness Content Assistant — an expert social media content creator and copywriter. You help create engaging content for social media platforms.

Available clients: ${clients.map(c => `${c.name} (${c.sector}, platforms: ${c.platforms.join(', ')})`).join('; ')}

When asked to create content:
- Match the client's brand voice
- Respect platform character limits
- Include relevant hashtag suggestions
- Provide multiple variations when appropriate
- Be creative but on-brand`;

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const context = messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      const response = await callAI({ system: systemPrompt, user: context ? `${context}\nUser: ${userMsg}` : userMsg, maxTokens: 1500 });
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg flex flex-col h-[600px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2A2A3A]">
        <Brain size={15} className="text-emerald-400" />
        <h3 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">AI Content Assistant</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Brain size={28} className="text-[#6B7280] mx-auto mb-3" />
            <p className="text-sm text-[#6B7280] mb-1">Content Assistant</p>
            <p className="text-xs text-[#6B7280]">Generate captions, suggest hashtags, create content variations.</p>
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {["Write an Instagram caption for Ted's Health", 'Suggest TikTok content ideas for Water2', 'Create a LinkedIn post about sustainability'].map(q => (
                <button key={q} onClick={() => setInput(q)} className="text-xs bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-1.5 text-[#9CA3AF] hover:text-white hover:border-[#3A3A4A] transition-colors">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
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
              <span className="text-sm text-[#6B7280]">Writing...</span>
            </div>
          </div>
        )}
      </div>
      <div className="p-3 border-t border-[#2A2A3A] flex gap-2">
        <input
          className="flex-1 bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-2.5 text-sm text-white/90 placeholder:text-[#6B7280] focus:border-emerald-500/40 outline-none transition-colors"
          placeholder="Ask me to create content..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()} className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-[#1A1A26] disabled:text-[#6B7280] text-white text-sm rounded-md transition-colors">
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

export default function ContentCalendar({ onNavigate, params }) {
  const store = useStore();
  const [view, setView] = useState('calendar'); // calendar, queue, add, detail, edit, ai
  const [selectedPost, setSelectedPost] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState('month'); // month, week
  const [clientFilter, setClientFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [displayMode, setDisplayMode] = useState('calendar');

  useEffect(() => {
    if (params?.action === 'add') {
      setView('add');
    } else if (params?.postId) {
      const post = store.posts.find(p => p.id === params.postId);
      if (post) { setSelectedPost(post); setView('detail'); }
    }
  }, [params, store.posts]);

  useEffect(() => {
    if (selectedPost) {
      const updated = store.posts.find(p => p.id === selectedPost.id);
      if (updated) setSelectedPost(updated);
    }
  }, [store.posts, selectedPost]);

  const filteredPosts = useMemo(() => {
    return store.posts.filter(p => {
      if (clientFilter !== 'all' && p.clientId !== clientFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      return true;
    });
  }, [store.posts, clientFilter, statusFilter]);

  // Calendar grid days
  const calendarDays = useMemo(() => {
    if (calendarMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calStart, end: calEnd });
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    }
  }, [currentDate, calendarMode]);

  const getPostsForDay = (day) => {
    return filteredPosts.filter(p => {
      if (!p.scheduledDate) return false;
      return isSameDay(new Date(p.scheduledDate), day);
    });
  };

  const navigate = (direction) => {
    if (calendarMode === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'next' ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const handleAddPost = (data) => {
    const post = store.addPost(data);
    const client = store.clients.find(c => c.id === data.clientId);
    store.addActivity({
      type: data.status === 'Scheduled' ? 'post_scheduled' : 'post_created',
      message: `${data.status === 'Scheduled' ? 'Scheduled' : 'Created'} ${data.platform} ${data.type}: ${data.title}`,
      clientId: data.clientId,
      entityId: post.id,
    });
    setSelectedPost(post);
    setView('detail');
  };

  const handleUpdatePost = (data) => {
    store.updatePost(selectedPost.id, data);
    if (data.status === 'Published' && selectedPost.status !== 'Published') {
      store.updatePost(selectedPost.id, { publishedDate: new Date().toISOString() });
      store.addActivity({ type: 'post_published', message: `Published ${data.platform || selectedPost.platform} post: ${data.title || selectedPost.title}`, clientId: data.clientId || selectedPost.clientId, entityId: selectedPost.id });
    } else {
      store.addActivity({ type: 'post_updated', message: `Updated post: ${data.title || selectedPost.title}`, clientId: data.clientId || selectedPost.clientId, entityId: selectedPost.id });
    }
    setView('detail');
  };

  const handleDeletePost = () => {
    if (window.confirm(`Delete "${selectedPost.title}"?`)) {
      store.deletePost(selectedPost.id);
      setSelectedPost(null);
      setView(displayMode);
    }
  };

  const platformColors = {
    'Instagram': '#E1306C',
    'TikTok': '#00f2ea',
    'YouTube': '#FF0000',
    'LinkedIn': '#0077B5',
    'X/Twitter': '#1DA1F2',
    'Facebook': '#1877F2',
    'Threads': '#FFFFFF',
    'Newsletter': '#F59E0B',
    'Podcast': '#8B5CF6',
    'Substack': '#FF6719',
  };

  if (view === 'add') {
    return (
      <div className="max-w-[800px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView(displayMode)} className="text-[#6B7280] hover:text-white transition-colors p-1"><ArrowLeft size={18} /></button>
          <h2 className="text-lg font-semibold text-white/90">Create Post</h2>
        </div>
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-6">
          <PostForm
            clients={store.clients}
            campaigns={store.campaigns}
            onSave={handleAddPost}
            onCancel={() => setView(displayMode)}
            defaultClientId={params?.clientId}
            defaultCampaignId={params?.campaignId}
          />
        </div>
      </div>
    );
  }

  if (view === 'edit' && selectedPost) {
    return (
      <div className="max-w-[800px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('detail')} className="text-[#6B7280] hover:text-white transition-colors p-1"><ArrowLeft size={18} /></button>
          <h2 className="text-lg font-semibold text-white/90">Edit Post</h2>
        </div>
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-6">
          <PostForm initial={selectedPost} clients={store.clients} campaigns={store.campaigns} onSave={handleUpdatePost} onCancel={() => setView('detail')} />
        </div>
      </div>
    );
  }

  if (view === 'detail' && selectedPost) {
    return (
      <PostDetail
        post={selectedPost}
        onBack={() => { setView(displayMode); setSelectedPost(null); }}
        onEdit={() => setView('edit')}
        onDelete={handleDeletePost}
        onNavigate={onNavigate}
      />
    );
  }

  if (view === 'ai') {
    return (
      <div className="max-w-[700px]">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView(displayMode)} className="text-[#6B7280] hover:text-white transition-colors p-1"><ArrowLeft size={18} /></button>
          <h2 className="text-lg font-semibold text-white/90">AI Content Assistant</h2>
        </div>
        <AIContentAssistant clients={store.clients} />
      </div>
    );
  }

  // Main Calendar / Queue view
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-white/90">Content Calendar</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-[#1A1A26] border border-[#2A2A3A] rounded-md overflow-hidden">
            <button onClick={() => { setDisplayMode('calendar'); setView('calendar'); }} className={`px-3 py-1.5 text-xs transition-colors ${displayMode === 'calendar' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#6B7280] hover:text-white'}`}>
              <Calendar size={14} />
            </button>
            <button onClick={() => { setDisplayMode('queue'); setView('queue'); }} className={`px-3 py-1.5 text-xs transition-colors ${displayMode === 'queue' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#6B7280] hover:text-white'}`}>
              <List size={14} />
            </button>
          </div>
          <button onClick={() => setView('ai')} className="px-3 py-2 bg-[#1A1A26] border border-[#2A2A3A] text-[#9CA3AF] hover:text-emerald-400 hover:border-emerald-500/30 text-sm rounded-md transition-colors flex items-center gap-2">
            <Brain size={14} /> AI Assistant
          </button>
          <button onClick={() => setView('add')} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2">
            <Plus size={15} /> Create Post
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select className="bg-[#1A1A26] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-[#9CA3AF] outline-none" value={clientFilter} onChange={e => setClientFilter(e.target.value)}>
          <option value="all">All Clients</option>
          {store.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="bg-[#1A1A26] border border-[#2A2A3A] rounded-md px-3 py-2 text-sm text-[#9CA3AF] outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {POST_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Calendar View */}
      {displayMode === 'calendar' && (
        <div>
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('prev')} className="p-1.5 text-[#6B7280] hover:text-white transition-colors rounded hover:bg-white/5">
                <ChevronLeft size={16} />
              </button>
              <h3 className="text-sm font-semibold text-white/90 min-w-[160px] text-center">
                {calendarMode === 'month' ? format(currentDate, 'MMMM yyyy') : `Week of ${format(calendarDays[0], 'd MMM yyyy')}`}
              </h3>
              <button onClick={() => navigate('next')} className="p-1.5 text-[#6B7280] hover:text-white transition-colors rounded hover:bg-white/5">
                <ChevronRight size={16} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1">Today</button>
            </div>
            <div className="flex items-center bg-[#1A1A26] border border-[#2A2A3A] rounded-md overflow-hidden">
              <button onClick={() => setCalendarMode('month')} className={`px-3 py-1.5 text-xs transition-colors ${calendarMode === 'month' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#6B7280] hover:text-white'}`}>Month</button>
              <button onClick={() => setCalendarMode('week')} className={`px-3 py-1.5 text-xs transition-colors ${calendarMode === 'week' ? 'bg-emerald-500/20 text-emerald-400' : 'text-[#6B7280] hover:text-white'}`}>Week</button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-px bg-[#2A2A3A] rounded-t-lg overflow-hidden">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="bg-[#12121A] px-2 py-2 text-center text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-[#2A2A3A] rounded-b-lg overflow-hidden">
            {calendarDays.map(day => {
              const dayPosts = getPostsForDay(day);
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`bg-[#12121A] min-h-[100px] p-1.5 ${calendarMode === 'week' ? 'min-h-[200px]' : ''} ${!inMonth ? 'opacity-40' : ''}`}
                >
                  <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                    today ? 'bg-emerald-500 text-white' : 'text-[#9CA3AF]'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayPosts.slice(0, calendarMode === 'week' ? 10 : 3).map(post => {
                      const pColor = platformColors[post.platform] || '#6B7280';
                      return (
                        <button
                          key={post.id}
                          onClick={() => { setSelectedPost(post); setView('detail'); }}
                          className="w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate hover:opacity-80 transition-opacity block"
                          style={{ background: `${pColor}20`, color: pColor, borderLeft: `2px solid ${pColor}` }}
                          title={`${post.title} (${post.platform})`}
                        >
                          {post.title}
                        </button>
                      );
                    })}
                    {dayPosts.length > (calendarMode === 'week' ? 10 : 3) && (
                      <span className="text-[10px] text-[#6B7280] px-1">+{dayPosts.length - (calendarMode === 'week' ? 10 : 3)} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Queue / List View */}
      {displayMode === 'queue' && (
        <div>
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <Calendar size={32} className="text-[#6B7280] mx-auto mb-3" />
              <p className="text-sm text-[#6B7280]">No posts match your filters</p>
            </div>
          ) : (
            <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2A2A3A]">
                    <th className="text-left px-4 py-3 text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Post</th>
                    <th className="text-left px-4 py-3 text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Client</th>
                    <th className="text-left px-4 py-3 text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Platform</th>
                    <th className="text-left px-4 py-3 text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Status</th>
                    <th className="text-left px-4 py-3 text-[10px] text-[#6B7280] uppercase tracking-wider font-semibold">Date</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A3A]">
                  {filteredPosts
                    .sort((a, b) => {
                      if (!a.scheduledDate && !b.scheduledDate) return 0;
                      if (!a.scheduledDate) return 1;
                      if (!b.scheduledDate) return -1;
                      return new Date(a.scheduledDate) - new Date(b.scheduledDate);
                    })
                    .map(post => {
                      const client = store.clients.find(c => c.id === post.clientId);
                      const pColor = platformColors[post.platform] || '#6B7280';
                      const statusColors2 = {
                        Draft: 'text-[#6B7280] bg-[#12121A]',
                        'Ready for Review': 'text-yellow-400 bg-yellow-500/10',
                        Approved: 'text-blue-400 bg-blue-500/10',
                        Scheduled: 'text-purple-400 bg-purple-500/10',
                        Published: 'text-emerald-400 bg-emerald-500/10',
                        Rejected: 'text-red-400 bg-red-500/10',
                      };
                      return (
                        <tr
                          key={post.id}
                          className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => { setSelectedPost(post); setView('detail'); }}
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm text-white/90 font-medium">{post.title}</div>
                            <div className="text-xs text-[#6B7280]">{post.type}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#9CA3AF]">{client?.name || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: `${pColor}15`, color: pColor }}>{post.platform}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${statusColors2[post.status] || ''}`}>{post.status}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#6B7280]">{post.scheduledDate ? formatDate(post.scheduledDate) : '-'}</td>
                          <td className="px-4 py-3"><ChevronRight size={14} className="text-[#6B7280]" /></td>
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
  );
}
