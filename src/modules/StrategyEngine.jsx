import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../hooks/useStore';
import { callAI } from '../lib/ai';
import {
  generateId, formatDate, formatDateTime, relativeTime, truncate, classNames,
  getClientColor, getInitials
} from '../lib/utils';
import {
  Compass, ChevronRight, ChevronLeft, Search, Globe, Brain, Zap, FileText,
  Copy, Check, ArrowRight, Plus, Trash2, Eye, Clock, User, Building,
  Target, Lightbulb, Map, Layout, Camera, X, ChevronDown, ChevronUp,
  Sparkles, List, ArrowLeft, RefreshCw
} from 'lucide-react';

const STRATEGY_SYSTEM_PROMPT = `You are the Bear Witness Strategy Engine. You create mission-based, narrative-driven social media strategies. Your core philosophy: Never sell the product. Educate people on the problems. Position the brand as the solution. Seek gratitude, not transactions. One product solves many problems. Different people feel different problems. Build a narrative for each.

You must analyse the brand through the Bear Witness narrative lens, checking every territory: primal/ancestral living, provide and protect, family/faith/legacy, control and autonomy, health and wellness, self-reliance and independence, freedom from broken systems, environmental stewardship. For each genuine connection, build a full mission narrative.

No single mission narrative should dominate. The power is breadth: different narratives appeal to different people, all converging on the same product.

Output a complete strategy covering: Executive Summary with unifying thread, Mission Narrative Map (all narratives weighted and interconnected), Content Pillars (3-6, each with full structure), Platform Strategy (per-platform with frequency and prioritisation tiers), and Content Capture Outlines (per-pillar).

Be direct, opinionated, and strategic. This is consultancy-grade work. Come with opinions, not templates. Use UK English. Never use em dashes. No corporate jargon. No motivational fluff.`;

const STEPS = [
  { key: 'client', label: 'Select Client', icon: User },
  { key: 'research', label: 'AI Research', icon: Globe },
  { key: 'interrogation', label: 'Brand Interrogation', icon: Brain },
  { key: 'generate', label: 'Generate Strategy', icon: Zap },
  { key: 'review', label: 'Review Strategy', icon: FileText },
];

// ── Loading Skeleton ──────────────────────────────────────────────────
function LoadingSkeleton({ lines = 5, className = '' }) {
  return (
    <div className={classNames('space-y-3 animate-pulse', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-[#1A1A26] rounded" style={{ width: `${90 - i * 10}%` }} />
      ))}
    </div>
  );
}

// ── Step Indicator ────────────────────────────────────────────────────
function StepIndicator({ steps, currentStep, onStepClick }) {
  const currentIdx = steps.findIndex(s => s.key === currentStep);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = step.key === currentStep;
        const isCompleted = i < currentIdx;
        return (
          <div key={step.key} className="flex items-center">
            <button
              onClick={() => isCompleted && onStepClick(step.key)}
              disabled={!isCompleted}
              className={classNames(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap',
                isActive && 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30',
                isCompleted && 'bg-[#222233] text-[#9CA3AF] border border-[#2A2A3A] cursor-pointer hover:border-[#3A3A4A]',
                !isActive && !isCompleted && 'text-[#6B7280] border border-transparent cursor-default'
              )}
            >
              <Icon size={14} />
              {step.label}
            </button>
            {i < steps.length - 1 && (
              <ChevronRight size={14} className="text-[#2A2A3A] mx-1 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Client Select ──────────────────────────────────────────────
function StepClient({ clients, selectedClient, onSelect }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">Select Client</h2>
        <p className="text-[#6B7280] text-sm mt-1">Choose the client you are building a strategy for.</p>
      </div>
      {clients.length === 0 ? (
        <div className="text-center py-12 text-[#6B7280]">
          <Building size={32} className="mx-auto mb-3 text-[#2A2A3A]" />
          <p className="text-sm">No clients yet. Add a client in the Client Hub first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {clients.map(client => (
            <button
              key={client.id}
              onClick={() => onSelect(client)}
              className={classNames(
                'text-left p-4 rounded-lg border transition-colors',
                selectedClient?.id === client.id
                  ? 'bg-[#10B981]/10 border-[#10B981]/30'
                  : 'bg-[#1A1A26] border-[#2A2A3A] hover:border-[#3A3A4A]'
              )}
            >
              <h3 className="text-[rgba(255,255,255,0.9)] font-medium text-sm">{client.name}</h3>
              {client.sector && <p className="text-[#6B7280] text-xs mt-0.5">{client.sector}</p>}
              {client.status && (
                <span className={classNames(
                  'inline-block mt-2 px-2 py-0.5 text-xs rounded-md',
                  client.status === 'Active' ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#222233] text-[#6B7280]'
                )}>
                  {client.status}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Step 2: AI Research Phase ──────────────────────────────────────────
function StepResearch({ client, researchData, setResearchData, loading, setLoading }) {
  const handleResearch = async () => {
    setLoading(true);
    try {
      const response = await callAI({
        system: `You are a brand research analyst for Bear Witness, a social media strategy agency. Research the following brand thoroughly. Provide structured findings covering: company overview, key products/services, target audience, market positioning, competitors, recent news/developments, social media presence, and brand tone of voice. Be factual and concise. Use UK English. Never use em dashes.`,
        user: `Research the brand: ${client.name}${client.website ? ` (website: ${client.website})` : ''}${client.sector ? ` in the ${client.sector} sector` : ''}${client.platforms?.length ? `. Active on: ${client.platforms.join(', ')}` : ''}. Provide comprehensive findings that will inform a social media strategy.`,
        maxTokens: 2000,
        useWebSearch: true,
      });
      setResearchData(response);
    } catch (err) {
      setResearchData(`Error during research: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">AI Research Phase</h2>
        <p className="text-[#6B7280] text-sm mt-1">
          Let AI research <span className="text-[#10B981]">{client.name}</span> using web search to gather intelligence before strategy creation.
        </p>
      </div>

      {!researchData && !loading && (
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-6 text-center">
          <Globe size={32} className="mx-auto mb-3 text-[#10B981]/50" />
          <p className="text-[#9CA3AF] text-sm mb-4">
            Phase 0: automated brand research using web search. This step is optional but recommended.
          </p>
          <button
            onClick={handleResearch}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-medium rounded-lg text-sm"
          >
            <Globe size={16} />
            Research {client.name}
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-4 h-4 rounded-full border-2 border-[#10B981] border-t-transparent animate-spin" />
            <span className="text-[#9CA3AF] text-sm">Researching {client.name} across the web...</span>
          </div>
          <LoadingSkeleton lines={8} />
        </div>
      )}

      {researchData && !loading && (
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[rgba(255,255,255,0.9)] font-semibold text-sm flex items-center gap-2">
              <Globe size={16} className="text-[#10B981]" />
              Research Findings
            </h3>
            <button
              onClick={handleResearch}
              className="flex items-center gap-1 text-[#6B7280] hover:text-[#9CA3AF] text-xs"
            >
              <RefreshCw size={12} />
              Re-run
            </button>
          </div>
          <div className="text-[#9CA3AF] text-sm whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto">{researchData}</div>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Brand Interrogation ────────────────────────────────────────
function StepInterrogation({ interrogation, setInterrogation }) {
  const sections = [
    {
      title: 'Brand',
      fields: [
        { key: 'originStory', label: 'Origin Story', placeholder: 'How did this brand start? What sparked it? Why does it exist?' },
        { key: 'beliefs', label: 'Core Beliefs', placeholder: 'What does the brand fundamentally believe about the world?' },
      ],
    },
    {
      title: 'Product / Service',
      fields: [
        { key: 'howItWorks', label: 'How It Works', placeholder: 'What does the product or service actually do? How does the customer use it?' },
        { key: 'differentiator', label: 'Differentiator', placeholder: 'What makes this genuinely different from competitors?' },
        { key: 'price', label: 'Price Point', placeholder: 'Price range and how it is positioned (premium, accessible, etc.)' },
      ],
    },
    {
      title: 'Customer',
      fields: [
        { key: 'whoBuys', label: 'Who Buys', placeholder: 'Primary customer profile(s). Demographics, psychographics, lifestyle.' },
        { key: 'transformation', label: 'Transformation', placeholder: 'What transformation does the customer experience? Before vs after.' },
      ],
    },
    {
      title: 'Enemy',
      fields: [
        { key: 'enemy', label: 'The Enemy', placeholder: 'What problem, system, or status quo is the brand fighting against?' },
      ],
    },
    {
      title: 'Values',
      fields: [
        { key: 'values', label: 'Values / Red Lines', placeholder: 'What does the brand refuse to do? What are its non-negotiables?' },
      ],
    },
    {
      title: 'Existing Presence',
      fields: [
        { key: 'existingPresence', label: 'Current Social Presence', placeholder: 'Current social accounts, follower counts, posting frequency, content style, tone of voice, engagement rates.' },
      ],
    },
  ];

  const handleChange = (key, value) => {
    setInterrogation(prev => ({ ...prev, [key]: value }));
  };

  const filledCount = Object.values(interrogation).filter(v => v?.trim()).length;
  const totalFields = sections.reduce((acc, s) => acc + s.fields.length, 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">Brand Interrogation</h2>
        <p className="text-[#6B7280] text-sm mt-1">
          Answer as much as you can. More detail produces better strategies.
          <span className="ml-2 text-[#10B981]">{filledCount}/{totalFields} completed</span>
        </p>
      </div>

      {sections.map(section => (
        <div key={section.title} className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4">
          <h3 className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider mb-3">{section.title}</h3>
          <div className="space-y-3">
            {section.fields.map(field => (
              <div key={field.key}>
                <label className="block text-[rgba(255,255,255,0.9)] text-sm mb-1">{field.label}</label>
                <textarea
                  value={interrogation[field.key] || ''}
                  onChange={e => handleChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={2}
                  className="w-full resize-y min-h-[56px]"
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Step 4: Generate Strategy ──────────────────────────────────────────
function StepGenerate({ client, researchData, interrogation, strategy, setStrategy, loading, setLoading }) {
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const interrogationText = Object.entries(interrogation)
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => {
          const labels = {
            originStory: 'Origin Story',
            beliefs: 'Core Beliefs',
            howItWorks: 'How It Works',
            differentiator: 'Differentiator',
            price: 'Price Point',
            whoBuys: 'Who Buys',
            transformation: 'Customer Transformation',
            enemy: 'The Enemy',
            values: 'Values / Red Lines',
            existingPresence: 'Existing Social Presence',
          };
          return `${labels[k] || k}: ${v}`;
        })
        .join('\n\n');

      const userPrompt = `Brand: ${client.name}
${client.sector ? `Sector: ${client.sector}` : ''}
${client.website ? `Website: ${client.website}` : ''}
${client.platforms?.length ? `Platforms: ${client.platforms.join(', ')}` : ''}

--- AI Research Findings ---
${researchData || 'No automated research was conducted.'}

--- Brand Interrogation ---
${interrogationText || 'No interrogation data provided.'}

Generate a complete Bear Witness social media strategy for this brand. Follow the full methodology.`;

      const response = await callAI({
        system: STRATEGY_SYSTEM_PROMPT,
        user: userPrompt,
        maxTokens: 4096,
      });

      setStrategy(response);
    } catch (err) {
      setStrategy(`Error generating strategy: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filledInterrogation = Object.values(interrogation).filter(v => v?.trim()).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">Generate Strategy</h2>
        <p className="text-[#6B7280] text-sm mt-1">
          Ready to generate the Bear Witness strategy for <span className="text-[#10B981]">{client.name}</span>.
        </p>
      </div>

      {/* Summary of inputs */}
      <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4 space-y-3">
        <h3 className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">Input Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className={classNames('w-2 h-2 rounded-full shrink-0', researchData ? 'bg-[#10B981]' : 'bg-[#6B7280]')} />
            <span className="text-[#9CA3AF]">AI Research</span>
            <span className="text-[#6B7280] text-xs ml-auto">{researchData ? 'Complete' : 'Skipped'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={classNames('w-2 h-2 rounded-full shrink-0', filledInterrogation > 0 ? 'bg-[#10B981]' : 'bg-[#6B7280]')} />
            <span className="text-[#9CA3AF]">Brand Interrogation</span>
            <span className="text-[#6B7280] text-xs ml-auto">{filledInterrogation} / 10 fields</span>
          </div>
        </div>
      </div>

      {!strategy && !loading && (
        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-5 py-3 bg-[#10B981] hover:bg-[#059669] text-white font-medium rounded-lg text-sm"
        >
          <Zap size={18} />
          Generate Strategy
        </button>
      )}

      {loading && (
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={16} className="text-[#10B981] animate-pulse" />
            <span className="text-[#9CA3AF] text-sm">Building Bear Witness strategy for {client.name}...</span>
          </div>
          <LoadingSkeleton lines={12} />
          <div className="mt-4 text-[#6B7280] text-xs">
            Analysing through narrative territories: primal living, provide and protect, family and legacy, health and wellness...
          </div>
        </div>
      )}

      {strategy && !loading && (
        <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg p-4 flex items-center justify-between">
          <span className="text-[#10B981] text-sm font-medium flex items-center gap-2">
            <Check size={16} /> Strategy generated successfully
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              className="text-[#6B7280] hover:text-[#9CA3AF] text-xs flex items-center gap-1"
            >
              <RefreshCw size={12} /> Regenerate
            </button>
            <span className="text-[#6B7280] text-xs">Proceed to review</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 5: Review Strategy ────────────────────────────────────────────
function StepReview({ client, strategy, onSave, onCreateProposal, isSavedView }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(strategy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = strategy;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Parse sections from markdown headings
  const sections = useMemo(() => {
    if (!strategy) return [];
    const lines = strategy.split('\n');
    const result = [];
    let current = null;

    for (const line of lines) {
      if (line.match(/^#{1,3}\s/)) {
        if (current) result.push(current);
        current = { title: line.replace(/^#{1,3}\s/, ''), content: '' };
      } else if (current) {
        current.content += line + '\n';
      } else {
        current = { title: '', content: line + '\n' };
      }
    }
    if (current) result.push(current);
    return result;
  }, [strategy]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">
            {isSavedView ? 'Strategy' : 'Strategy Review'}
          </h2>
          <p className="text-[#6B7280] text-sm mt-0.5">
            {typeof client === 'string' ? client : client?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)] transition-colors"
          >
            {copied ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          {onCreateProposal && (
            <button
              onClick={onCreateProposal}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-sm font-medium rounded-lg"
            >
              <FileText size={14} />
              Create Proposal
            </button>
          )}
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg"
            >
              <Check size={14} />
              Save Strategy
            </button>
          )}
        </div>
      </div>

      {sections.length > 1 ? (
        <div className="space-y-2">
          {sections.map((section, i) => (
            <StrategySection key={i} title={section.title} content={section.content} defaultExpanded={i < 3} />
          ))}
        </div>
      ) : (
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-5">
          <div className="text-[#9CA3AF] text-sm whitespace-pre-wrap leading-relaxed">{strategy}</div>
        </div>
      )}
    </div>
  );
}

function StrategySection({ title, content, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!title && !content?.trim()) return null;

  return (
    <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg overflow-hidden">
      {title && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#222233]/50 transition-colors text-left"
        >
          <h3 className="text-[rgba(255,255,255,0.9)] font-semibold text-sm">{title}</h3>
          {expanded ? <ChevronUp size={16} className="text-[#6B7280] shrink-0" /> : <ChevronDown size={16} className="text-[#6B7280] shrink-0" />}
        </button>
      )}
      {expanded && (
        <div className={classNames('px-5 pb-4 text-[#9CA3AF] text-sm whitespace-pre-wrap leading-relaxed', title && 'pt-0')}>
          {content}
        </div>
      )}
    </div>
  );
}

// ── Saved Strategies List ──────────────────────────────────────────────
function SavedStrategiesList({ strategies, clients, onView, onDelete, searchQuery, clientFilter }) {
  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    let results = [...strategies];
    if (clientFilter) results = results.filter(s => s.clientId === clientFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(s =>
        s.title?.toLowerCase().includes(q) ||
        s.content?.toLowerCase().includes(q) ||
        (clientMap[s.clientId]?.name || '').toLowerCase().includes(q)
      );
    }
    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [strategies, searchQuery, clientFilter, clientMap]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-[#6B7280]">
        <Compass size={32} className="mx-auto mb-3 text-[#2A2A3A]" />
        <p className="text-sm">
          {strategies.length === 0 ? 'No saved strategies yet.' : 'No strategies match your search.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map(s => {
        const client = clientMap[s.clientId];
        const color = client ? getClientColor(client.id) : '#6B7280';
        return (
          <div
            key={s.id}
            className="bg-[#1A1A26] border border-[#2A2A3A] hover:border-[#3A3A4A] rounded-lg p-4 flex items-center justify-between transition-colors cursor-pointer"
            onClick={() => onView(s)}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {client && (
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                    style={{ background: `${color}20`, color }}
                  >
                    {getInitials(client.name)}
                  </div>
                )}
                <h3 className="text-[rgba(255,255,255,0.9)] font-medium text-sm truncate">
                  {s.title || `Strategy for ${client?.name || 'Unknown'}`}
                </h3>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[#6B7280] text-xs">{client?.name || 'Unknown Client'}</span>
                <span className="text-[#6B7280] text-xs">{formatDate(s.createdAt)}</span>
              </div>
              {s.content && (
                <p className="text-[#6B7280] text-xs mt-1 line-clamp-1">{truncate(s.content, 120)}</p>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-3">
              <button
                onClick={(e) => { e.stopPropagation(); onView(s); }}
                className="text-[#6B7280] hover:text-[#10B981] p-1.5"
                title="View strategy"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                className="text-[#6B7280] hover:text-[#EF4444] p-1.5"
                title="Delete strategy"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Module ───────────────────────────────────────────────────────
export default function StrategyEngine({ onNavigate, params } = {}) {
  const store = useStore();
  const { clients = [], strategies = [] } = store;

  const [view, setView] = useState('list');
  const [currentStep, setCurrentStep] = useState('client');
  const [selectedClient, setSelectedClient] = useState(null);
  const [researchData, setResearchData] = useState('');
  const [researchLoading, setResearchLoading] = useState(false);
  const [interrogation, setInterrogation] = useState({});
  const [strategy, setStrategy] = useState('');
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [viewingStrategy, setViewingStrategy] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  // Handle params from navigation
  useEffect(() => {
    if (params?.action === 'add') {
      setView('builder');
      resetBuilder();
    } else if (params?.strategyId) {
      const s = strategies.find(x => x.id === params.strategyId);
      if (s) { setViewingStrategy(s); setView('view'); }
    }
  }, [params]);

  const resetBuilder = () => {
    setCurrentStep('client');
    setSelectedClient(null);
    setResearchData('');
    setInterrogation({});
    setStrategy('');
    setResearchLoading(false);
    setStrategyLoading(false);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'client': return !!selectedClient;
      case 'research': return true;
      case 'interrogation': return true;
      case 'generate': return !!strategy;
      default: return false;
    }
  };

  const nextStep = () => {
    const idx = STEPS.findIndex(s => s.key === currentStep);
    if (idx < STEPS.length - 1) setCurrentStep(STEPS[idx + 1].key);
  };

  const prevStep = () => {
    const idx = STEPS.findIndex(s => s.key === currentStep);
    if (idx > 0) setCurrentStep(STEPS[idx - 1].key);
  };

  const handleSaveStrategy = () => {
    const data = {
      clientId: selectedClient.id,
      title: `${selectedClient.name} — Bear Witness Strategy`,
      type: 'bear-witness',
      content: strategy,
      researchData,
      interrogation,
      createdAt: new Date().toISOString(),
    };
    store.addStrategy(data);
    store.addActivity({
      type: 'strategy_generated',
      message: `Generated Bear Witness strategy for ${selectedClient.name}`,
      clientId: selectedClient.id,
    });
    setView('list');
    resetBuilder();
  };

  const handleCreateProposal = () => {
    const strategySource = viewingStrategy || { clientId: selectedClient?.id, content: strategy };
    const clientName = viewingStrategy
      ? (clients.find(c => c.id === viewingStrategy.clientId)?.name || 'Unknown')
      : selectedClient?.name;

    sessionStorage.setItem('bw:proposal-from-strategy', JSON.stringify({
      clientId: strategySource.clientId,
      clientName,
      strategyContent: strategySource.content,
    }));

    if (onNavigate) {
      onNavigate('proposals', { action: 'add', fromStrategy: true });
    } else {
      window.dispatchEvent(new CustomEvent('bw:navigate', { detail: { module: 'proposals' } }));
    }
  };

  const handleViewStrategy = (s) => {
    setViewingStrategy(s);
    setView('view');
  };

  const handleDeleteStrategy = (id) => {
    if (window.confirm('Delete this strategy?')) {
      store.deleteStrategy(id);
      store.addActivity({ type: 'strategy_deleted', message: 'Strategy deleted' });
      if (viewingStrategy?.id === id) {
        setViewingStrategy(null);
        setView('list');
      }
    }
  };

  // ── View: Saved Strategy ──────────────────────────────────────────────
  if (view === 'view' && viewingStrategy) {
    const client = clients.find(c => c.id === viewingStrategy.clientId);
    const clientName = client?.name || 'Unknown';
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); setViewingStrategy(null); }} className="text-[#6B7280] hover:text-[#9CA3AF] p-1">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-[rgba(255,255,255,0.9)]">{viewingStrategy.title}</h1>
            <div className="flex items-center gap-2 text-xs text-[#6B7280] mt-0.5">
              {client && (
                <button
                  onClick={() => onNavigate?.('client-hub', { clientId: client.id })}
                  className="hover:text-[#10B981] transition-colors"
                >
                  {clientName}
                </button>
              )}
              <span>{formatDate(viewingStrategy.createdAt)}</span>
            </div>
          </div>
        </div>
        <StepReview
          client={clientName}
          strategy={viewingStrategy.content}
          onSave={null}
          onCreateProposal={handleCreateProposal}
          isSavedView
        />
      </div>
    );
  }

  // ── View: Builder ──────────────────────────────────────────────────────
  if (view === 'builder') {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); resetBuilder(); }} className="text-[#6B7280] hover:text-[#9CA3AF] p-1">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-[rgba(255,255,255,0.9)]">Strategy Builder</h1>
            <p className="text-[#6B7280] text-xs mt-0.5">Bear Witness narrative-driven methodology</p>
          </div>
        </div>

        <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />

        <div className="min-h-[400px]">
          {currentStep === 'client' && (
            <StepClient clients={clients} selectedClient={selectedClient} onSelect={setSelectedClient} />
          )}
          {currentStep === 'research' && selectedClient && (
            <StepResearch
              client={selectedClient}
              researchData={researchData}
              setResearchData={setResearchData}
              loading={researchLoading}
              setLoading={setResearchLoading}
            />
          )}
          {currentStep === 'interrogation' && (
            <StepInterrogation interrogation={interrogation} setInterrogation={setInterrogation} />
          )}
          {currentStep === 'generate' && selectedClient && (
            <StepGenerate
              client={selectedClient}
              researchData={researchData}
              interrogation={interrogation}
              strategy={strategy}
              setStrategy={setStrategy}
              loading={strategyLoading}
              setLoading={setStrategyLoading}
            />
          )}
          {currentStep === 'review' && strategy && (
            <StepReview
              client={selectedClient}
              strategy={strategy}
              onSave={handleSaveStrategy}
              onCreateProposal={handleCreateProposal}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-[#2A2A3A]">
          <button
            onClick={prevStep}
            disabled={currentStep === 'client'}
            className="flex items-center gap-1.5 px-4 py-2 text-sm text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] disabled:opacity-30 disabled:hover:text-[#9CA3AF] transition-colors"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          {currentStep !== 'review' && (
            <button
              onClick={nextStep}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 disabled:hover:bg-[#10B981] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── View: List ─────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[rgba(255,255,255,0.9)]">AI Strategy Engine</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">{strategies.length} saved strateg{strategies.length === 1 ? 'y' : 'ies'}</p>
        </div>
        <button
          onClick={() => { setView('builder'); resetBuilder(); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Strategy
        </button>
      </div>

      {/* Search and Filter */}
      {strategies.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search strategies..."
              className="w-full pl-9 text-sm"
            />
          </div>
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="text-sm"
          >
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}

      <SavedStrategiesList
        strategies={strategies}
        clients={clients}
        onView={handleViewStrategy}
        onDelete={handleDeleteStrategy}
        searchQuery={searchQuery}
        clientFilter={clientFilter}
      />
    </div>
  );
}
