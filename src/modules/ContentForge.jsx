import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { useToast } from '../components/Layout';
import { callAI } from '../lib/ai';
import { generateId, formatDate, PLATFORMS, POST_TYPES, PLATFORM_CHAR_LIMITS } from '../lib/utils';
import {
  Flame, Wand2, Megaphone, Copy, Check, ChevronDown, ChevronRight,
  Download, Save, Layers, Factory, Sparkles, Clock, Hash, Eye,
  Image, Video, FileText, Type, Camera, Smartphone, Monitor,
  Target, Zap, Users, BarChart3, Lightbulb, Calendar, X, Play,
  RefreshCw, BookOpen, Mail, Scissors, Repeat2, ArrowRight,
  MessageSquare, TrendingUp, Heart, Shield, Star, AlertCircle,
  Music, Globe,
} from 'lucide-react';

// ─── CONSTANTS ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'campaign', label: 'Campaign Generator', icon: Megaphone },
  { key: 'multiplier', label: 'Content Multiplier', icon: Layers },
  { key: 'ads', label: 'Ad Factory', icon: Factory },
];

const FORGE_PLATFORMS = [
  'Instagram', 'Facebook', 'LinkedIn', 'X/Twitter', 'TikTok', 'YouTube', 'Newsletter', 'Email',
];

const DURATIONS = [
  { value: '1-week', label: '1 Week' },
  { value: '2-weeks', label: '2 Weeks' },
  { value: '1-month', label: '1 Month' },
];

const TONES = [
  'Bold & Direct',
  'Educational',
  'Aspirational',
  'Community-driven',
  'Urgent/Promotional',
];

const CONTENT_TYPES = [
  'Product Photo',
  'Brand Photo',
  'Blog Post',
  'Video Script',
  'Existing Caption',
  'Article',
  'Press Release',
];

const AD_OBJECTIVES = ['Awareness', 'Consideration', 'Conversion'];

const AD_FORMATS = [
  'Single Image',
  'Carousel',
  'Video 15s',
  'Video 30s',
  'Video 60s',
  'Story',
];

const VARIATION_COUNTS = [3, 6, 9, 12];

const PLATFORM_ICONS_MAP = {
  'Instagram': Camera,
  'Facebook': Globe,
  'LinkedIn': BookOpen,
  'X/Twitter': MessageSquare,
  'TikTok': Music,
  'YouTube': Play,
  'Newsletter': Mail,
  'Email': Mail,
};

// ─── SYSTEM PROMPTS ─────────────────────────────────────────────────────────────

const CAMPAIGN_SYSTEM_PROMPT = `You are the Bear Witness content strategist. You create complete, ready-to-execute social media campaigns. Your philosophy: never sell the product directly. Educate people on the problems, position the brand as the solution. Every piece of content must feel native to its platform. You write in UK English. No em dashes. No exclamation marks. Direct, commercial, confident tone.

You MUST respond in valid JSON format only. No markdown, no code fences, no explanation text outside the JSON.

The JSON structure must be:
{
  "campaignOverview": {
    "name": "string",
    "theme": "string",
    "keyMessage": "string",
    "targetAudience": "string"
  },
  "contentCalendar": [
    {
      "day": 1,
      "date": "string (e.g. Day 1 - Monday)",
      "posts": [
        {
          "platform": "string",
          "postType": "string (Reel, Carousel, Story, Text Post, etc.)",
          "caption": "string (full caption, ready to copy)",
          "hashtags": "string",
          "visualDirection": "string (what to shoot or design)",
          "bestPostingTime": "string"
        }
      ]
    }
  ],
  "adScripts": [
    {
      "variation": 1,
      "hookType": "string",
      "hook15s": "string",
      "body30s": "string",
      "full60s": "string",
      "cta": "string",
      "visualDirection": "string"
    }
  ],
  "emailSequence": [
    {
      "emailNumber": 1,
      "type": "string (Announcement / Value-Add / Urgency Close)",
      "subjectLine": "string",
      "previewText": "string",
      "body": "string",
      "cta": "string"
    }
  ]
}`;

const MULTIPLIER_SYSTEM_PROMPT = `You are the Bear Witness content multiplier. Take one piece of content and transform it into platform-native versions for every selected platform. Each version must feel like it was written specifically for that platform, not just reformatted. Adjust length, tone, structure, hooks, and CTAs for each platform's audience behaviour. For visual content, provide creative direction for each platform's optimal format. You write in UK English. No em dashes. No exclamation marks.

You MUST respond in valid JSON format only. No markdown, no code fences, no explanation text outside the JSON.

The JSON structure must be:
{
  "platformVersions": [
    {
      "platform": "string",
      "postType": "string (Reel, Carousel, Static, Thread, Story, etc.)",
      "caption": "string (full text, platform-appropriate length)",
      "hashtags": "string (platform-specific count)",
      "creativeDirection": "string (how to adapt the visual)",
      "bestPostingDay": "string",
      "bestPostingTime": "string",
      "characterCount": number
    }
  ],
  "creativeDirections": [
    {
      "angle": "string (Lifestyle / Educational / Behind-the-Scenes / Testimonial-Style / Data-Driven / Emotional Story)",
      "concept": "string",
      "caption": "string",
      "visualBrief": "string"
    }
  ],
  "cameraMovementScripts": [
    {
      "movement": "string (Dolly In / Sweep / Arc / Static / Push / Pull)",
      "description": "string",
      "duration": "string",
      "mood": "string"
    }
  ]
}`;

const AD_FACTORY_SYSTEM_PROMPT = `You are the Bear Witness ad creative director. Generate ad variations that are scroll-stopping, commercially effective, and brand-aligned. Each variation must have a different hook. Test different emotional angles, pain points, and value propositions. Never repeat the same opening line across variations. Write for thumb-stopping first 3 seconds. UK English. No em dashes. No exclamation marks.

You MUST respond in valid JSON format only. No markdown, no code fences, no explanation text outside the JSON.

The JSON structure must be:
{
  "variations": [
    {
      "number": 1,
      "hookType": "string (Pain Point / Social Proof / Curiosity / Direct Offer / Fear of Missing Out / Authority / Transformation / Comparison)",
      "headline": "string",
      "primaryText": "string",
      "ctaText": "string",
      "visualDirection": "string",
      "videoScript": {
        "hook0to3s": "string",
        "problem3to10s": "string",
        "solution10to25s": "string",
        "cta25to30s": "string"
      }
    }
  ],
  "abTestRecommendation": {
    "recommended": [1, 2, 3],
    "reasoning": "string"
  },
  "budgetAllocation": {
    "testing": "string",
    "scaling": "string",
    "recommendation": "string"
  }
}`;

// ─── UTILITY COMPONENTS ─────────────────────────────────────────────────────────

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
      style={{
        background: copied ? '#10B98120' : '#1A1A26',
        border: `1px solid ${copied ? '#10B98140' : '#2A2A3A'}`,
        color: copied ? '#10B981' : '#9CA3AF',
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : label}
    </button>
  );
}

function CollapsibleSection({ title, icon: Icon, defaultOpen = false, badge, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: '#10B98115' }}
        >
          <Icon size={16} style={{ color: '#10B981' }} />
        </div>
        <span className="text-sm font-semibold flex-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
          {title}
        </span>
        {badge && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: '#10B98115', color: '#10B981' }}
          >
            {badge}
          </span>
        )}
        <ChevronDown
          size={16}
          className="transition-transform duration-200"
          style={{
            color: '#6B7280',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 border-t" style={{ borderColor: '#2A2A3A' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton({ steps }) {
  return (
    <div className="space-y-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ background: '#10B98115' }}
        >
          <Sparkles size={20} className="text-emerald-400 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Generating content...
          </p>
          <p className="text-xs" style={{ color: '#6B7280' }}>
            This may take 30-60 seconds
          </p>
        </div>
      </div>
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: '#222233' }}
          >
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                background: '#10B981',
                animationDelay: `${i * 0.3}s`,
              }}
            />
          </div>
          <div className="flex-1">
            <div
              className="h-3 rounded animate-pulse"
              style={{
                background: '#222233',
                width: `${60 + Math.random() * 30}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          </div>
        </div>
      ))}
      <div className="mt-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="h-16 rounded-lg animate-pulse"
            style={{
              background: '#222233',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function PlatformCheckboxes({ selected, onChange, platforms = FORGE_PLATFORMS }) {
  const toggle = (p) => {
    if (selected.includes(p)) {
      onChange(selected.filter(x => x !== p));
    } else {
      onChange([...selected, p]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map(p => {
        const active = selected.includes(p);
        const PIcon = PLATFORM_ICONS_MAP[p] || Monitor;
        return (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200"
            style={{
              background: active ? '#10B98115' : '#12121A',
              border: `1px solid ${active ? '#10B98140' : '#2A2A3A'}`,
              color: active ? '#10B981' : '#9CA3AF',
            }}
          >
            <PIcon size={14} />
            {p}
          </button>
        );
      })}
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold" style={{ color: '#9CA3AF' }}>
        {label}
        {required && <span style={{ color: '#10B981' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function SelectInput({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full text-sm rounded-lg px-4 py-2.5"
      style={{
        background: '#12121A',
        border: '1px solid #2A2A3A',
        color: value ? 'rgba(255,255,255,0.9)' : '#6B7280',
        outline: 'none',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(opt => (
        <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
          {typeof opt === 'string' ? opt : opt.label}
        </option>
      ))}
    </select>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm rounded-lg px-4 py-2.5"
      style={{
        background: '#12121A',
        border: '1px solid #2A2A3A',
        color: 'rgba(255,255,255,0.9)',
        outline: 'none',
      }}
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full text-sm rounded-lg px-4 py-3 resize-none"
      style={{
        background: '#12121A',
        border: '1px solid #2A2A3A',
        color: 'rgba(255,255,255,0.9)',
        outline: 'none',
        lineHeight: '1.6',
      }}
    />
  );
}

function CharCount({ text, platform }) {
  const limit = PLATFORM_CHAR_LIMITS[platform];
  const count = (text || '').length;
  const over = limit && count > limit;

  return (
    <span
      className="text-[10px] font-mono"
      style={{ color: over ? '#EF4444' : '#6B7280' }}
    >
      {count}{limit ? `/${limit}` : ''} chars
    </span>
  );
}

// ─── PARSE HELPERS ──────────────────────────────────────────────────────────────

function safeParseJSON(text) {
  try {
    // Try direct parse first
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code fences
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch { /* fall through */ }
    }
    // Try to find the first { ... } block
    const braceStart = text.indexOf('{');
    const braceEnd = text.lastIndexOf('}');
    if (braceStart !== -1 && braceEnd > braceStart) {
      try {
        return JSON.parse(text.slice(braceStart, braceEnd + 1));
      } catch { /* fall through */ }
    }
    return null;
  }
}

function formatAllOutput(data, type) {
  if (!data) return '';
  let text = '';

  if (type === 'campaign') {
    const ov = data.campaignOverview;
    if (ov) {
      text += `CAMPAIGN: ${ov.name}\n`;
      text += `Theme: ${ov.theme}\n`;
      text += `Key Message: ${ov.keyMessage}\n`;
      text += `Target Audience: ${ov.targetAudience}\n\n`;
    }
    if (data.contentCalendar) {
      text += '--- CONTENT CALENDAR ---\n\n';
      data.contentCalendar.forEach(day => {
        text += `${day.date}\n`;
        (day.posts || []).forEach(post => {
          text += `  [${post.platform}] ${post.postType}\n`;
          text += `  Caption: ${post.caption}\n`;
          text += `  Hashtags: ${post.hashtags}\n`;
          text += `  Visual: ${post.visualDirection}\n`;
          text += `  Time: ${post.bestPostingTime}\n\n`;
        });
      });
    }
    if (data.adScripts) {
      text += '--- AD SCRIPTS ---\n\n';
      data.adScripts.forEach(ad => {
        text += `Variation ${ad.variation} (${ad.hookType})\n`;
        text += `15s: ${ad.hook15s}\n`;
        text += `30s: ${ad.body30s}\n`;
        text += `60s: ${ad.full60s}\n`;
        text += `CTA: ${ad.cta}\n`;
        text += `Visual: ${ad.visualDirection}\n\n`;
      });
    }
    if (data.emailSequence) {
      text += '--- EMAIL SEQUENCE ---\n\n';
      data.emailSequence.forEach(email => {
        text += `Email ${email.emailNumber}: ${email.type}\n`;
        text += `Subject: ${email.subjectLine}\n`;
        text += `Preview: ${email.previewText}\n`;
        text += `Body: ${email.body}\n`;
        text += `CTA: ${email.cta}\n\n`;
      });
    }
  } else if (type === 'multiplier') {
    if (data.platformVersions) {
      text += '--- PLATFORM VERSIONS ---\n\n';
      data.platformVersions.forEach(v => {
        text += `[${v.platform}] ${v.postType}\n`;
        text += `Caption: ${v.caption}\n`;
        text += `Hashtags: ${v.hashtags}\n`;
        text += `Creative: ${v.creativeDirection}\n`;
        text += `Best Time: ${v.bestPostingDay} ${v.bestPostingTime}\n`;
        text += `Characters: ${v.characterCount}\n\n`;
      });
    }
    if (data.creativeDirections) {
      text += '--- 6 CREATIVE DIRECTIONS ---\n\n';
      data.creativeDirections.forEach(d => {
        text += `[${d.angle}]\n`;
        text += `Concept: ${d.concept}\n`;
        text += `Caption: ${d.caption}\n`;
        text += `Visual: ${d.visualBrief}\n\n`;
      });
    }
    if (data.cameraMovementScripts) {
      text += '--- CAMERA MOVEMENT SCRIPTS ---\n\n';
      data.cameraMovementScripts.forEach(c => {
        text += `${c.movement}: ${c.description}\n`;
        text += `Duration: ${c.duration} | Mood: ${c.mood}\n\n`;
      });
    }
  } else if (type === 'ads') {
    if (data.variations) {
      text += '--- AD VARIATIONS ---\n\n';
      data.variations.forEach(v => {
        text += `#${v.number} [${v.hookType}]\n`;
        text += `Headline: ${v.headline}\n`;
        text += `Primary Text: ${v.primaryText}\n`;
        text += `CTA: ${v.ctaText}\n`;
        text += `Visual: ${v.visualDirection}\n`;
        if (v.videoScript) {
          text += `Script 0-3s: ${v.videoScript.hook0to3s}\n`;
          text += `Script 3-10s: ${v.videoScript.problem3to10s}\n`;
          text += `Script 10-25s: ${v.videoScript.solution10to25s}\n`;
          text += `Script 25-30s: ${v.videoScript.cta25to30s}\n`;
        }
        text += '\n';
      });
    }
    if (data.abTestRecommendation) {
      text += '--- A/B TEST RECOMMENDATION ---\n';
      text += `Test variations: ${data.abTestRecommendation.recommended?.join(', ')}\n`;
      text += `Reasoning: ${data.abTestRecommendation.reasoning}\n\n`;
    }
    if (data.budgetAllocation) {
      text += '--- BUDGET ALLOCATION ---\n';
      text += `Testing: ${data.budgetAllocation.testing}\n`;
      text += `Scaling: ${data.budgetAllocation.scaling}\n`;
      text += `Recommendation: ${data.budgetAllocation.recommendation}\n`;
    }
  }

  return text;
}

function exportAsMarkdown(data, type, filename) {
  const text = formatAllOutput(data, type);
  const blob = new Blob([text], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `content-forge-${type}-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── HOOK TYPE COLOURS ──────────────────────────────────────────────────────────

const HOOK_COLORS = {
  'Pain Point': '#EF4444',
  'Social Proof': '#3B82F6',
  'Curiosity': '#F59E0B',
  'Direct Offer': '#10B981',
  'Fear of Missing Out': '#EC4899',
  'Authority': '#8B5CF6',
  'Transformation': '#14B8A6',
  'Comparison': '#F97316',
};

function getHookColor(hookType) {
  return HOOK_COLORS[hookType] || '#6B7280';
}

// ─── TAB 1: CAMPAIGN GENERATOR ──────────────────────────────────────────────────

function CampaignGenerator() {
  const { clients, addCampaign, addPost, addActivity } = useStore();
  const toast = useToast();

  const [clientId, setClientId] = useState('');
  const [goal, setGoal] = useState('');
  const [brief, setBrief] = useState('');
  const [duration, setDuration] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [tone, setTone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const selectedClient = useMemo(
    () => clients.find(c => c.id === clientId),
    [clients, clientId]
  );

  const canGenerate = clientId && goal && duration && platforms.length > 0 && tone;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    setResult(null);

    const client = clients.find(c => c.id === clientId);
    const durationLabel = DURATIONS.find(d => d.value === duration)?.label || duration;

    const userPrompt = `Create a complete campaign for:

CLIENT: ${client.name}
Sector: ${client.sector || 'Not specified'}
Brand Voice: ${client.brandVoice || 'Not specified'}
Target Audience: ${client.targetAudience || 'Not specified'}
Key Messages: ${client.keyMessages || 'Not specified'}

CAMPAIGN BRIEF:
Goal: ${goal}
Brief: ${brief || 'No additional brief provided'}
Duration: ${durationLabel}
Platforms: ${platforms.join(', ')}
Tone: ${tone}

Generate a complete, ready-to-execute campaign. Include ALL posts for all platforms across the full ${durationLabel} duration. Each post must have a complete, ready-to-copy caption. Include 3 ad script variations and a 3-email sequence.`;

    try {
      const response = await callAI({
        system: CAMPAIGN_SYSTEM_PROMPT,
        user: userPrompt,
        maxTokens: 8192,
      });

      const parsed = safeParseJSON(response);
      if (!parsed) {
        throw new Error('Failed to parse AI response. The output was not valid JSON.');
      }

      setResult(parsed);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [canGenerate, clients, clientId, goal, brief, duration, platforms, tone]);

  const handleSaveAsCampaign = useCallback(() => {
    if (!result || !selectedClient) return;

    const ov = result.campaignOverview || {};
    const campaign = addCampaign({
      clientId,
      name: ov.name || goal,
      description: `${ov.theme || ''}\n\nKey Message: ${ov.keyMessage || ''}\nTarget Audience: ${ov.targetAudience || ''}`,
      objective: 'Content Series',
      type: 'Organic',
      status: 'Planning',
      platforms,
      startDate: new Date().toISOString().split('T')[0],
      endDate: (() => {
        const d = new Date();
        if (duration === '1-week') d.setDate(d.getDate() + 7);
        else if (duration === '2-weeks') d.setDate(d.getDate() + 14);
        else d.setMonth(d.getMonth() + 1);
        return d.toISOString().split('T')[0];
      })(),
    });

    // Add all calendar posts
    if (result.contentCalendar) {
      const startDate = new Date();
      result.contentCalendar.forEach((day, dayIdx) => {
        (day.posts || []).forEach(post => {
          const postDate = new Date(startDate);
          postDate.setDate(postDate.getDate() + dayIdx);
          addPost({
            clientId,
            campaignId: campaign.id,
            platform: post.platform,
            postType: post.postType || 'Image Post',
            title: `${ov.name || goal} - ${post.platform} Day ${day.day || dayIdx + 1}`,
            content: post.caption,
            hashtags: post.hashtags,
            visualDirection: post.visualDirection,
            status: 'Draft',
            scheduledDate: postDate.toISOString().split('T')[0],
            scheduledTime: post.bestPostingTime || '09:00',
          });
        });
      });
    }

    addActivity({
      type: 'campaign_created',
      message: `Content Forge: Created campaign "${ov.name || goal}" for ${selectedClient.name} with ${result.contentCalendar?.reduce((sum, d) => sum + (d.posts?.length || 0), 0) || 0} posts`,
    });

    toast.addToast(`Campaign saved with all posts added to calendar`, 'success');
  }, [result, selectedClient, clientId, goal, duration, platforms, addCampaign, addPost, addActivity, toast]);

  const handleCopyAll = useCallback(() => {
    const text = formatAllOutput(result, 'campaign');
    navigator.clipboard.writeText(text);
    toast.addToast('Full campaign copied to clipboard', 'success');
  }, [result, toast]);

  const handleExport = useCallback(() => {
    const ov = result?.campaignOverview;
    exportAsMarkdown(result, 'campaign', `campaign-${(ov?.name || 'export').toLowerCase().replace(/\s+/g, '-')}.md`);
    toast.addToast('Campaign exported as markdown', 'success');
  }, [result, toast]);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div
        className="rounded-lg p-6 space-y-5"
        style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: '#10B98115' }}
          >
            <Megaphone size={18} style={{ color: '#10B981' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Campaign Generator
            </h3>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              Generate a complete, ready-to-execute campaign from a single brief
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField label="Client" required>
            <SelectInput
              value={clientId}
              onChange={setClientId}
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select a client..."
            />
          </FormField>

          <FormField label="Tone" required>
            <SelectInput
              value={tone}
              onChange={setTone}
              options={TONES}
              placeholder="Select tone..."
            />
          </FormField>
        </div>

        <FormField label="Campaign Goal" required>
          <TextInput
            value={goal}
            onChange={setGoal}
            placeholder='e.g. "Launch new TRT blood test kit" or "Drive signups for webinar"'
          />
        </FormField>

        <FormField label="One-Line Brief">
          <TextInput
            value={brief}
            onChange={setBrief}
            placeholder='e.g. "Emphasise convenience and privacy, target men 35-50"'
          />
        </FormField>

        <div className="grid grid-cols-2 gap-5">
          <FormField label="Duration" required>
            <SelectInput
              value={duration}
              onChange={setDuration}
              options={DURATIONS}
              placeholder="Select duration..."
            />
          </FormField>

          <div /> {/* spacer */}
        </div>

        <FormField label="Platforms" required>
          <PlatformCheckboxes selected={platforms} onChange={setPlatforms} />
        </FormField>

        {selectedClient && (
          <div
            className="rounded-lg p-4 flex items-start gap-3"
            style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
              style={{ background: '#10B98120', color: '#10B981' }}
            >
              {selectedClient.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="text-xs space-y-1 flex-1">
              <p style={{ color: 'rgba(255,255,255,0.9)' }} className="font-semibold">{selectedClient.name}</p>
              {selectedClient.sector && <p style={{ color: '#6B7280' }}>Sector: {selectedClient.sector}</p>}
              {selectedClient.targetAudience && <p style={{ color: '#6B7280' }}>Audience: {selectedClient.targetAudience}</p>}
              {selectedClient.brandVoice && <p style={{ color: '#6B7280' }}>Voice: {selectedClient.brandVoice}</p>}
            </div>
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
          className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            background: canGenerate && !loading ? '#10B981' : '#222233',
            color: canGenerate && !loading ? '#fff' : '#6B7280',
            cursor: canGenerate && !loading ? 'pointer' : 'not-allowed',
            border: 'none',
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Generating Campaign...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Campaign
            </>
          )}
        </button>

        {error && (
          <div
            className="rounded-lg p-4 flex items-start gap-3"
            style={{ background: '#EF444415', border: '1px solid #EF444430' }}
          >
            <AlertCircle size={16} style={{ color: '#EF4444' }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div
          className="rounded-lg p-6"
          style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
        >
          <LoadingSkeleton
            steps={[
              'Analysing client profile and brand voice...',
              'Generating campaign overview and theme...',
              'Writing platform-specific posts...',
              'Creating content calendar...',
              'Drafting ad script variations...',
              'Writing email sequence...',
            ]}
          />
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4" ref={resultRef}>
          {/* Action Bar */}
          <div
            className="rounded-lg p-4 flex items-center gap-3 flex-wrap"
            style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
          >
            <button
              onClick={handleSaveAsCampaign}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: '#10B981', color: '#fff', border: 'none' }}
            >
              <Save size={14} />
              Save as Campaign
            </button>
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: '#222233', color: '#9CA3AF', border: '1px solid #2A2A3A' }}
            >
              <Copy size={14} />
              Copy All
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: '#222233', color: '#9CA3AF', border: '1px solid #2A2A3A' }}
            >
              <Download size={14} />
              Export Markdown
            </button>
          </div>

          {/* Campaign Overview */}
          {result.campaignOverview && (
            <CollapsibleSection title="Campaign Overview" icon={Target} defaultOpen={true}>
              <div className="grid grid-cols-2 gap-4 pt-4">
                {[
                  { label: 'Campaign Name', value: result.campaignOverview.name, icon: Megaphone },
                  { label: 'Theme', value: result.campaignOverview.theme, icon: Lightbulb },
                  { label: 'Key Message', value: result.campaignOverview.keyMessage, icon: MessageSquare },
                  { label: 'Target Audience', value: result.campaignOverview.targetAudience, icon: Users },
                ].map(item => (
                  <div
                    key={item.label}
                    className="rounded-lg p-4"
                    style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon size={12} style={{ color: '#10B981' }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                        {item.label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Content Calendar */}
          {result.contentCalendar && result.contentCalendar.length > 0 && (
            <CollapsibleSection
              title="Content Calendar"
              icon={Calendar}
              defaultOpen={true}
              badge={`${result.contentCalendar.reduce((s, d) => s + (d.posts?.length || 0), 0)} posts`}
            >
              <div className="space-y-4 pt-4">
                {result.contentCalendar.map((day, dayIdx) => (
                  <div key={dayIdx}>
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                        style={{ background: '#10B98115', color: '#10B981' }}
                      >
                        {day.date || `Day ${day.day || dayIdx + 1}`}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {(day.posts || []).map((post, postIdx) => {
                        const PIcon = PLATFORM_ICONS_MAP[post.platform] || Monitor;
                        return (
                          <div
                            key={postIdx}
                            className="rounded-lg p-4 space-y-3"
                            style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <PIcon size={14} style={{ color: '#10B981' }} />
                                <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                                  {post.platform}
                                </span>
                                <span
                                  className="text-[10px] px-2 py-0.5 rounded-full"
                                  style={{ background: '#222233', color: '#9CA3AF' }}
                                >
                                  {post.postType}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {post.bestPostingTime && (
                                  <span className="text-[10px] flex items-center gap-1" style={{ color: '#6B7280' }}>
                                    <Clock size={10} />
                                    {post.bestPostingTime}
                                  </span>
                                )}
                                <CopyButton text={`${post.caption}\n\n${post.hashtags || ''}`} label="Copy" />
                              </div>
                            </div>

                            <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
                              {post.caption}
                            </p>

                            {post.hashtags && (
                              <div className="flex items-start gap-2">
                                <Hash size={10} style={{ color: '#3B82F6' }} className="mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] leading-relaxed" style={{ color: '#3B82F6' }}>
                                  {post.hashtags}
                                </p>
                              </div>
                            )}

                            {post.visualDirection && (
                              <div className="flex items-start gap-2">
                                <Eye size={10} style={{ color: '#F59E0B' }} className="mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] leading-relaxed" style={{ color: '#9CA3AF' }}>
                                  {post.visualDirection}
                                </p>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1">
                              <CharCount text={post.caption} platform={post.platform} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Ad Scripts */}
          {result.adScripts && result.adScripts.length > 0 && (
            <CollapsibleSection title="Ad Script Variations" icon={Video} badge={`${result.adScripts.length} scripts`}>
              <div className="space-y-4 pt-4">
                {result.adScripts.map((ad, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg p-4 space-y-3"
                    style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded"
                          style={{ background: `${getHookColor(ad.hookType)}20`, color: getHookColor(ad.hookType) }}
                        >
                          {ad.hookType}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          Variation {ad.variation}
                        </span>
                      </div>
                      <CopyButton text={`HOOK (15s): ${ad.hook15s}\n\nBODY (30s): ${ad.body30s}\n\nFULL (60s): ${ad.full60s}\n\nCTA: ${ad.cta}`} />
                    </div>

                    <div className="space-y-3">
                      {[
                        { label: '15s Hook', value: ad.hook15s, color: '#EF4444' },
                        { label: '30s Body', value: ad.body30s, color: '#F59E0B' },
                        { label: '60s Full', value: ad.full60s, color: '#10B981' },
                      ].map(section => (
                        <div key={section.label}>
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider inline-block mb-1"
                            style={{ color: section.color }}
                          >
                            {section.label}
                          </span>
                          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {section.value}
                          </p>
                        </div>
                      ))}

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider inline-block mb-1" style={{ color: '#8B5CF6' }}>
                          CTA
                        </span>
                        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {ad.cta}
                        </p>
                      </div>

                      {ad.visualDirection && (
                        <div className="flex items-start gap-2 pt-2" style={{ borderTop: '1px solid #2A2A3A' }}>
                          <Eye size={10} style={{ color: '#F59E0B' }} className="mt-0.5 flex-shrink-0" />
                          <p className="text-[10px] leading-relaxed" style={{ color: '#9CA3AF' }}>
                            {ad.visualDirection}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* Email Sequence */}
          {result.emailSequence && result.emailSequence.length > 0 && (
            <CollapsibleSection title="Email Sequence" icon={Mail} badge={`${result.emailSequence.length} emails`}>
              <div className="space-y-4 pt-4">
                {result.emailSequence.map((email, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg p-4 space-y-3"
                    style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded"
                          style={{ background: '#3B82F620', color: '#3B82F6' }}
                        >
                          Email {email.emailNumber}
                        </span>
                        <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {email.type}
                        </span>
                      </div>
                      <CopyButton text={`Subject: ${email.subjectLine}\nPreview: ${email.previewText}\n\n${email.body}\n\nCTA: ${email.cta}`} />
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>Subject Line</span>
                        <p className="text-sm font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {email.subjectLine}
                        </p>
                      </div>
                      {email.previewText && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>Preview</span>
                          <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{email.previewText}</p>
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>Body</span>
                        <p className="text-xs leading-relaxed mt-1 whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {email.body}
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-2 pt-2"
                        style={{ borderTop: '1px solid #2A2A3A' }}
                      >
                        <ArrowRight size={10} style={{ color: '#10B981' }} />
                        <span className="text-xs font-semibold" style={{ color: '#10B981' }}>
                          {email.cta}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TAB 2: CONTENT MULTIPLIER ──────────────────────────────────────────────────

function ContentMultiplier() {
  const { clients } = useStore();
  const toast = useToast();

  const [clientId, setClientId] = useState('');
  const [contentType, setContentType] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const selectedClient = useMemo(
    () => clients.find(c => c.id === clientId),
    [clients, clientId]
  );

  const canMultiply = clientId && contentType && contentInput.trim() && platforms.length > 0;

  const isVisualContent = ['Product Photo', 'Brand Photo'].includes(contentType);

  const handleMultiply = useCallback(async () => {
    if (!canMultiply) return;
    setLoading(true);
    setError('');
    setResult(null);

    const client = clients.find(c => c.id === clientId);

    const userPrompt = `Multiply this content for ${client.name}:

CLIENT: ${client.name}
Sector: ${client.sector || 'Not specified'}
Brand Voice: ${client.brandVoice || 'Not specified'}
Target Audience: ${client.targetAudience || 'Not specified'}

CONTENT TYPE: ${contentType}
${isVisualContent ? 'VISUAL DESCRIPTION' : 'CONTENT'}:
${contentInput}

TARGET PLATFORMS: ${platforms.join(', ')}

Transform this into platform-native versions for each selected platform. Also provide 6 creative directions (Lifestyle, Educational, Behind-the-Scenes, Testimonial-Style, Data-Driven, Emotional Story) and${isVisualContent ? ' camera movement scripts for video production (dolly in, sweep, arc, static, push, pull).' : ' camera movement scripts if this could be adapted to video.'}`;

    try {
      const response = await callAI({
        system: MULTIPLIER_SYSTEM_PROMPT,
        user: userPrompt,
        maxTokens: 6144,
      });

      const parsed = safeParseJSON(response);
      if (!parsed) {
        throw new Error('Failed to parse AI response. The output was not valid JSON.');
      }

      setResult(parsed);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [canMultiply, clients, clientId, contentType, contentInput, platforms, isVisualContent]);

  const handleCopyAll = useCallback(() => {
    const text = formatAllOutput(result, 'multiplier');
    navigator.clipboard.writeText(text);
    toast.addToast('All multiplied content copied to clipboard', 'success');
  }, [result, toast]);

  const handleExport = useCallback(() => {
    exportAsMarkdown(result, 'multiplier', `content-multiplied-${Date.now()}.md`);
    toast.addToast('Multiplied content exported as markdown', 'success');
  }, [result, toast]);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div
        className="rounded-lg p-6 space-y-5"
        style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: '#8B5CF615' }}
          >
            <Layers size={18} style={{ color: '#8B5CF6' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Content Multiplier
            </h3>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              Take one piece of content and transform it into platform-native versions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField label="Client" required>
            <SelectInput
              value={clientId}
              onChange={setClientId}
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select a client..."
            />
          </FormField>

          <FormField label="Content Type" required>
            <SelectInput
              value={contentType}
              onChange={setContentType}
              options={CONTENT_TYPES}
              placeholder="Select content type..."
            />
          </FormField>
        </div>

        <FormField label={isVisualContent ? 'Describe the photo/visual' : 'Paste your content'} required>
          <TextArea
            value={contentInput}
            onChange={setContentInput}
            placeholder={
              isVisualContent
                ? 'Describe the photo in detail: subject, setting, lighting, mood, products visible...'
                : 'Paste your blog post, article, caption, script, or press release here...'
            }
            rows={6}
          />
        </FormField>

        <FormField label="Target Platforms" required>
          <PlatformCheckboxes selected={platforms} onChange={setPlatforms} />
        </FormField>

        <button
          onClick={handleMultiply}
          disabled={!canMultiply || loading}
          className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            background: canMultiply && !loading ? '#8B5CF6' : '#222233',
            color: canMultiply && !loading ? '#fff' : '#6B7280',
            cursor: canMultiply && !loading ? 'pointer' : 'not-allowed',
            border: 'none',
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Multiplying Content...
            </>
          ) : (
            <>
              <Repeat2 size={16} />
              Multiply
            </>
          )}
        </button>

        {error && (
          <div
            className="rounded-lg p-4 flex items-start gap-3"
            style={{ background: '#EF444415', border: '1px solid #EF444430' }}
          >
            <AlertCircle size={16} style={{ color: '#EF4444' }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div
          className="rounded-lg p-6"
          style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
        >
          <LoadingSkeleton
            steps={[
              'Analysing source content...',
              'Adapting for each platform...',
              'Generating creative directions...',
              'Writing camera movement scripts...',
              'Optimising hashtags and timing...',
            ]}
          />
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4" ref={resultRef}>
          {/* Action Bar */}
          <div
            className="rounded-lg p-4 flex items-center gap-3 flex-wrap"
            style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
          >
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: '#222233', color: '#9CA3AF', border: '1px solid #2A2A3A' }}
            >
              <Copy size={14} />
              Copy All
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: '#222233', color: '#9CA3AF', border: '1px solid #2A2A3A' }}
            >
              <Download size={14} />
              Export Markdown
            </button>
          </div>

          {/* Platform Versions */}
          {result.platformVersions && result.platformVersions.length > 0 && (
            <CollapsibleSection
              title="Platform Versions"
              icon={Layers}
              defaultOpen={true}
              badge={`${result.platformVersions.length} versions`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                {result.platformVersions.map((version, idx) => {
                  const PIcon = PLATFORM_ICONS_MAP[version.platform] || Monitor;
                  const limit = PLATFORM_CHAR_LIMITS[version.platform];
                  const count = version.characterCount || (version.caption || '').length;
                  const over = limit && count > limit;

                  return (
                    <div
                      key={idx}
                      className="rounded-lg p-4 space-y-3"
                      style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: '#8B5CF615' }}
                          >
                            <PIcon size={14} style={{ color: '#8B5CF6' }} />
                          </div>
                          <div>
                            <span className="text-xs font-semibold block" style={{ color: 'rgba(255,255,255,0.9)' }}>
                              {version.platform}
                            </span>
                            <span className="text-[10px]" style={{ color: '#6B7280' }}>
                              {version.postType}
                            </span>
                          </div>
                        </div>
                        <CopyButton text={`${version.caption}\n\n${version.hashtags || ''}`} />
                      </div>

                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
                        {version.caption}
                      </p>

                      {version.hashtags && (
                        <div className="flex items-start gap-2">
                          <Hash size={10} style={{ color: '#3B82F6' }} className="mt-0.5 flex-shrink-0" />
                          <p className="text-[10px] leading-relaxed" style={{ color: '#3B82F6' }}>
                            {version.hashtags}
                          </p>
                        </div>
                      )}

                      {version.creativeDirection && (
                        <div className="flex items-start gap-2">
                          <Eye size={10} style={{ color: '#F59E0B' }} className="mt-0.5 flex-shrink-0" />
                          <p className="text-[10px] leading-relaxed" style={{ color: '#9CA3AF' }}>
                            {version.creativeDirection}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid #2A2A3A' }}>
                        <div className="flex items-center gap-3">
                          {version.bestPostingDay && (
                            <span className="text-[10px] flex items-center gap-1" style={{ color: '#6B7280' }}>
                              <Calendar size={10} />
                              {version.bestPostingDay}
                            </span>
                          )}
                          {version.bestPostingTime && (
                            <span className="text-[10px] flex items-center gap-1" style={{ color: '#6B7280' }}>
                              <Clock size={10} />
                              {version.bestPostingTime}
                            </span>
                          )}
                        </div>
                        <span
                          className="text-[10px] font-mono"
                          style={{ color: over ? '#EF4444' : '#6B7280' }}
                        >
                          {count}{limit ? `/${limit}` : ''} chars
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* 6 Creative Directions */}
          {result.creativeDirections && result.creativeDirections.length > 0 && (
            <CollapsibleSection
              title="6 Creative Directions"
              icon={Lightbulb}
              badge={`${result.creativeDirections.length} angles`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {result.creativeDirections.map((dir, idx) => {
                  const angleColors = {
                    'Lifestyle': '#10B981',
                    'Educational': '#3B82F6',
                    'Behind-the-Scenes': '#F59E0B',
                    'Testimonial-Style': '#EC4899',
                    'Data-Driven': '#8B5CF6',
                    'Emotional Story': '#EF4444',
                  };
                  const color = angleColors[dir.angle] || '#6B7280';

                  return (
                    <div
                      key={idx}
                      className="rounded-lg p-4 space-y-3"
                      style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="text-[10px] font-bold px-2 py-1 rounded"
                          style={{ background: `${color}20`, color }}
                        >
                          {dir.angle}
                        </span>
                        <CopyButton text={`[${dir.angle}]\nConcept: ${dir.concept}\nCaption: ${dir.caption}\nVisual: ${dir.visualBrief}`} />
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>Concept</span>
                        <p className="text-xs leading-relaxed mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {dir.concept}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>Caption</span>
                        <p className="text-xs leading-relaxed mt-0.5 whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
                          {dir.caption}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>Visual Brief</span>
                        <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: '#9CA3AF' }}>
                          {dir.visualBrief}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* Camera Movement Scripts */}
          {result.cameraMovementScripts && result.cameraMovementScripts.length > 0 && (
            <CollapsibleSection title="Camera Movement Scripts" icon={Video} badge="Video Production">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {result.cameraMovementScripts.map((cam, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg p-4 space-y-2"
                    style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-bold px-2 py-1 rounded"
                        style={{ background: '#F59E0B20', color: '#F59E0B' }}
                      >
                        {cam.movement}
                      </span>
                      <CopyButton text={`${cam.movement}: ${cam.description}\nDuration: ${cam.duration}\nMood: ${cam.mood}`} />
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {cam.description}
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px]" style={{ color: '#6B7280' }}>
                        Duration: {cam.duration}
                      </span>
                      <span className="text-[10px]" style={{ color: '#6B7280' }}>
                        Mood: {cam.mood}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TAB 3: AD FACTORY ──────────────────────────────────────────────────────────

function AdFactory() {
  const { clients } = useStore();
  const toast = useToast();

  const [clientId, setClientId] = useState('');
  const [product, setProduct] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [objective, setObjective] = useState('');
  const [format, setFormat] = useState('');
  const [variationCount, setVariationCount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);

  const selectedClient = useMemo(
    () => clients.find(c => c.id === clientId),
    [clients, clientId]
  );

  // Auto-fill target audience from client profile
  useEffect(() => {
    if (selectedClient?.targetAudience && !targetAudience) {
      setTargetAudience(selectedClient.targetAudience);
    }
  }, [selectedClient]);

  const canGenerate = clientId && product && objective && format && variationCount;

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError('');
    setResult(null);

    const client = clients.find(c => c.id === clientId);

    const userPrompt = `Generate ad variations for:

CLIENT: ${client.name}
Sector: ${client.sector || 'Not specified'}
Brand Voice: ${client.brandVoice || 'Not specified'}

PRODUCT/SERVICE: ${product}
TARGET AUDIENCE: ${targetAudience || client.targetAudience || 'Not specified'}
AD OBJECTIVE: ${objective}
AD FORMAT: ${format}
NUMBER OF VARIATIONS: ${variationCount}

Generate exactly ${variationCount} ad variations. Each must have a unique hook type and angle. Include video scripts with timestamp markers for video formats. Include A/B testing recommendation and budget allocation suggestion.`;

    try {
      const response = await callAI({
        system: AD_FACTORY_SYSTEM_PROMPT,
        user: userPrompt,
        maxTokens: 6144,
      });

      const parsed = safeParseJSON(response);
      if (!parsed) {
        throw new Error('Failed to parse AI response. The output was not valid JSON.');
      }

      setResult(parsed);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [canGenerate, clients, clientId, product, targetAudience, objective, format, variationCount]);

  const handleCopyAll = useCallback(() => {
    const text = formatAllOutput(result, 'ads');
    navigator.clipboard.writeText(text);
    toast.addToast('All ad variations copied to clipboard', 'success');
  }, [result, toast]);

  const handleExport = useCallback(() => {
    exportAsMarkdown(result, 'ads', `ad-variations-${Date.now()}.md`);
    toast.addToast('Ad variations exported as markdown', 'success');
  }, [result, toast]);

  return (
    <div className="space-y-6">
      {/* Form */}
      <div
        className="rounded-lg p-6 space-y-5"
        style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: '#F59E0B15' }}
          >
            <Factory size={18} style={{ color: '#F59E0B' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Ad Factory
            </h3>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              Generate scroll-stopping ad variations with unique hooks and creative briefs
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <FormField label="Client" required>
            <SelectInput
              value={clientId}
              onChange={setClientId}
              options={clients.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Select a client..."
            />
          </FormField>

          <FormField label="Ad Objective" required>
            <SelectInput
              value={objective}
              onChange={setObjective}
              options={AD_OBJECTIVES}
              placeholder="Select objective..."
            />
          </FormField>
        </div>

        <FormField label="Product / Service Being Advertised" required>
          <TextInput
            value={product}
            onChange={setProduct}
            placeholder='e.g. "TRT blood test kit" or "Be Military Fit 12-week programme"'
          />
        </FormField>

        <FormField label="Target Audience">
          <TextInput
            value={targetAudience}
            onChange={setTargetAudience}
            placeholder="Auto-fills from client profile, or enter custom audience..."
          />
        </FormField>

        <div className="grid grid-cols-2 gap-5">
          <FormField label="Ad Format" required>
            <SelectInput
              value={format}
              onChange={setFormat}
              options={AD_FORMATS}
              placeholder="Select format..."
            />
          </FormField>

          <FormField label="Number of Variations" required>
            <SelectInput
              value={variationCount}
              onChange={setVariationCount}
              options={VARIATION_COUNTS.map(n => ({ value: String(n), label: `${n} variations` }))}
              placeholder="Select count..."
            />
          </FormField>
        </div>

        <button
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
          className="w-full py-3 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2"
          style={{
            background: canGenerate && !loading ? '#F59E0B' : '#222233',
            color: canGenerate && !loading ? '#000' : '#6B7280',
            cursor: canGenerate && !loading ? 'pointer' : 'not-allowed',
            border: 'none',
          }}
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Generating Ads...
            </>
          ) : (
            <>
              <Zap size={16} />
              Generate Ads
            </>
          )}
        </button>

        {error && (
          <div
            className="rounded-lg p-4 flex items-start gap-3"
            style={{ background: '#EF444415', border: '1px solid #EF444430' }}
          >
            <AlertCircle size={16} style={{ color: '#EF4444' }} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div
          className="rounded-lg p-6"
          style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
        >
          <LoadingSkeleton
            steps={[
              'Analysing product and audience...',
              'Generating unique hook variations...',
              'Writing ad copy and headlines...',
              'Creating video scripts with timestamps...',
              'Building creative briefs...',
              'Formulating A/B test recommendations...',
            ]}
          />
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4" ref={resultRef}>
          {/* Action Bar */}
          <div
            className="rounded-lg p-4 flex items-center gap-3 flex-wrap"
            style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
          >
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: '#222233', color: '#9CA3AF', border: '1px solid #2A2A3A' }}
            >
              <Copy size={14} />
              Copy All
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: '#222233', color: '#9CA3AF', border: '1px solid #2A2A3A' }}
            >
              <Download size={14} />
              Export Markdown
            </button>
            {result.variations && (
              <span className="text-xs ml-auto" style={{ color: '#6B7280' }}>
                {result.variations.length} variations generated
              </span>
            )}
          </div>

          {/* Ad Variations Grid */}
          {result.variations && result.variations.length > 0 && (
            <CollapsibleSection
              title="Ad Variations"
              icon={Zap}
              defaultOpen={true}
              badge={`${result.variations.length} ads`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                {result.variations.map((ad, idx) => {
                  const hookColor = getHookColor(ad.hookType);
                  const isVideo = format.startsWith('Video');

                  return (
                    <div
                      key={idx}
                      className="rounded-lg overflow-hidden"
                      style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
                    >
                      {/* Header */}
                      <div
                        className="px-4 py-3 flex items-center justify-between"
                        style={{ borderBottom: '1px solid #2A2A3A' }}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ background: `${hookColor}20`, color: hookColor }}
                          >
                            {ad.number || idx + 1}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{ background: `${hookColor}15`, color: hookColor }}
                          >
                            {ad.hookType}
                          </span>
                        </div>
                        <CopyButton
                          text={`Headline: ${ad.headline}\n\n${ad.primaryText}\n\nCTA: ${ad.ctaText}${ad.videoScript ? `\n\nVIDEO SCRIPT:\n0-3s: ${ad.videoScript.hook0to3s}\n3-10s: ${ad.videoScript.problem3to10s}\n10-25s: ${ad.videoScript.solution10to25s}\n25-30s: ${ad.videoScript.cta25to30s}` : ''}`}
                        />
                      </div>

                      {/* Body */}
                      <div className="p-4 space-y-3">
                        {ad.headline && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                              Headline
                            </span>
                            <p className="text-sm font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.9)' }}>
                              {ad.headline}
                            </p>
                          </div>
                        )}

                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                            Primary Text
                          </span>
                          <p className="text-xs leading-relaxed mt-1 whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.85)' }}>
                            {ad.primaryText}
                          </p>
                        </div>

                        <div
                          className="flex items-center gap-2 py-2"
                          style={{ borderTop: '1px solid #2A2A3A', borderBottom: '1px solid #2A2A3A' }}
                        >
                          <ArrowRight size={12} style={{ color: '#10B981' }} />
                          <span className="text-xs font-semibold" style={{ color: '#10B981' }}>
                            {ad.ctaText}
                          </span>
                        </div>

                        {ad.visualDirection && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#F59E0B' }}>
                              Creative Brief
                            </span>
                            <p className="text-[10px] leading-relaxed mt-0.5" style={{ color: '#9CA3AF' }}>
                              {ad.visualDirection}
                            </p>
                          </div>
                        )}

                        {/* Video Script */}
                        {ad.videoScript && (
                          <div
                            className="rounded-lg p-3 space-y-2"
                            style={{ background: '#0A0A0F', border: '1px solid #2A2A3A' }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <Play size={10} style={{ color: '#8B5CF6' }} />
                              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8B5CF6' }}>
                                Video Script
                              </span>
                            </div>
                            {[
                              { time: '0-3s', label: 'Hook', value: ad.videoScript.hook0to3s, color: '#EF4444' },
                              { time: '3-10s', label: 'Problem', value: ad.videoScript.problem3to10s, color: '#F59E0B' },
                              { time: '10-25s', label: 'Solution', value: ad.videoScript.solution10to25s, color: '#10B981' },
                              { time: '25-30s', label: 'CTA', value: ad.videoScript.cta25to30s, color: '#3B82F6' },
                            ].map(section => (
                              <div key={section.time} className="flex items-start gap-2">
                                <span
                                  className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                                  style={{ background: `${section.color}15`, color: section.color }}
                                >
                                  {section.time}
                                </span>
                                <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                  {section.value}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}

          {/* A/B Test Recommendation */}
          {result.abTestRecommendation && (
            <CollapsibleSection title="A/B Testing Recommendation" icon={BarChart3} defaultOpen={true}>
              <div
                className="rounded-lg p-4 mt-4 space-y-3"
                style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp size={14} style={{ color: '#10B981' }} />
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    Test These First
                  </span>
                </div>
                {result.abTestRecommendation.recommended && (
                  <div className="flex items-center gap-2">
                    {result.abTestRecommendation.recommended.map(num => {
                      const ad = result.variations?.find(v => v.number === num);
                      const color = ad ? getHookColor(ad.hookType) : '#6B7280';
                      return (
                        <span
                          key={num}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg"
                          style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                        >
                          Variation {num}{ad ? ` (${ad.hookType})` : ''}
                        </span>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs leading-relaxed" style={{ color: '#9CA3AF' }}>
                  {result.abTestRecommendation.reasoning}
                </p>
              </div>
            </CollapsibleSection>
          )}

          {/* Budget Allocation */}
          {result.budgetAllocation && (
            <CollapsibleSection title="Budget Allocation" icon={Target}>
              <div className="space-y-3 pt-4">
                {[
                  { label: 'Testing Phase', value: result.budgetAllocation.testing, icon: Zap, color: '#F59E0B' },
                  { label: 'Scaling Phase', value: result.budgetAllocation.scaling, icon: TrendingUp, color: '#10B981' },
                ].map(item => (
                  <div
                    key={item.label}
                    className="rounded-lg p-4 flex items-start gap-3"
                    style={{ background: '#12121A', border: '1px solid #2A2A3A' }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}15` }}
                    >
                      <item.icon size={14} style={{ color: item.color }} />
                    </div>
                    <div>
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        {item.label}
                      </span>
                      <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#9CA3AF' }}>
                        {item.value}
                      </p>
                    </div>
                  </div>
                ))}

                {result.budgetAllocation.recommendation && (
                  <div
                    className="rounded-lg p-4"
                    style={{ background: '#10B98110', border: '1px solid #10B98130' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb size={12} style={{ color: '#10B981' }} />
                      <span className="text-xs font-semibold" style={{ color: '#10B981' }}>
                        Recommendation
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                      {result.budgetAllocation.recommendation}
                    </p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}
    </div>
  );
}

// ─── MAIN MODULE ────────────────────────────────────────────────────────────────

export default function ContentForge({ onNavigate, params }) {
  const [activeTab, setActiveTab] = useState('campaign');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: '#10B98115' }}
          >
            <Flame size={22} style={{ color: '#10B981' }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
              Content Forge
            </h1>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              AI-powered content generation engine. Minimal input, maximum output.
            </p>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div
        className="flex items-center gap-0 rounded-lg overflow-hidden"
        style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          const TIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all duration-200 relative"
              style={{
                color: active ? 'rgba(255,255,255,0.95)' : '#6B7280',
                background: active ? '#222233' : 'transparent',
              }}
            >
              <TIcon size={16} style={{ color: active ? '#10B981' : '#6B7280' }} />
              {tab.label}
              {active && (
                <div
                  className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full"
                  style={{ background: '#10B981' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'campaign' && <CampaignGenerator />}
      {activeTab === 'multiplier' && <ContentMultiplier />}
      {activeTab === 'ads' && <AdFactory />}
    </div>
  );
}
