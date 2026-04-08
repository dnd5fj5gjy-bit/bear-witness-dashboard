import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import { callAI } from '../lib/ai';
import {
  generateId, formatDate, formatDateTime, relativeTime, truncate, classNames,
  getClientColor, getInitials, BUDGET_RANGES
} from '../lib/utils';
import {
  FileText, Plus, Search, ArrowLeft, Trash2, X, Check,
  ChevronRight, ChevronLeft, Sparkles, Copy, Eye, Edit3,
  RefreshCw, Download, ChevronDown, ChevronUp, Briefcase,
  Users, Target, Building, Printer, Share2, Clock, History,
  Save, ExternalLink, Mail, Code, AlertCircle, Send,
  CheckCircle, XCircle, Pause, RotateCcw
} from 'lucide-react';

const PROPOSAL_TONES = ['Partnership', 'Commercial', 'Vision-led', 'Authoritative'];

const PROPOSAL_STATUSES = [
  { key: 'Draft', label: 'Draft', color: '#F59E0B', icon: Edit3 },
  { key: 'Ready for Review', label: 'Ready for Review', color: '#3B82F6', icon: Eye },
  { key: 'Sent', label: 'Sent', color: '#8B5CF6', icon: Send },
  { key: 'Accepted', label: 'Accepted', color: '#10B981', icon: CheckCircle },
  { key: 'Declined', label: 'Declined', color: '#EF4444', icon: XCircle },
];

const PROPOSAL_SECTIONS_ORDER = [
  'Cover',
  'Executive Context',
  'The Opportunity',
  'Our Approach',
  'The Strategy',
  'Expected Outcomes',
  'Investment',
  'Call to Action',
];

const PROPOSAL_SYSTEM_BASE = `You are the Bear Witness Proposal Builder. You create professional, persuasive business proposals for Bear Witness (bearwitness.world), a social media strategy agency within Bear Grylls Ventures.

Writing rules you must follow:
- Never use "Not X. But Y." sentence patterns
- Never use em dashes
- Never use exclamation marks
- Use UK English throughout
- Direct, confident, warm tone
- Every sentence must mean something concrete. No filler.

The tone should be premium, strategic, and grounded. This is consultancy work for serious brands.`;

const ANALYSIS_SYSTEM = `${PROPOSAL_SYSTEM_BASE}

Your job in this phase: analyse the business opportunity. Identify the core value proposition, the client's likely pain points, the strategic fit with Bear Witness, and the most compelling angles for the proposal. Be thorough but concise. Output a structured analysis with ## headings and bullet points.`;

const PROPOSAL_SYSTEM = `${PROPOSAL_SYSTEM_BASE}

Your job: write a complete client proposal. Use markdown formatting with ## headings for each section. Use bullet points for lists and **bold** for key terms.

Structure it with these sections (use these exact ## headings):
## Cover
## Executive Context
## The Opportunity
## Our Approach
## The Strategy
## Expected Outcomes
## Investment
## Call to Action

Make it compelling, specific to the client, and ready to present.`;

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
            <li key={i} className="flex gap-2 text-sm leading-relaxed">
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

    if (line.match(/^\s*[-*]\s+/)) {
      listItems.push(line.replace(/^\s*[-*]\s+/, ''));
      continue;
    }

    if (line.match(/^\s*\d+[.)]\s+/)) {
      listItems.push(line.replace(/^\s*\d+[.)]\s+/, ''));
      continue;
    }

    flushList();

    if (line.match(/^#{3,4}\s/)) {
      const heading = line.replace(/^#{3,4}\s+/, '');
      elements.push(
        <h4 key={i} className="font-semibold text-sm mt-4 mb-1">{renderInlineMarkdown(heading)}</h4>
      );
      continue;
    }

    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    elements.push(
      <p key={i} className="text-sm leading-relaxed">{renderInlineMarkdown(line)}</p>
    );
  }

  flushList();
  return elements;
}

function renderInlineMarkdown(text) {
  if (!text) return text;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ── Section Parser ───────────────────────────────────────────────────
function parseProposalSections(text) {
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
  if (lower.includes('cover')) return FileText;
  if (lower.includes('executive') || lower.includes('context')) return Briefcase;
  if (lower.includes('opportunity')) return Target;
  if (lower.includes('approach')) return Sparkles;
  if (lower.includes('strategy')) return Sparkles;
  if (lower.includes('outcome')) return CheckCircle;
  if (lower.includes('investment') || lower.includes('pricing')) return Building;
  if (lower.includes('call to action') || lower.includes('next step')) return Send;
  return FileText;
}

// ── Skeleton Loading with Section Placeholders ──────────────────────
function ProposalLoadingSkeleton({ phase }) {
  const sections = phase === 'analysis'
    ? ['Value Proposition', 'Pain Points', 'Strategic Fit', 'Compelling Angles']
    : PROPOSAL_SECTIONS_ORDER;

  return (
    <div className="space-y-4 animate-pulse">
      {sections.map((name, si) => (
        <div key={si} className="bg-[#12121A] border border-[#2A2A3A] rounded-lg p-4">
          <div className="h-4 bg-[#222233] rounded w-32 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 2 + Math.floor(Math.random() * 2) }).map((_, i) => (
              <div key={i} className="h-3 bg-[#1A1A26] rounded" style={{ width: `${90 - i * 15 - Math.random() * 10}%` }} />
            ))}
          </div>
          <div className="text-[#2A2A3A] text-xs mt-2">{name}</div>
        </div>
      ))}
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────
function StatusBadge({ status, size = 'sm' }) {
  const config = PROPOSAL_STATUSES.find(s => s.key === status) || PROPOSAL_STATUSES[0];
  const Icon = config.icon;
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-md font-medium',
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-3 py-1 text-sm'
      )}
      style={{ backgroundColor: `${config.color}15`, color: config.color }}
    >
      <Icon size={size === 'sm' ? 10 : 14} />
      {config.label}
    </span>
  );
}

// ── Status Selector ──────────────────────────────────────────────────
function StatusSelector({ currentStatus, onStatusChange }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5"
      >
        <StatusBadge status={currentStatus} size="md" />
        <ChevronDown size={14} className="text-[#6B7280]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 bg-[#1A1A26] border border-[#2A2A3A] rounded-lg shadow-xl p-1 min-w-[180px]">
            {PROPOSAL_STATUSES.map(s => {
              const Icon = s.icon;
              return (
                <button
                  key={s.key}
                  onClick={() => { onStatusChange(s.key); setOpen(false); }}
                  className={classNames(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left',
                    currentStatus === s.key ? 'bg-[#222233] text-[rgba(255,255,255,0.9)]' : 'text-[#9CA3AF] hover:bg-[#222233] hover:text-[rgba(255,255,255,0.9)]'
                  )}
                >
                  <Icon size={14} style={{ color: s.color }} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ── Section Editor ───────────────────────────────────────────────────
function SectionCard({ title, content, icon: IconComponent, isPreview, onEdit, sectionIndex }) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const textareaRef = useRef(null);

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  const handleSaveEdit = () => {
    if (onEdit) onEdit(sectionIndex, editContent);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setEditing(false);
  };

  if (isPreview) {
    return (
      <div className="mb-8">
        {title && (
          <h2 className="text-xl font-bold text-[#111] mb-3 pb-2 border-b border-gray-200">{title}</h2>
        )}
        <div className="text-gray-700 text-base leading-relaxed prose prose-sm">
          {renderMarkdownContent(content)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[#12121A]">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left flex-1 min-w-0"
        >
          {IconComponent && <IconComponent size={16} className="text-[#10B981] shrink-0" />}
          <h3 className="text-[rgba(255,255,255,0.9)] font-semibold text-sm truncate">{title || 'Content'}</h3>
          {expanded ? <ChevronUp size={14} className="text-[#6B7280] shrink-0" /> : <ChevronDown size={14} className="text-[#6B7280] shrink-0" />}
        </button>
        {!editing && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); setEditing(true); setExpanded(true); }}
            className="text-[#6B7280] hover:text-[#10B981] p-1 ml-2 shrink-0"
            title="Edit section"
          >
            <Edit3 size={14} />
          </button>
        )}
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-2">
          {editing ? (
            <div className="space-y-3">
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={e => {
                  setEditContent(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = e.target.scrollHeight + 'px';
                }}
                className="w-full resize-none min-h-[120px] text-sm font-mono"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-white text-xs font-medium rounded-lg"
                >
                  <Save size={12} /> Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[#9CA3AF]">
              {renderMarkdownContent(content)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Version History ──────────────────────────────────────────────────
function VersionHistory({ versions, onRestore }) {
  const [expanded, setExpanded] = useState(false);

  if (!versions || versions.length <= 1) return null;

  return (
    <div className="bg-[#12121A] border border-[#2A2A3A] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#1A1A26] transition-colors"
      >
        <div className="flex items-center gap-2">
          <History size={14} className="text-[#3B82F6]" />
          <span className="text-[#9CA3AF] text-sm font-medium">Version History</span>
          <span className="text-[#6B7280] text-xs">({versions.length} versions)</span>
        </div>
        {expanded ? <ChevronUp size={14} className="text-[#6B7280]" /> : <ChevronDown size={14} className="text-[#6B7280]" />}
      </button>
      {expanded && (
        <div className="border-t border-[#2A2A3A] p-3 space-y-2 max-h-[300px] overflow-y-auto">
          {versions.map((v, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1A1A26] transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[rgba(255,255,255,0.9)] text-sm font-medium">
                    {i === 0 ? 'Current version' : `Version ${versions.length - i}`}
                  </span>
                  {i === 0 && <span className="text-[#10B981] text-xs bg-[#10B981]/10 px-1.5 py-0.5 rounded">Active</span>}
                </div>
                <span className="text-[#6B7280] text-xs">
                  {formatDateTime(v.timestamp)} - {v.reason || 'Edited'}
                </span>
              </div>
              {i > 0 && onRestore && (
                <button
                  onClick={() => onRestore(v)}
                  className="flex items-center gap-1 text-[#3B82F6] hover:text-[#60A5FA] text-xs px-2 py-1"
                >
                  <RotateCcw size={12} /> Restore
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Source Selection ────────────────────────────────────────────────────
function SourceSelector({ strategies, clients, onSelect }) {
  const [fromStrategy, setFromStrategy] = useState(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('bw:proposal-from-strategy');
      if (stored) {
        const data = JSON.parse(stored);
        setFromStrategy(data);
        sessionStorage.removeItem('bw:proposal-from-strategy');
      }
    } catch { /* ignore */ }
  }, []);

  if (fromStrategy) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">Proposal Source</h2>
        <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg p-4">
          <p className="text-[#10B981] text-sm font-medium mb-1">Strategy imported</p>
          <p className="text-[#9CA3AF] text-sm">
            Creating proposal from strategy for {fromStrategy.clientName}. The strategy content will be included as context.
          </p>
          <button
            onClick={() => onSelect({ type: 'strategy', data: fromStrategy })}
            className="mt-3 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg"
          >
            Continue with this strategy
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">Select Source</h2>
        <p className="text-[#6B7280] text-sm mt-1">Choose how to start your proposal.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => onSelect({ type: 'scratch' })}
          className="text-left p-4 rounded-lg border border-[#2A2A3A] bg-[#1A1A26] hover:border-[#3A3A4A] transition-colors"
        >
          <FileText size={20} className="text-[#10B981] mb-2" />
          <h3 className="text-[rgba(255,255,255,0.9)] font-medium text-sm">From Scratch</h3>
          <p className="text-[#6B7280] text-xs mt-1">Start with a blank brief</p>
        </button>

        <button
          onClick={() => onSelect({ type: 'strategy-list' })}
          className={classNames(
            'text-left p-4 rounded-lg border transition-colors',
            strategies.length > 0
              ? 'border-[#2A2A3A] bg-[#1A1A26] hover:border-[#3A3A4A]'
              : 'border-[#2A2A3A] bg-[#1A1A26] opacity-50 cursor-not-allowed'
          )}
          disabled={strategies.length === 0}
        >
          <Sparkles size={20} className="text-[#3B82F6] mb-2" />
          <h3 className="text-[rgba(255,255,255,0.9)] font-medium text-sm">From Strategy</h3>
          <p className="text-[#6B7280] text-xs mt-1">
            {strategies.length > 0 ? `${strategies.length} strategies available` : 'No strategies yet'}
          </p>
        </button>

        <button
          onClick={() => onSelect({ type: 'client-list' })}
          className={classNames(
            'text-left p-4 rounded-lg border transition-colors',
            clients.length > 0
              ? 'border-[#2A2A3A] bg-[#1A1A26] hover:border-[#3A3A4A]'
              : 'border-[#2A2A3A] bg-[#1A1A26] opacity-50 cursor-not-allowed'
          )}
          disabled={clients.length === 0}
        >
          <Building size={20} className="text-[#F59E0B] mb-2" />
          <h3 className="text-[rgba(255,255,255,0.9)] font-medium text-sm">From Client Profile</h3>
          <p className="text-[#6B7280] text-xs mt-1">
            {clients.length > 0 ? `${clients.length} clients available` : 'No clients yet'}
          </p>
        </button>
      </div>
    </div>
  );
}

// ── Strategy Picker ────────────────────────────────────────────────────
function StrategyPicker({ strategies, clients, onSelect, onBack }) {
  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [clients]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-[#6B7280] hover:text-[#9CA3AF] p-1"><ArrowLeft size={16} /></button>
        <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">Select Strategy</h2>
      </div>
      <div className="space-y-2">
        {strategies.map(s => (
          <button
            key={s.id}
            onClick={() => onSelect(s)}
            className="w-full text-left p-4 rounded-lg border border-[#2A2A3A] bg-[#1A1A26] hover:border-[#3A3A4A] transition-colors"
          >
            <h3 className="text-[rgba(255,255,255,0.9)] font-medium text-sm">{s.title}</h3>
            <p className="text-[#6B7280] text-xs mt-0.5">
              {clientMap[s.clientId] || 'Unknown'} - {formatDate(s.createdAt)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Client Picker ──────────────────────────────────────────────────────
function ClientPicker({ clients, onSelect, onBack }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="text-[#6B7280] hover:text-[#9CA3AF] p-1"><ArrowLeft size={16} /></button>
        <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">Select Client</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {clients.map(c => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="text-left p-4 rounded-lg border border-[#2A2A3A] bg-[#1A1A26] hover:border-[#3A3A4A] transition-colors"
          >
            <h3 className="text-[rgba(255,255,255,0.9)] font-medium text-sm">{c.name}</h3>
            {c.sector && <p className="text-[#6B7280] text-xs mt-0.5">{c.sector}</p>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Proposal Brief Form ────────────────────────────────────────────────
function ProposalBriefForm({ brief, setBrief, onGenerate, loading, sourceContext }) {
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setBrief(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const errs = {};
    if (!brief.title?.trim()) errs.title = 'Title is required';
    if (!brief.clientName?.trim()) errs.clientName = 'Client/prospect name is required';
    if (!brief.proposed?.trim()) errs.proposed = 'Describe what is being proposed';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onGenerate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">Proposal Brief</h2>
        <p className="text-[#6B7280] text-sm mt-1">Fill in the details for AI proposal generation.</p>
        {sourceContext && (
          <p className="text-[#10B981] text-xs mt-1">{sourceContext}</p>
        )}
      </div>

      <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#9CA3AF] text-xs mb-1.5">Proposal Title *</label>
            <input
              type="text"
              value={brief.title || ''}
              onChange={e => handleChange('title', e.target.value)}
              placeholder="e.g. Social Media Strategy Proposal"
              className={classNames('w-full', errors.title && 'border-[#EF4444]')}
            />
            {errors.title && <p className="text-[#EF4444] text-xs mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-[#9CA3AF] text-xs mb-1.5">Client / Prospect Name *</label>
            <input
              type="text"
              value={brief.clientName || ''}
              onChange={e => handleChange('clientName', e.target.value)}
              placeholder="Company or person name"
              className={classNames('w-full', errors.clientName && 'border-[#EF4444]')}
            />
            {errors.clientName && <p className="text-[#EF4444] text-xs mt-1">{errors.clientName}</p>}
          </div>
        </div>

        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Target Audience</label>
          <input
            type="text"
            value={brief.audience || ''}
            onChange={e => handleChange('audience', e.target.value)}
            placeholder="Who is this proposal aimed at?"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">What is Being Proposed *</label>
          <textarea
            value={brief.proposed || ''}
            onChange={e => handleChange('proposed', e.target.value)}
            placeholder="Describe the services, scope, or partnership being proposed..."
            rows={3}
            className={classNames('w-full resize-y', errors.proposed && 'border-[#EF4444]')}
          />
          {errors.proposed && <p className="text-[#EF4444] text-xs mt-1">{errors.proposed}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#9CA3AF] text-xs mb-1.5">Tone</label>
            <select
              value={brief.tone || 'Partnership'}
              onChange={e => handleChange('tone', e.target.value)}
              className="w-full"
            >
              {PROPOSAL_TONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[#9CA3AF] text-xs mb-1.5">Budget Range</label>
            <select
              value={brief.budgetRange || ''}
              onChange={e => handleChange('budgetRange', e.target.value)}
              className="w-full"
            >
              <option value="">Not specified</option>
              {BUDGET_RANGES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Key Proof Points</label>
          <textarea
            value={brief.proofPoints || ''}
            onChange={e => handleChange('proofPoints', e.target.value)}
            placeholder="Case studies, results, credentials, notable clients..."
            rows={2}
            className="w-full resize-y"
          />
        </div>

        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Likely Objections</label>
          <textarea
            value={brief.objections || ''}
            onChange={e => handleChange('objections', e.target.value)}
            placeholder="What might the client push back on? Price, timeline, scope?"
            rows={2}
            className="w-full resize-y"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#9CA3AF] text-xs mb-1.5">Contact Name</label>
            <input
              type="text"
              value={brief.contactName || ''}
              onChange={e => handleChange('contactName', e.target.value)}
              placeholder="Who should they contact?"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-[#9CA3AF] text-xs mb-1.5">Contact Email</label>
            <input
              type="email"
              value={brief.contactEmail || ''}
              onChange={e => handleChange('contactEmail', e.target.value)}
              placeholder="email@bearwitness.world"
              className="w-full"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-5 py-3 bg-[#10B981] hover:bg-[#059669] disabled:opacity-50 text-white font-medium rounded-lg text-sm"
      >
        <Sparkles size={16} />
        {loading ? 'Generating...' : 'Generate Proposal'}
      </button>
    </form>
  );
}

// ── Proposal Display (fully featured) ─────────────────────────────────
function ProposalDisplay({ proposal, onSave, onUpdateContent, onStatusChange, isSavedView }) {
  const [previewMode, setPreviewMode] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const sections = useMemo(() => parseProposalSections(proposal?.content), [proposal?.content]);

  const fallbackCopy = (text) => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  };

  const handleCopyMarkdown = async () => {
    const md = proposal.content || '';
    try { await navigator.clipboard.writeText(md); } catch { fallbackCopy(md); }
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyHTML = async () => {
    const html = (proposal.content || '')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');
    try { await navigator.clipboard.writeText(`<div>${html}</div>`); } catch { fallbackCopy(`<div>${html}</div>`); }
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const handlePrint = () => {
    const clientName = proposal.clientName || proposal.brief?.clientName || 'Client';
    const contentHtml = (proposal.content || '')
      .replace(/^## (.+)$/gm, '<h2 style="font-size:22px;margin-top:36px;margin-bottom:14px;color:#111;font-weight:700;">$1</h2>')
      .replace(/^### (.+)$/gm, '<h3 style="font-size:17px;margin-top:24px;margin-bottom:10px;color:#333;font-weight:600;">$1</h3>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/^\s*[-*]\s+(.+)$/gm, '<li style="margin-left:20px;margin-bottom:6px;line-height:1.7;">$1</li>')
      .replace(/\n\n/g, '</p><p style="margin-bottom:14px;line-height:1.7;color:#333;">')
      .replace(/\n/g, '<br/>');

    const html = `<!DOCTYPE html><html><head><title>${proposal.title || 'Proposal'} - ${clientName}</title><style>
      body { font-family: 'Georgia', serif; max-width: 750px; margin: 40px auto; padding: 0 40px; color: #111; line-height: 1.7; }
      h1 { font-size: 32px; border-bottom: 3px solid #10B981; padding-bottom: 16px; margin-bottom: 8px; }
      h2 { color: #10B981; page-break-after: avoid; }
      li { list-style-type: disc; }
      .meta { color: #666; font-size: 14px; margin-bottom: 40px; }
      @media print { body { margin: 0; padding: 20px; } }
    </style></head><body>
      <h1>${proposal.title || 'Proposal'}</h1>
      <div class="meta">
        <p>Prepared for: <strong>${clientName}</strong></p>
        <p>Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p>Prepared by: Bear Witness</p>
      </div>
      <p style="margin-bottom:14px;line-height:1.7;color:#333;">${contentHtml}</p>
    </body></html>`;

    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const handleShareLink = async () => {
    const data = {
      title: proposal.title,
      client: proposal.clientName,
      content: proposal.content,
      date: new Date().toISOString(),
    };
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const url = `data:text/html;base64,${btoa(unescape(encodeURIComponent(
      `<!DOCTYPE html><html><head><title>${proposal.title}</title><style>body{font-family:Georgia,serif;max-width:750px;margin:40px auto;padding:0 40px;color:#111;line-height:1.7;}h2{color:#10B981;margin-top:32px;}li{list-style-type:disc;margin-left:20px;}</style></head><body><h1>${proposal.title}</h1><p style="color:#666;">Prepared for: ${proposal.clientName || ''}</p>${(proposal.content || '').replace(/^## (.+)$/gm, '<h2>$1</h2>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</body></html>`
    )))}`;
    try { await navigator.clipboard.writeText(url); } catch { fallbackCopy(url); }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSectionEdit = (sectionIndex, newContent) => {
    if (!onUpdateContent) return;
    const updatedSections = [...sections];
    updatedSections[sectionIndex] = { ...updatedSections[sectionIndex], content: newContent };
    const newFullContent = updatedSections.map(s =>
      s.title ? `## ${s.title}\n${s.content}` : s.content
    ).join('\n');
    onUpdateContent(newFullContent, 'Section edited');
  };

  // ── Preview Mode ────────────────────────────────────────────────────
  if (previewMode) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPreviewMode(false)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] transition-colors"
            >
              <ArrowLeft size={14} />
              Exit Preview
            </button>
            <span className="text-[#10B981] text-xs font-medium">Client-facing preview</span>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] transition-colors"
          >
            <Printer size={14} />
            Print / PDF
          </button>
        </div>

        {/* Clean white preview */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-8 md:p-12 max-w-[700px] mx-auto">
            <h1 className="text-3xl font-bold text-[#111] mb-2">{proposal.title || 'Proposal'}</h1>
            <div className="text-gray-500 text-sm mb-8 pb-6 border-b border-gray-200 space-y-1">
              <p>Prepared for: <strong className="text-gray-700">{proposal.clientName || proposal.brief?.clientName}</strong></p>
              <p>{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p>Prepared by: Bear Witness</p>
            </div>
            {sections.map((section, i) => (
              <SectionCard
                key={i}
                title={section.title}
                content={section.content}
                icon={section.icon}
                isPreview
                sectionIndex={i}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Display Mode ─────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">
              {isSavedView ? proposal.title : 'Proposal Preview'}
            </h2>
            {proposal.status && isSavedView && onStatusChange ? (
              <StatusSelector currentStatus={proposal.status} onStatusChange={onStatusChange} />
            ) : proposal.status ? (
              <StatusBadge status={proposal.status} />
            ) : null}
          </div>
          <p className="text-[#6B7280] text-sm mt-0.5">
            {proposal.clientName || proposal.brief?.clientName}
            {proposal.createdAt && ` - ${formatDate(proposal.createdAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Preview toggle */}
          <button
            onClick={() => setPreviewMode(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)] transition-colors"
            title="Client-facing preview"
          >
            <Eye size={14} />
            Preview
          </button>
          {/* Copy as Markdown */}
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)] transition-colors"
            title="Copy as formatted markdown"
          >
            {copiedMd ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
            {copiedMd ? 'Copied' : 'Markdown'}
          </button>
          {/* Copy as HTML */}
          <button
            onClick={handleCopyHTML}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)] transition-colors"
            title="Copy as HTML for email"
          >
            {copiedHtml ? <Check size={14} className="text-[#10B981]" /> : <Code size={14} />}
            {copiedHtml ? 'Copied' : 'HTML'}
          </button>
          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)] transition-colors"
            title="Print-friendly view"
          >
            <Printer size={14} />
            Print
          </button>
          {/* Share Link */}
          <button
            onClick={handleShareLink}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)] transition-colors"
            title="Copy shareable link"
          >
            {copiedLink ? <Check size={14} className="text-[#10B981]" /> : <Share2 size={14} />}
            {copiedLink ? 'Copied' : 'Share'}
          </button>
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg"
            >
              <Check size={14} />
              Save Proposal
            </button>
          )}
        </div>
      </div>

      {/* Version History */}
      {proposal.versions && proposal.versions.length > 1 && (
        <VersionHistory
          versions={proposal.versions}
          onRestore={onUpdateContent ? (v) => onUpdateContent(v.content, 'Restored from version') : null}
        />
      )}

      {/* Analysis (collapsible) */}
      {proposal.analysis && (
        <div className="bg-[#12121A] border border-[#2A2A3A] rounded-lg overflow-hidden">
          <ExpandableHeader title="Business Analysis" defaultExpanded={false}>
            <div className="text-[#9CA3AF]">{renderMarkdownContent(proposal.analysis)}</div>
          </ExpandableHeader>
        </div>
      )}

      {/* Proposal content - section cards */}
      {sections.length > 1 ? (
        <div className="space-y-3">
          {sections.map((section, i) => (
            <SectionCard
              key={i}
              title={section.title}
              content={section.content}
              icon={section.icon}
              isPreview={false}
              onEdit={onUpdateContent ? handleSectionEdit : null}
              sectionIndex={i}
            />
          ))}
        </div>
      ) : (
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-5">
          <div className="text-[#9CA3AF]">{renderMarkdownContent(proposal.content)}</div>
        </div>
      )}
    </div>
  );
}

// ── Expandable Header helper ──────────────────────────────────────────
function ExpandableHeader({ title, children, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#1A1A26] transition-colors text-left"
      >
        <h3 className="text-[rgba(255,255,255,0.9)] font-semibold text-sm">{title}</h3>
        {expanded ? <ChevronUp size={16} className="text-[#6B7280] shrink-0" /> : <ChevronDown size={16} className="text-[#6B7280] shrink-0" />}
      </button>
      {expanded && (
        <div className="px-5 pb-4 pt-0">{children}</div>
      )}
    </>
  );
}

// ── Saved Proposals List ───────────────────────────────────────────────
function SavedProposalsList({ proposals, clients, onView, onDelete, searchQuery, clientFilter, statusFilter }) {
  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    let results = [...proposals];
    if (clientFilter) results = results.filter(p => p.clientId === clientFilter);
    if (statusFilter) results = results.filter(p => p.status === statusFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.content?.toLowerCase().includes(q) ||
        p.clientName?.toLowerCase().includes(q) ||
        (clientMap[p.clientId]?.name || '').toLowerCase().includes(q)
      );
    }
    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [proposals, searchQuery, clientFilter, statusFilter, clientMap]);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-12 text-[#6B7280]">
        <FileText size={32} className="mx-auto mb-3 text-[#2A2A3A]" />
        <p className="text-sm">
          {proposals.length === 0 ? 'No saved proposals yet.' : 'No proposals match your search.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map(p => {
        const client = clientMap[p.clientId];
        const color = client ? getClientColor(client.id) : '#6B7280';
        return (
          <div
            key={p.id}
            className="bg-[#1A1A26] border border-[#2A2A3A] hover:border-[#3A3A4A] rounded-lg p-4 flex items-center justify-between transition-colors cursor-pointer"
            onClick={() => onView(p)}
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
                <h3 className="text-[rgba(255,255,255,0.9)] font-medium text-sm truncate">{p.title}</h3>
                {p.status && <StatusBadge status={p.status} />}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[#6B7280] text-xs">{p.clientName || client?.name || 'Unknown'}</span>
                <span className="text-[#6B7280] text-xs">{formatDate(p.createdAt)}</span>
                {p.versions && p.versions.length > 1 && (
                  <span className="text-[#6B7280] text-xs flex items-center gap-1">
                    <History size={10} /> {p.versions.length} versions
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-3">
              <button
                onClick={(e) => { e.stopPropagation(); onView(p); }}
                className="text-[#6B7280] hover:text-[#10B981] p-1.5"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                className="text-[#6B7280] hover:text-[#EF4444] p-1.5"
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
export default function ProposalBuilder({ onNavigate, params } = {}) {
  const store = useStore();
  const { clients = [], strategies = [], proposals = [] } = store;

  const [view, setView] = useState('list');
  const [builderStep, setBuilderStep] = useState('source');
  const [sourceType, setSourceType] = useState(null);
  const [strategyContext, setStrategyContext] = useState('');
  const [clientContext, setClientContext] = useState(null);
  const [brief, setBrief] = useState({
    title: '',
    clientName: '',
    audience: '',
    proposed: '',
    tone: 'Partnership',
    proofPoints: '',
    budgetRange: '',
    objections: '',
    contactName: '',
    contactEmail: '',
  });
  const [analysis, setAnalysis] = useState('');
  const [proposalContent, setProposalContent] = useState('');
  const [proposalVersions, setProposalVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generationPhase, setGenerationPhase] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [viewingProposal, setViewingProposal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

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

  // Handle params
  useEffect(() => {
    if (params?.action === 'add') {
      setView('builder');
      resetBuilder();
    } else if (params?.proposalId) {
      const p = proposals.find(x => x.id === params.proposalId);
      if (p) { setViewingProposal(p); setView('view'); }
    }
  }, [params]);

  const resetBuilder = () => {
    setBuilderStep('source');
    setSourceType(null);
    setStrategyContext('');
    setClientContext(null);
    setBrief({
      title: '',
      clientName: '',
      audience: '',
      proposed: '',
      tone: 'Partnership',
      proofPoints: '',
      budgetRange: '',
      objections: '',
      contactName: '',
      contactEmail: '',
    });
    setAnalysis('');
    setProposalContent('');
    setProposalVersions([]);
    setLoading(false);
    setGenerationPhase('');
    setElapsed(0);
  };

  const handleSourceSelect = (source) => {
    if (source.type === 'scratch') {
      setSourceType('scratch');
      setBuilderStep('brief');
    } else if (source.type === 'strategy') {
      setSourceType('strategy');
      setStrategyContext(source.data.strategyContent || '');
      setBrief(prev => ({
        ...prev,
        clientName: source.data.clientName || '',
        clientId: source.data.clientId || '',
      }));
      setClientContext(source.data.clientId ? clients.find(c => c.id === source.data.clientId) : null);
      setBuilderStep('brief');
    } else if (source.type === 'strategy-list') {
      setBuilderStep('pick-strategy');
    } else if (source.type === 'client-list') {
      setBuilderStep('pick-client');
    }
  };

  const handleStrategyPick = (strategy) => {
    const client = clients.find(c => c.id === strategy.clientId);
    setSourceType('strategy');
    setStrategyContext(strategy.content || '');
    setClientContext(client);
    setBrief(prev => ({
      ...prev,
      clientName: client?.name || '',
      clientId: strategy.clientId,
    }));
    setBuilderStep('brief');
  };

  const handleClientPick = (client) => {
    setSourceType('client');
    setClientContext(client);
    setBrief(prev => ({
      ...prev,
      clientName: client.name,
      clientId: client.id,
      audience: client.targetAudience || '',
    }));
    setBuilderStep('brief');
  };

  const handleGenerate = async () => {
    setLoading(true);

    try {
      let context = `Client: ${brief.clientName}\n`;
      if (clientContext) {
        context += `Sector: ${clientContext.sector || 'N/A'}\n`;
        context += `Platforms: ${clientContext.platforms?.join(', ') || 'N/A'}\n`;
        context += `Budget: ${clientContext.budgetRange || brief.budgetRange || 'N/A'}\n`;
        context += `Goals: ${clientContext.goals || 'N/A'}\n`;
        context += `Target Audience: ${clientContext.targetAudience || brief.audience || 'N/A'}\n`;
      }
      if (strategyContext) {
        context += `\n--- Existing Strategy ---\n${strategyContext}\n`;
      }

      const briefText = `
Proposal Title: ${brief.title}
Client/Prospect: ${brief.clientName}
Target Audience: ${brief.audience || 'Not specified'}
What is Being Proposed: ${brief.proposed}
Tone: ${brief.tone}
Budget Range: ${brief.budgetRange || 'Not specified'}
Key Proof Points: ${brief.proofPoints || 'None provided'}
Likely Objections: ${brief.objections || 'None identified'}
Contact: ${brief.contactName || 'Bear Witness'} (${brief.contactEmail || 'hello@bearwitness.world'})`;

      // Call 1: Business Analysis
      setGenerationPhase('Analysing business opportunity...');
      const analysisResponse = await callAI({
        system: ANALYSIS_SYSTEM,
        user: `${context}\n\n--- Proposal Brief ---\n${briefText}\n\nAnalyse this business opportunity and provide a structured analysis that will inform the proposal.`,
        maxTokens: 1500,
      });
      setAnalysis(analysisResponse);

      // Call 2: Proposal Content
      setGenerationPhase('Writing proposal...');
      const toneGuidance = {
        Partnership: 'Frame this as a strategic partnership. We are collaborators, not vendors.',
        Commercial: 'Frame this commercially. Clear value exchange, ROI-focused.',
        'Vision-led': 'Lead with vision and ambition. Paint a picture of what is possible.',
        Authoritative: 'Lead with authority and expertise. Position Bear Witness as the clear experts.',
      };

      const proposalResponse = await callAI({
        system: PROPOSAL_SYSTEM,
        user: `Business Analysis:\n${analysisResponse}\n\n--- Proposal Brief ---\n${briefText}\n\n${context}\n\nTone guidance: ${toneGuidance[brief.tone] || toneGuidance.Partnership}\n\nWrite the complete proposal now. Use ## headings for each major section.`,
        maxTokens: 4096,
      });
      setProposalContent(proposalResponse);
      setProposalVersions([{
        content: proposalResponse,
        timestamp: new Date().toISOString(),
        reason: 'AI generated',
      }]);
      setBuilderStep('preview');
    } catch (err) {
      setProposalContent(`Error generating proposal: ${err.message}`);
      setBuilderStep('preview');
    } finally {
      setLoading(false);
      setGenerationPhase('');
    }
  };

  const handleUpdateBuilderContent = (newContent, reason = 'Manual edit') => {
    setProposalContent(newContent);
    setProposalVersions(prev => [{
      content: newContent,
      timestamp: new Date().toISOString(),
      reason,
    }, ...prev]);
  };

  const handleSaveProposal = () => {
    const data = {
      clientId: brief.clientId || clientContext?.id || '',
      clientName: brief.clientName,
      title: brief.title || `Proposal for ${brief.clientName}`,
      type: brief.tone?.toLowerCase() || 'partnership',
      content: proposalContent,
      analysis,
      brief: { ...brief },
      strategyContext: strategyContext ? truncate(strategyContext, 500) : '',
      status: 'Draft',
      versions: proposalVersions,
      createdAt: new Date().toISOString(),
    };
    store.addProposal(data);
    store.addActivity({
      type: 'proposal_generated',
      message: `Generated proposal for ${brief.clientName}`,
      clientId: data.clientId,
    });
    setView('list');
    resetBuilder();
  };

  const handleViewProposal = (p) => {
    setViewingProposal(p);
    setView('view');
  };

  const handleDeleteProposal = (id) => {
    if (window.confirm('Delete this proposal?')) {
      store.deleteProposal(id);
      store.addActivity({ type: 'proposal_deleted', message: 'Proposal deleted' });
      if (viewingProposal?.id === id) {
        setViewingProposal(null);
        setView('list');
      }
    }
  };

  const handleUpdateSavedContent = (newContent, reason = 'Manual edit') => {
    if (!viewingProposal) return;
    const existingVersions = viewingProposal.versions || [{
      content: viewingProposal.content,
      timestamp: viewingProposal.createdAt || new Date().toISOString(),
      reason: 'Original',
    }];
    const newVersions = [{
      content: newContent,
      timestamp: new Date().toISOString(),
      reason,
    }, ...existingVersions];

    store.updateProposal(viewingProposal.id, {
      content: newContent,
      versions: newVersions,
    });

    setViewingProposal(prev => ({
      ...prev,
      content: newContent,
      versions: newVersions,
    }));
  };

  const handleStatusChange = (newStatus) => {
    if (!viewingProposal) return;
    store.updateProposal(viewingProposal.id, { status: newStatus });
    setViewingProposal(prev => ({ ...prev, status: newStatus }));
    store.addActivity({
      type: 'proposal_status_changed',
      message: `Proposal "${viewingProposal.title}" status changed to ${newStatus}`,
      clientId: viewingProposal.clientId,
    });
  };

  // ── View: Saved Proposal ──────────────────────────────────────────────
  if (view === 'view' && viewingProposal) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); setViewingProposal(null); }} className="text-[#6B7280] hover:text-[#9CA3AF] p-1">
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[rgba(255,255,255,0.9)]">{viewingProposal.title}</h1>
            </div>
            <p className="text-[#6B7280] text-xs mt-0.5">
              {viewingProposal.clientName} - {formatDate(viewingProposal.createdAt)}
            </p>
          </div>
        </div>
        <ProposalDisplay
          proposal={viewingProposal}
          isSavedView
          onUpdateContent={handleUpdateSavedContent}
          onStatusChange={handleStatusChange}
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
            <h1 className="text-xl font-bold text-[rgba(255,255,255,0.9)]">Proposal Builder</h1>
            <p className="text-[#6B7280] text-xs mt-0.5">AI-powered proposal generation</p>
          </div>
        </div>

        {builderStep === 'source' && (
          <SourceSelector strategies={strategies} clients={clients} onSelect={handleSourceSelect} />
        )}

        {builderStep === 'pick-strategy' && (
          <StrategyPicker
            strategies={strategies}
            clients={clients}
            onSelect={handleStrategyPick}
            onBack={() => setBuilderStep('source')}
          />
        )}

        {builderStep === 'pick-client' && (
          <ClientPicker
            clients={clients}
            onSelect={handleClientPick}
            onBack={() => setBuilderStep('source')}
          />
        )}

        {builderStep === 'brief' && !loading && (
          <ProposalBriefForm
            brief={brief}
            setBrief={setBrief}
            onGenerate={handleGenerate}
            loading={loading}
            sourceContext={
              sourceType === 'strategy' ? 'Strategy content will be included as context.'
              : sourceType === 'client' ? `Using ${clientContext?.name} client profile as context.`
              : null
            }
          />
        )}

        {loading && (
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#10B981] animate-pulse" />
                <span className="text-[rgba(255,255,255,0.9)] text-sm font-medium">{generationPhase}</span>
              </div>
              <span className="text-[#6B7280] text-xs font-mono">{elapsed}s</span>
            </div>
            <p className="text-[#6B7280] text-xs">This typically takes 30-60 seconds. Two AI passes: business analysis then proposal writing.</p>

            <ProposalLoadingSkeleton phase={analysis ? 'proposal' : 'analysis'} />

            {/* Progress steps */}
            <div className="pt-3 border-t border-[#2A2A3A] space-y-2">
              <div className="flex items-center gap-2 text-xs">
                {analysis ? (
                  <Check size={12} className="text-[#10B981]" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-[#10B981] border-t-transparent animate-spin" />
                )}
                <span className={analysis ? 'text-[#10B981]' : 'text-[#9CA3AF]'}>Business analysis</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {proposalContent && !loading ? (
                  <Check size={12} className="text-[#10B981]" />
                ) : analysis ? (
                  <div className="w-3 h-3 rounded-full border border-[#10B981] border-t-transparent animate-spin" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-[#2A2A3A]" />
                )}
                <span className={analysis ? 'text-[#9CA3AF]' : 'text-[#6B7280]'}>Proposal writing</span>
              </div>
            </div>
          </div>
        )}

        {builderStep === 'preview' && (
          <ProposalDisplay
            proposal={{
              title: brief.title,
              clientName: brief.clientName,
              content: proposalContent,
              analysis,
              brief,
              versions: proposalVersions,
            }}
            onSave={handleSaveProposal}
            onUpdateContent={handleUpdateBuilderContent}
          />
        )}
      </div>
    );
  }

  // ── View: List ─────────────────────────────────────────────────────────
  // Count by status for overview
  const statusCounts = useMemo(() => {
    const counts = {};
    PROPOSAL_STATUSES.forEach(s => { counts[s.key] = 0; });
    proposals.forEach(p => {
      if (counts[p.status] !== undefined) counts[p.status]++;
    });
    return counts;
  }, [proposals]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[rgba(255,255,255,0.9)]">Proposal Builder</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">{proposals.length} saved proposal{proposals.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setView('builder'); resetBuilder(); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Proposal
        </button>
      </div>

      {/* Status overview */}
      {proposals.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {PROPOSAL_STATUSES.map(s => {
            const count = statusCounts[s.key] || 0;
            if (count === 0 && !statusFilter) return null;
            const isActive = statusFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setStatusFilter(isActive ? '' : s.key)}
                className={classNames(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border',
                  isActive
                    ? 'border-current'
                    : 'border-[#2A2A3A] hover:border-[#3A3A4A]'
                )}
                style={{ color: isActive ? s.color : '#6B7280' }}
              >
                {s.label}
                <span className={classNames(
                  'px-1.5 py-0.5 rounded text-[10px]',
                  isActive ? 'bg-current/10' : 'bg-[#222233]'
                )}
                  style={isActive ? { backgroundColor: `${s.color}15` } : {}}
                >
                  {count}
                </span>
              </button>
            );
          })}
          {statusFilter && (
            <button
              onClick={() => setStatusFilter('')}
              className="text-[#6B7280] hover:text-[#9CA3AF] text-xs flex items-center gap-1"
            >
              <X size={12} /> Clear filter
            </button>
          )}
        </div>
      )}

      {/* Search and Filter */}
      {proposals.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search proposals..."
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

      <SavedProposalsList
        proposals={proposals}
        clients={clients}
        onView={handleViewProposal}
        onDelete={handleDeleteProposal}
        searchQuery={searchQuery}
        clientFilter={clientFilter}
        statusFilter={statusFilter}
      />
    </div>
  );
}
