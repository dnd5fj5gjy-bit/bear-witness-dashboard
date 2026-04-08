import { useState, useMemo, useEffect, useCallback } from 'react';
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
  Users, Target, Building
} from 'lucide-react';

const PROPOSAL_TONES = ['Partnership', 'Commercial', 'Vision-led', 'Authoritative'];

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

Your job in this phase: analyse the business opportunity. Identify the core value proposition, the client's likely pain points, the strategic fit with Bear Witness, and the most compelling angles for the proposal. Be thorough but concise. Output a structured analysis.`;

const PROPOSAL_SYSTEM = `${PROPOSAL_SYSTEM_BASE}

Your job: write a complete client proposal. Structure it with these sections:
1. Cover (title, client name, date, prepared by)
2. Executive Context (why this matters now)
3. The Opportunity (what the client gains)
4. Our Approach (Bear Witness methodology overview)
5. The Strategy (high-level strategic direction)
6. Expected Outcomes (realistic, time-bound)
7. Investment (pricing tiers or ranges)
8. Call to Action (clear next step)

Make it compelling, specific to the client, and ready to present.`;

function LoadingSkeleton({ lines = 5 }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-[#1A1A26] rounded" style={{ width: `${90 - i * 10}%` }} />
      ))}
    </div>
  );
}

// ── Source Selection ────────────────────────────────────────────────────
function SourceSelector({ strategies, clients, onSelect }) {
  const [fromStrategy, setFromStrategy] = useState(null);

  // Check for strategy data in sessionStorage (from Strategy Engine)
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

// ── Proposal Display ───────────────────────────────────────────────────
function ProposalDisplay({ proposal, onSave, onCopy, onCopyStructured, isSavedView }) {
  const [copied, setCopied] = useState(false);
  const [copiedStructured, setCopiedStructured] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(proposal.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = proposal.content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyStructured = async () => {
    const structured = JSON.stringify({
      title: proposal.title,
      client: proposal.clientName,
      content: proposal.content,
      analysis: proposal.analysis,
      brief: proposal.brief,
      createdAt: proposal.createdAt,
    }, null, 2);
    try {
      await navigator.clipboard.writeText(structured);
      setCopiedStructured(true);
      setTimeout(() => setCopiedStructured(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = structured;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedStructured(true);
      setTimeout(() => setCopiedStructured(false), 2000);
    }
  };

  // Parse sections
  const sections = useMemo(() => {
    if (!proposal?.content) return [];
    const lines = proposal.content.split('\n');
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
  }, [proposal?.content]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[rgba(255,255,255,0.9)]">
            {isSavedView ? proposal.title : 'Proposal Preview'}
          </h2>
          <p className="text-[#6B7280] text-sm mt-0.5">
            {proposal.clientName || proposal.brief?.clientName}
            {proposal.createdAt && ` - ${formatDate(proposal.createdAt)}`}
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
          <button
            onClick={handleCopyStructured}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#3A3A4A] hover:text-[rgba(255,255,255,0.9)] transition-colors"
          >
            {copiedStructured ? <Check size={14} className="text-[#10B981]" /> : <Download size={14} />}
            {copiedStructured ? 'Copied' : 'Structured Data'}
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

      {/* Analysis (collapsible) */}
      {proposal.analysis && (
        <ExpandableSection title="Business Analysis" defaultExpanded={false}>
          <div className="text-[#9CA3AF] text-sm whitespace-pre-wrap leading-relaxed">{proposal.analysis}</div>
        </ExpandableSection>
      )}

      {/* Proposal content */}
      {sections.length > 1 ? (
        <div className="space-y-2">
          {sections.map((section, i) => (
            <ExpandableSection key={i} title={section.title} defaultExpanded>
              <div className="text-[#9CA3AF] text-sm whitespace-pre-wrap leading-relaxed">{section.content}</div>
            </ExpandableSection>
          ))}
        </div>
      ) : (
        <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-5">
          <div className="text-[#9CA3AF] text-sm whitespace-pre-wrap leading-relaxed">{proposal.content}</div>
        </div>
      )}
    </div>
  );
}

function ExpandableSection({ title, children, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!title && !children) return null;

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
        <div className={classNames('px-5 pb-4', title && 'pt-0')}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Saved Proposals List ───────────────────────────────────────────────
function SavedProposalsList({ proposals, clients, onView, onDelete, searchQuery, clientFilter }) {
  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach(c => { m[c.id] = c; });
    return m;
  }, [clients]);

  const filtered = useMemo(() => {
    let results = [...proposals];
    if (clientFilter) results = results.filter(p => p.clientId === clientFilter);
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
  }, [proposals, searchQuery, clientFilter, clientMap]);

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
                {p.status && (
                  <span className={classNames(
                    'px-2 py-0.5 text-xs rounded-md shrink-0',
                    p.status === 'Draft' && 'bg-[#F59E0B]/15 text-[#F59E0B]',
                    p.status === 'Sent' && 'bg-[#3B82F6]/15 text-[#3B82F6]',
                    p.status === 'Accepted' && 'bg-[#10B981]/15 text-[#10B981]',
                    p.status === 'Declined' && 'bg-[#EF4444]/15 text-[#EF4444]',
                  )}>
                    {p.status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[#6B7280] text-xs">{p.clientName || client?.name || 'Unknown'}</span>
                <span className="text-[#6B7280] text-xs">{formatDate(p.createdAt)}</span>
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
  const [loading, setLoading] = useState(false);
  const [generationPhase, setGenerationPhase] = useState('');
  const [viewingProposal, setViewingProposal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState('');

  // Handle params
  useEffect(() => {
    if (params?.action === 'add') {
      setView('builder');
      resetBuilder();
      if (params?.fromStrategy) {
        // Strategy data will be in sessionStorage, handled by SourceSelector
      }
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
    setLoading(false);
    setGenerationPhase('');
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
      // Build context
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

      // ── Call 1: Business Analysis ──────────────────────────────────
      setGenerationPhase('Analysing business opportunity...');
      const analysisResponse = await callAI({
        system: ANALYSIS_SYSTEM,
        user: `${context}\n\n--- Proposal Brief ---\n${briefText}\n\nAnalyse this business opportunity and provide a structured analysis that will inform the proposal.`,
        maxTokens: 1500,
      });
      setAnalysis(analysisResponse);

      // ── Call 2: Proposal Content ──────────────────────────────────
      setGenerationPhase('Writing proposal...');
      const toneGuidance = {
        Partnership: 'Frame this as a strategic partnership. We are collaborators, not vendors.',
        Commercial: 'Frame this commercially. Clear value exchange, ROI-focused.',
        'Vision-led': 'Lead with vision and ambition. Paint a picture of what is possible.',
        Authoritative: 'Lead with authority and expertise. Position Bear Witness as the clear experts.',
      };

      const proposalResponse = await callAI({
        system: PROPOSAL_SYSTEM,
        user: `Business Analysis:\n${analysisResponse}\n\n--- Proposal Brief ---\n${briefText}\n\n${context}\n\nTone guidance: ${toneGuidance[brief.tone] || toneGuidance.Partnership}\n\nWrite the complete proposal now.`,
        maxTokens: 4096,
      });
      setProposalContent(proposalResponse);
      setBuilderStep('preview');
    } catch (err) {
      setProposalContent(`Error generating proposal: ${err.message}`);
      setBuilderStep('preview');
    } finally {
      setLoading(false);
      setGenerationPhase('');
    }
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
              {viewingProposal.status && (
                <span className={classNames(
                  'px-2 py-0.5 text-xs rounded-md shrink-0',
                  viewingProposal.status === 'Draft' && 'bg-[#F59E0B]/15 text-[#F59E0B]',
                  viewingProposal.status === 'Sent' && 'bg-[#3B82F6]/15 text-[#3B82F6]',
                  viewingProposal.status === 'Accepted' && 'bg-[#10B981]/15 text-[#10B981]',
                  viewingProposal.status === 'Declined' && 'bg-[#EF4444]/15 text-[#EF4444]',
                )}>
                  {viewingProposal.status}
                </span>
              )}
            </div>
            <p className="text-[#6B7280] text-xs mt-0.5">
              {viewingProposal.clientName} - {formatDate(viewingProposal.createdAt)}
            </p>
          </div>
        </div>
        <ProposalDisplay
          proposal={viewingProposal}
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
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#10B981] animate-pulse" />
              <span className="text-[#9CA3AF] text-sm">{generationPhase}</span>
            </div>
            <LoadingSkeleton lines={10} />
            {analysis && (
              <div className="mt-4 pt-4 border-t border-[#2A2A3A]">
                <span className="text-[#10B981] text-xs flex items-center gap-1 mb-2">
                  <Check size={12} /> Business analysis complete
                </span>
                <span className="text-[#6B7280] text-xs">Now writing the proposal...</span>
              </div>
            )}
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
            }}
            onSave={handleSaveProposal}
          />
        )}
      </div>
    );
  }

  // ── View: List ─────────────────────────────────────────────────────────
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
      />
    </div>
  );
}
