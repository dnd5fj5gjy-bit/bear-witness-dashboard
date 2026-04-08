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
  Sparkles, List, ArrowLeft, RefreshCw, Download, Printer, HelpCircle,
  Columns, History, Info, BarChart3
} from 'lucide-react';

const STRATEGY_SYSTEM_PROMPT = `You are the Bear Witness Strategy Engine. You create mission-based, narrative-driven social media strategies. Your core philosophy: Never sell the product. Educate people on the problems. Position the brand as the solution. Seek gratitude, not transactions. One product solves many problems. Different people feel different problems. Build a narrative for each.

You must analyse the brand through the Bear Witness narrative lens, checking every territory: primal/ancestral living, provide and protect, family/faith/legacy, control and autonomy, health and wellness, self-reliance and independence, freedom from broken systems, environmental stewardship. For each genuine connection, build a full mission narrative.

No single mission narrative should dominate. The power is breadth: different narratives appeal to different people, all converging on the same product.

Output a complete strategy using markdown formatting with ## headings for each major section. Use bullet points for lists and **bold** for key terms.

The major sections MUST be:
## Executive Summary
## Mission Narrative Map
## Content Pillars
## Platform Strategy
## Content Capture Outlines

Be direct, opinionated, and strategic. This is consultancy-grade work. Come with opinions, not templates. Use UK English. Never use em dashes. No corporate jargon. No motivational fluff.`;

const STEPS = [
  { key: 'client', label: 'Select Client', icon: User },
  { key: 'research', label: 'AI Research', icon: Globe },
  { key: 'interrogation', label: 'Brand Interrogation', icon: Brain },
  { key: 'generate', label: 'Generate Strategy', icon: Zap },
  { key: 'review', label: 'Review Strategy', icon: FileText },
];

const INTERROGATION_SECTIONS = [
  {
    key: 'brand',
    title: 'The Brand',
    icon: Building,
    description: 'Who you are and why you exist',
    fields: [
      {
        key: 'originStory',
        label: 'Origin Story',
        placeholder: 'How did this brand start? What sparked it? Why does it exist?',
        helpText: 'A good answer explains the founder\'s personal motivation, the moment of insight, or the frustration that led to creating this brand. This becomes raw material for narrative content.',
      },
      {
        key: 'beliefs',
        label: 'Core Beliefs',
        placeholder: 'What does the brand fundamentally believe about the world?',
        helpText: 'Think beyond the product. What worldview does the brand hold? e.g. "Modern food systems are broken" or "People deserve to know what they put in their bodies." These beliefs drive the mission narratives.',
      },
    ],
  },
  {
    key: 'product',
    title: 'The Product',
    icon: Target,
    description: 'What you make and how it works',
    fields: [
      {
        key: 'howItWorks',
        label: 'How It Works',
        placeholder: 'What does the product or service actually do? How does the customer use it?',
        helpText: 'Be specific and practical. Walk through the customer experience from purchase to regular use. Include any unique mechanisms of action or delivery methods.',
      },
      {
        key: 'differentiator',
        label: 'Differentiator',
        placeholder: 'What makes this genuinely different from competitors?',
        helpText: 'Not marketing claims, but actual structural differences. Ingredient sourcing, manufacturing process, business model, price positioning, community model. What cannot be easily copied?',
      },
      {
        key: 'price',
        label: 'Price Point',
        placeholder: 'Price range and how it is positioned (premium, accessible, etc.)',
        helpText: 'Include the actual price or range. Is this a premium purchase that needs justification? A repeat purchase? How does price compare to competitors?',
      },
    ],
  },
  {
    key: 'customer',
    title: 'The Customer',
    icon: User,
    description: 'Who buys and what they become',
    fields: [
      {
        key: 'whoBuys',
        label: 'Who Buys',
        placeholder: 'Primary customer profile(s). Demographics, psychographics, lifestyle.',
        helpText: 'Go beyond "men 25-45". What do they care about? What media do they consume? What tribes do they belong to? The more specific, the better the narrative targeting.',
      },
      {
        key: 'transformation',
        label: 'Transformation',
        placeholder: 'What transformation does the customer experience? Before vs after.',
        helpText: 'Describe the emotional and practical shift. Not just "they feel healthier" but "they go from feeling sluggish and dependent on coffee to waking up with natural energy." This drives testimonial content.',
      },
    ],
  },
  {
    key: 'enemy',
    title: 'The Enemy',
    icon: Zap,
    description: 'What you are fighting against',
    fields: [
      {
        key: 'enemy',
        label: 'The Enemy',
        placeholder: 'What problem, system, or status quo is the brand fighting against?',
        helpText: 'Every strong brand has an enemy. It might be a broken system (processed food industry), a cultural norm (sedentary lifestyles), or a mindset (learned helplessness). The enemy creates tension that drives content.',
      },
    ],
  },
  {
    key: 'values',
    title: 'The Values',
    icon: Lightbulb,
    description: 'Non-negotiables and red lines',
    fields: [
      {
        key: 'values',
        label: 'Values / Red Lines',
        placeholder: 'What does the brand refuse to do? What are its non-negotiables?',
        helpText: 'Red lines are more powerful than aspirational values. What would this brand never do? What would they walk away from? e.g. "We will never use artificial sweeteners" or "We refuse to use fear-based marketing."',
      },
    ],
  },
  {
    key: 'presence',
    title: 'Current Presence',
    icon: Layout,
    description: 'Where you are now on social',
    fields: [
      {
        key: 'existingPresence',
        label: 'Current Social Presence',
        placeholder: 'Current social accounts, follower counts, posting frequency, content style, tone of voice, engagement rates.',
        helpText: 'Be honest about the current state. Include follower counts, average engagement, posting frequency, what content works and what doesn\'t. This baseline shapes the strategy recommendations.',
      },
    ],
  },
];

// ── Markdown Renderer ────────────────────────────────────────────────
function renderMarkdownContent(text) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listItems = [];
  let listKey = 0;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="space-y-1.5 ml-1 my-2">
          {listItems.map((item, i) => (
            <li key={i} className="flex gap-2 text-[#9CA3AF] text-sm leading-relaxed">
              <span className="text-[#10B981] mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-[#10B981]/60 inline-block" />
              <span>{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Bullet points
    if (line.match(/^\s*[-*]\s+/)) {
      listItems.push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }

    // Numbered lists
    if (line.match(/^\s*\d+[.)]\s+/)) {
      listItems.push(line.replace(/^\s*\d+[.)]\s+/, ''));
      continue;
    }

    flushList();

    // Sub-headings (### or ####)
    if (line.match(/^#{3,4}\s/)) {
      const heading = line.replace(/^#{3,4}\s+/, '');
      elements.push(
        <h4 key={i} className="text-[rgba(255,255,255,0.85)] font-semibold text-sm mt-4 mb-1">{renderInlineMarkdown(heading)}</h4>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-[#9CA3AF] text-sm leading-relaxed">{renderInlineMarkdown(line)}</p>
    );
  }

  flushList();
  return elements;
}

function renderInlineMarkdown(text) {
  if (!text) return text;
  // Bold
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="text-[rgba(255,255,255,0.9)] font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ── Strategy Section Parser ──────────────────────────────────────────
function parseStrategySections(text) {
  if (!text) return [];
  const lines = text.split('\n');
  const sections = [];
  let current = null;

  for (const line of lines) {
    if (line.match(/^#{1,2}\s/)) {
      if (current) sections.push(current);
      const title = line.replace(/^#{1,2}\s+/, '');
      current = { title, content: '', icon: getSectionIcon(title) };
    } else if (current) {
      current.content += line + '\n';
    } else {
      // Content before first heading
      if (line.trim()) {
        if (!current) current = { title: '', content: '', icon: null };
        current.content += line + '\n';
      }
    }
  }
  if (current) sections.push(current);
  return sections;
}

function getSectionIcon(title) {
  const lower = title.toLowerCase();
  if (lower.includes('executive') || lower.includes('summary')) return FileText;
  if (lower.includes('mission') || lower.includes('narrative')) return Compass;
  if (lower.includes('content pillar')) return Layout;
  if (lower.includes('platform')) return Globe;
  if (lower.includes('capture') || lower.includes('outline')) return Camera;
  if (lower.includes('audience') || lower.includes('customer')) return User;
  return Target;
}

// ── Multi-line Loading Skeleton ──────────────────────────────────────
function StrategyLoadingSkeleton({ phase = 'research' }) {
  const skeletonSections = phase === 'strategy' ? [
    { label: 'Executive Summary', lines: 3 },
    { label: 'Mission Narrative Map', lines: 5 },
    { label: 'Content Pillars', lines: 4 },
    { label: 'Platform Strategy', lines: 4 },
    { label: 'Content Capture Outlines', lines: 3 },
  ] : [
    { label: 'Company Overview', lines: 3 },
    { label: 'Products and Services', lines: 3 },
    { label: 'Market Position', lines: 2 },
    { label: 'Social Presence', lines: 2 },
  ];

  return (
    <div className="space-y-4 animate-pulse">
      {skeletonSections.map((section, si) => (
        <div key={si} className="space-y-2">
          <div className="h-4 bg-[#222233] rounded w-40" />
          {Array.from({ length: section.lines }).map((_, i) => (
            <div key={i} className="h-3 bg-[#1A1A26] rounded" style={{ width: `${95 - i * 12 - Math.random() * 10}%` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Tooltip ──────────────────────────────────────────────────────────
function Tooltip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
      >
        <HelpCircle size={14} />
      </button>
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-[#222233] border border-[#2A2A3A] rounded-lg shadow-xl text-[#9CA3AF] text-xs leading-relaxed">
          {text}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 bg-[#222233] border-r border-b border-[#2A2A3A] rotate-45" />
        </div>
      )}
    </span>
  );
}

// ── Completion Meter ─────────────────────────────────────────────────
function CompletionMeter({ filled, total }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-[#1A1A26] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-medium shrink-0" style={{ color }}>
        {filled}/{total} fields
      </span>
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
              {isCompleted ? <Check size={14} className="text-[#10B981]" /> : <Icon size={14} />}
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
        system: `You are a brand research analyst for Bear Witness, a social media strategy agency. Research the following brand thoroughly. Provide structured findings using markdown formatting with ## headings covering: Company Overview, Key Products/Services, Target Audience, Market Positioning, Competitors, Recent News/Developments, Social Media Presence, and Brand Tone of Voice. Use bullet points for lists. Be factual and concise. Use UK English. Never use em dashes.`,
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

  const researchSections = useMemo(() => parseStrategySections(researchData), [researchData]);

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
          <div className="flex items-center gap-2 mb-2">
            <div className="w-4 h-4 rounded-full border-2 border-[#10B981] border-t-transparent animate-spin" />
            <span className="text-[rgba(255,255,255,0.9)] text-sm font-medium">Researching {client.name} across the web...</span>
          </div>
          <p className="text-[#6B7280] text-xs mb-4">This typically takes 15-30 seconds.</p>
          <StrategyLoadingSkeleton phase="research" />
        </div>
      )}

      {researchData && !loading && (
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#2A2A3A]">
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
          <div className="p-5 max-h-[500px] overflow-y-auto">
            {researchSections.length > 1 ? (
              <div className="space-y-1">
                {researchSections.map((section, i) => (
                  <CollapsibleSection key={i} title={section.title} defaultExpanded={i < 4}>
                    {renderMarkdownContent(section.content)}
                  </CollapsibleSection>
                ))}
              </div>
            ) : (
              <div>{renderMarkdownContent(researchData)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Collapsible Section ──────────────────────────────────────────────
function CollapsibleSection({ title, children, defaultExpanded = true, icon: IconComponent = null }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!title && !children) return null;

  return (
    <div className="border border-[#2A2A3A] rounded-lg overflow-hidden mb-2">
      {title && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#222233]/50 transition-colors text-left bg-[#12121A]"
        >
          <h3 className="text-[rgba(255,255,255,0.9)] font-semibold text-sm flex items-center gap-2">
            {IconComponent && <IconComponent size={14} className="text-[#10B981]" />}
            {title}
          </h3>
          {expanded ? <ChevronUp size={16} className="text-[#6B7280] shrink-0" /> : <ChevronDown size={16} className="text-[#6B7280] shrink-0" />}
        </button>
      )}
      {expanded && (
        <div className={classNames('px-4 pb-3', title ? 'pt-2' : 'pt-3')}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Step 3: Brand Interrogation ────────────────────────────────────────
function StepInterrogation({ interrogation, setInterrogation }) {
  const [expandedSections, setExpandedSections] = useState({ brand: true, product: true });

  const handleChange = (key, value) => {
    setInterrogation(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (sectionKey) => {
    setExpandedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const totalFields = INTERROGATION_SECTIONS.reduce((acc, s) => acc + s.fields.length, 0);
  const filledCount = INTERROGATION_SECTIONS.reduce((acc, section) => {
    return acc + section.fields.filter(f => interrogation[f.key]?.trim()).length;
  }, 0);

  const getSectionCompletion = (section) => {
    const filled = section.fields.filter(f => interrogation[f.key]?.trim()).length;
    return { filled, total: section.fields.length };
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">Brand Interrogation</h2>
        <p className="text-[#6B7280] text-sm mt-1">
          Answer as much as you can. More detail produces better strategies.
        </p>
        <div className="mt-3">
          <CompletionMeter filled={filledCount} total={totalFields} />
        </div>
      </div>

      {INTERROGATION_SECTIONS.map(section => {
        const Icon = section.icon;
        const { filled, total } = getSectionCompletion(section);
        const isExpanded = expandedSections[section.key] !== false;
        const isComplete = filled === total;

        return (
          <div key={section.key} className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(section.key)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#222233]/30 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={classNames(
                  'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                  isComplete ? 'bg-[#10B981]/15' : 'bg-[#222233]'
                )}>
                  {isComplete
                    ? <Check size={16} className="text-[#10B981]" />
                    : <Icon size={16} className="text-[#9CA3AF]" />
                  }
                </div>
                <div className="min-w-0">
                  <h3 className="text-[rgba(255,255,255,0.9)] font-semibold text-sm">{section.title}</h3>
                  <p className="text-[#6B7280] text-xs">{section.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={classNames(
                  'text-xs font-medium',
                  isComplete ? 'text-[#10B981]' : filled > 0 ? 'text-[#F59E0B]' : 'text-[#6B7280]'
                )}>
                  {filled}/{total}
                </span>
                {isExpanded ? <ChevronUp size={16} className="text-[#6B7280]" /> : <ChevronDown size={16} className="text-[#6B7280]" />}
              </div>
            </button>
            {isExpanded && (
              <div className="px-4 pb-4 space-y-4 border-t border-[#2A2A3A]">
                {section.fields.map(field => (
                  <div key={field.key} className="pt-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="block text-[rgba(255,255,255,0.9)] text-sm font-medium">{field.label}</label>
                      {field.helpText && <Tooltip text={field.helpText} />}
                      {interrogation[field.key]?.trim() && (
                        <Check size={12} className="text-[#10B981]" />
                      )}
                    </div>
                    <textarea
                      value={interrogation[field.key] || ''}
                      onChange={e => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="w-full resize-y min-h-[72px]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 4: Generate Strategy ──────────────────────────────────────────
function StepGenerate({ client, researchData, interrogation, strategy, setStrategy, loading, setLoading }) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(prev => prev + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const interrogationText = Object.entries(interrogation)
        .filter(([, v]) => v?.trim())
        .map(([k, v]) => {
          const field = INTERROGATION_SECTIONS.flatMap(s => s.fields).find(f => f.key === k);
          return `${field?.label || k}: ${v}`;
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

Generate a complete Bear Witness social media strategy for this brand. Follow the full methodology. Use ## headings for each major section. Use bullet points and **bold** for key terms.`;

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
            <span className="text-[#6B7280] text-xs ml-auto">{filledInterrogation} / {INTERROGATION_SECTIONS.reduce((a, s) => a + s.fields.length, 0)} fields</span>
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
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#10B981] animate-pulse" />
              <span className="text-[rgba(255,255,255,0.9)] text-sm font-medium">Generating strategy for {client.name}...</span>
            </div>
            <span className="text-[#6B7280] text-xs font-mono">{elapsed}s</span>
          </div>
          <p className="text-[#6B7280] text-xs mb-4">This typically takes 30-60 seconds. Analysing through narrative territories: primal living, provide and protect, family and legacy, health and wellness...</p>
          <StrategyLoadingSkeleton phase="strategy" />
          {/* Progress indicators */}
          <div className="mt-4 pt-4 border-t border-[#2A2A3A] space-y-2">
            {[
              { label: 'Analysing brand positioning', delay: 0 },
              { label: 'Mapping narrative territories', delay: 8 },
              { label: 'Building content pillars', delay: 18 },
              { label: 'Defining platform strategy', delay: 28 },
              { label: 'Creating capture outlines', delay: 38 },
            ].map((step, i) => {
              const active = elapsed >= step.delay;
              const done = i < 4 && elapsed >= [8, 18, 28, 38, 999][i];
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {done ? (
                    <Check size={12} className="text-[#10B981]" />
                  ) : active ? (
                    <div className="w-3 h-3 rounded-full border border-[#10B981] border-t-transparent animate-spin" />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-[#2A2A3A]" />
                  )}
                  <span className={active ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>{step.label}</span>
                </div>
              );
            })}
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
function StepReview({ client, strategy, onSave, onCreateProposal, isSavedView, allClientStrategies = [], onViewStrategy }) {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedPlain, setCopiedPlain] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareStrategy, setCompareStrategy] = useState(null);

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(strategy);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      fallbackCopy(strategy);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    }
  };

  const handleCopyPlain = async () => {
    const plain = strategy
      .replace(/^#{1,4}\s+/gm, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/^\s*[-*]\s+/gm, '  - ');
    try {
      await navigator.clipboard.writeText(plain);
      setCopiedPlain(true);
      setTimeout(() => setCopiedPlain(false), 2000);
    } catch {
      fallbackCopy(plain);
      setCopiedPlain(true);
      setTimeout(() => setCopiedPlain(false), 2000);
    }
  };

  const handlePrintPDF = () => {
    const printContent = strategy
      .replace(/^## (.+)$/gm, '<h2 style="font-size:20px;margin-top:32px;margin-bottom:12px;color:#111;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="font-size:16px;margin-top:24px;margin-bottom:8px;color:#222;">$1</h3>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^\s*[-*]\s+(.+)$/gm, '<li style="margin-left:20px;margin-bottom:4px;">$1</li>')
      .replace(/\n\n/g, '</p><p style="margin-bottom:12px;line-height:1.6;">')
      .replace(/\n/g, '<br/>');

    const clientName = typeof client === 'string' ? client : client?.name;
    const html = `<!DOCTYPE html><html><head><title>Strategy - ${clientName}</title><style>
      body { font-family: 'Georgia', serif; max-width: 800px; margin: 40px auto; padding: 0 40px; color: #111; line-height: 1.6; }
      h1 { font-size: 28px; border-bottom: 2px solid #10B981; padding-bottom: 12px; }
      h2 { color: #10B981; }
      li { list-style-type: disc; }
      @media print { body { margin: 0; padding: 20px; } }
    </style></head><body>
      <h1>Bear Witness Strategy: ${clientName}</h1>
      <p style="color:#666;margin-bottom:32px;">Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p style="margin-bottom:12px;line-height:1.6;">${printContent}</p>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const fallbackCopy = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  };

  const sections = useMemo(() => parseStrategySections(strategy), [strategy]);
  const compareSections = useMemo(() => compareStrategy ? parseStrategySections(compareStrategy.content) : [], [compareStrategy]);

  // Strategies available for comparison (excluding current)
  const otherStrategies = allClientStrategies.filter(s => s.content !== strategy);

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
        <div className="flex items-center gap-2 flex-wrap">
          {/* Copy as Markdown */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)] transition-colors"
            title="Copy as Markdown"
          >
            {copiedMd ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
            {copiedMd ? 'Copied' : 'Markdown'}
          </button>
          {/* Copy as Plain Text */}
          <button
            onClick={handleCopyPlain}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)] transition-colors"
            title="Copy as Plain Text"
          >
            {copiedPlain ? <Check size={14} className="text-[#10B981]" /> : <FileText size={14} />}
            {copiedPlain ? 'Copied' : 'Plain Text'}
          </button>
          {/* Download as PDF */}
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)] transition-colors"
            title="Download as PDF"
          >
            <Download size={14} />
            PDF
          </button>
          {/* Compare toggle */}
          {otherStrategies.length > 0 && (
            <button
              onClick={() => { setCompareMode(!compareMode); setCompareStrategy(null); }}
              className={classNames(
                'flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors',
                compareMode
                  ? 'bg-[#3B82F6]/15 border-[#3B82F6]/30 text-[#3B82F6]'
                  : 'border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)]'
              )}
            >
              <Columns size={14} />
              Compare
            </button>
          )}
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

      {/* Compare strategy picker */}
      {compareMode && !compareStrategy && (
        <div className="bg-[#12121A] border border-[#3B82F6]/20 rounded-lg p-4">
          <p className="text-[#9CA3AF] text-sm mb-3">Select a strategy to compare with:</p>
          <div className="space-y-2">
            {otherStrategies.map(s => (
              <button
                key={s.id}
                onClick={() => setCompareStrategy(s)}
                className="w-full text-left p-3 rounded-lg border border-[#2A2A3A] bg-[#1A1A26] hover:border-[#3B82F6]/30 transition-colors"
              >
                <span className="text-[rgba(255,255,255,0.9)] text-sm">{s.title}</span>
                <span className="text-[#6B7280] text-xs ml-2">{formatDate(s.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-side comparison view */}
      {compareMode && compareStrategy ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3 px-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-[#10B981] text-xs font-medium">Current</span>
            </div>
            <div className="space-y-2">
              {sections.map((section, i) => (
                <CollapsibleSection key={i} title={section.title} icon={section.icon} defaultExpanded={i < 3}>
                  {renderMarkdownContent(section.content)}
                </CollapsibleSection>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                <span className="text-[#3B82F6] text-xs font-medium">{compareStrategy.title}</span>
              </div>
              <span className="text-[#6B7280] text-xs">{formatDate(compareStrategy.createdAt)}</span>
            </div>
            <div className="space-y-2">
              {compareSections.map((section, i) => (
                <CollapsibleSection key={i} title={section.title} icon={section.icon} defaultExpanded={i < 3}>
                  {renderMarkdownContent(section.content)}
                </CollapsibleSection>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Normal single-strategy view */
        sections.length > 1 ? (
          <div className="space-y-2">
            {sections.map((section, i) => (
              <CollapsibleSection key={i} title={section.title} icon={section.icon} defaultExpanded={i < 5}>
                {renderMarkdownContent(section.content)}
              </CollapsibleSection>
            ))}
          </div>
        ) : (
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-5">
            {renderMarkdownContent(strategy)}
          </div>
        )
      )}
    </div>
  );
}

// ── Strategy History Timeline ─────────────────────────────────────────
function StrategyTimeline({ strategies, clients, onView }) {
  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  // Group by client
  const grouped = useMemo(() => {
    const g = {};
    strategies.forEach(s => {
      const cid = s.clientId || 'unknown';
      if (!g[cid]) g[cid] = [];
      g[cid].push(s);
    });
    // Sort each group by date
    Object.values(g).forEach(arr => arr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    return g;
  }, [strategies]);

  if (strategies.length === 0) {
    return (
      <div className="text-center py-12 text-[#6B7280]">
        <History size={32} className="mx-auto mb-3 text-[#2A2A3A]" />
        <p className="text-sm">No strategy history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([clientId, strats]) => {
        const client = clientMap[clientId];
        const color = client ? getClientColor(client.id) : '#6B7280';
        return (
          <div key={clientId}>
            <div className="flex items-center gap-2 mb-3">
              {client && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: `${color}20`, color }}
                >
                  {getInitials(client.name)}
                </div>
              )}
              <h3 className="text-[rgba(255,255,255,0.9)] font-semibold text-sm">{client?.name || 'Unknown Client'}</h3>
              <span className="text-[#6B7280] text-xs">{strats.length} strateg{strats.length === 1 ? 'y' : 'ies'}</span>
            </div>
            <div className="ml-3 border-l-2 border-[#2A2A3A] pl-4 space-y-3">
              {strats.map((s, i) => (
                <div key={s.id} className="relative">
                  <div className="absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full border-2 border-[#2A2A3A] bg-[#0A0A0F]" />
                  <button
                    onClick={() => onView(s)}
                    className="w-full text-left p-3 rounded-lg border border-[#2A2A3A] bg-[#1A1A26] hover:border-[#3A3A4A] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-[rgba(255,255,255,0.9)] text-sm font-medium truncate">{s.title}</h4>
                      {i === 0 && <span className="text-[#10B981] text-xs bg-[#10B981]/10 px-2 py-0.5 rounded">Latest</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[#6B7280] text-xs flex items-center gap-1">
                        <Clock size={10} /> {formatDateTime(s.createdAt)}
                      </span>
                      <span className="text-[#6B7280] text-xs">{relativeTime(s.createdAt)}</span>
                    </div>
                    {s.content && (
                      <p className="text-[#6B7280] text-xs mt-1.5 line-clamp-2">{truncate(s.content, 150)}</p>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
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
  const [listTab, setListTab] = useState('list'); // 'list' or 'timeline'
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
      title: `${selectedClient.name} -- Bear Witness Strategy`,
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

  // Get all strategies for the same client (for comparison)
  const getClientStrategies = (clientId) => {
    return strategies.filter(s => s.clientId === clientId);
  };

  // ── View: Saved Strategy ──────────────────────────────────────────────
  if (view === 'view' && viewingStrategy) {
    const client = clients.find(c => c.id === viewingStrategy.clientId);
    const clientName = client?.name || 'Unknown';
    const clientStrats = getClientStrategies(viewingStrategy.clientId);
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
              {clientStrats.length > 1 && (
                <span className="text-[#3B82F6]">{clientStrats.length} versions available for comparison</span>
              )}
            </div>
          </div>
        </div>
        <StepReview
          client={clientName}
          strategy={viewingStrategy.content}
          onSave={null}
          onCreateProposal={handleCreateProposal}
          isSavedView
          allClientStrategies={clientStrats}
          onViewStrategy={handleViewStrategy}
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
              allClientStrategies={selectedClient ? getClientStrategies(selectedClient.id) : []}
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

      {/* View mode toggle + Search and Filter */}
      {strategies.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-[#2A2A3A] rounded-lg overflow-hidden">
            <button
              onClick={() => setListTab('list')}
              className={classNames(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                listTab === 'list' ? 'bg-[#222233] text-[rgba(255,255,255,0.9)]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
              )}
            >
              <List size={14} /> List
            </button>
            <button
              onClick={() => setListTab('timeline')}
              className={classNames(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors',
                listTab === 'timeline' ? 'bg-[#222233] text-[rgba(255,255,255,0.9)]' : 'text-[#6B7280] hover:text-[#9CA3AF]'
              )}
            >
              <History size={14} /> Timeline
            </button>
          </div>
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

      {listTab === 'list' ? (
        <SavedStrategiesList
          strategies={strategies}
          clients={clients}
          onView={handleViewStrategy}
          onDelete={handleDeleteStrategy}
          searchQuery={searchQuery}
          clientFilter={clientFilter}
        />
      ) : (
        <StrategyTimeline
          strategies={clientFilter ? strategies.filter(s => s.clientId === clientFilter) : strategies}
          clients={clients}
          onView={handleViewStrategy}
        />
      )}
    </div>
  );
}
