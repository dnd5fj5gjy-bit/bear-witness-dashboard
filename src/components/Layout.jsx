import { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { useStore } from '../hooks/useStore';
import {
  LayoutDashboard, Users, Megaphone, Calendar, Flame, BookOpen,
  Brain, FileText, Settings, Search, ChevronLeft, ChevronRight,
  X, Bell, Command, UserPlus, CalendarClock, NotebookPen,
  CheckCircle, AlertCircle, Info, AlertTriangle,
} from 'lucide-react';
import { formatTime, getInitials, relativeTime } from '../lib/utils';

// ─── NAV ITEMS ──────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: 'command-centre', label: 'Command Centre', icon: LayoutDashboard },
  { key: 'client-hub', label: 'Client Hub', icon: Users },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { key: 'content-calendar', label: 'Content Calendar', icon: Calendar },
  { key: 'content-forge', label: 'Content Forge', icon: Flame },
  { key: 'research-log', label: 'Research Log', icon: BookOpen },
  { key: 'strategy-engine', label: 'Strategy Engine', icon: Brain },
  { key: 'proposal-builder', label: 'Proposal Builder', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
];

// ─── TOAST SYSTEM ───────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-400', Icon: CheckCircle },
  error:   { bg: 'bg-red-500/15',     border: 'border-red-500/30',     text: 'text-red-400',     Icon: AlertCircle },
  info:    { bg: 'bg-blue-500/15',    border: 'border-blue-500/30',    text: 'text-blue-400',    Icon: Info },
  warning: { bg: 'bg-amber-500/15',   border: 'border-amber-500/30',   text: 'text-amber-400',   Icon: AlertTriangle },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => {
          const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
          const TIcon = style.Icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl backdrop-blur-sm ${style.bg} ${style.border} animate-slide-in-right`}
              style={{ minWidth: 280, maxWidth: 400 }}
            >
              <TIcon size={16} className={`${style.text} flex-shrink-0`} />
              <span className="text-sm text-white/90 flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.25s ease-out forwards;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ─── COMMAND PALETTE ────────────────────────────────────────────────────────────

const COMMAND_PALETTE_ACTIONS = [
  { label: 'Add Client',        icon: UserPlus,      color: '#10B981', shortcut: '1', navKey: 'client-hub',       navParams: { action: 'add' }, description: 'Create a new client profile' },
  { label: 'Create Campaign',   icon: Megaphone,     color: '#3B82F6', shortcut: '2', navKey: 'campaigns',        navParams: { action: 'add' }, description: 'Launch a new marketing campaign' },
  { label: 'Log Note',          icon: NotebookPen,   color: '#F59E0B', shortcut: '3', navKey: 'research-log',     navParams: { action: 'add' }, description: 'Record research or meeting notes' },
  { label: 'Schedule Post',     icon: CalendarClock,  color: '#8B5CF6', shortcut: '4', navKey: 'content-calendar', navParams: { action: 'add' }, description: 'Plan and schedule content' },
  { label: 'Generate Strategy', icon: Brain,          color: '#EC4899', shortcut: '5', navKey: 'strategy-engine',  navParams: { action: 'add' }, description: 'AI-powered strategy generation' },
];

function CommandPalette({ open, onClose, onNavigate }) {
  const paletteRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const num = parseInt(e.key);
      if (num >= 1 && num <= COMMAND_PALETTE_ACTIONS.length) {
        const action = COMMAND_PALETTE_ACTIONS[num - 1];
        onNavigate(action.navKey, action.navParams);
        onClose();
      }
    }
    function handleClick(e) {
      if (paletteRef.current && !paletteRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open, onClose, onNavigate]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh]" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div
        ref={paletteRef}
        className="w-full max-w-[480px] bg-[#1A1A26] border border-[#2A2A3A] rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A3A]">
          <div className="flex items-center gap-2">
            <Command size={14} className="text-emerald-400" />
            <span className="text-sm font-semibold text-white/90">Quick Actions</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#6B7280] bg-[#12121A] px-1.5 py-0.5 rounded font-mono">ESC</span>
            <button onClick={onClose} className="text-[#6B7280] hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-2">
          {COMMAND_PALETTE_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => {
                  onNavigate(action.navKey, action.navParams);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-md hover:bg-white/5 transition-colors text-left group"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${action.color}15` }}
                >
                  <Icon size={16} style={{ color: action.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white/90 font-medium">{action.label}</div>
                  <div className="text-xs text-[#6B7280]">{action.description}</div>
                </div>
                <span className="text-[10px] font-mono text-[#6B7280] bg-[#12121A] px-2 py-1 rounded flex-shrink-0 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors">
                  {action.shortcut}
                </span>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="px-5 py-2.5 border-t border-[#2A2A3A] flex items-center gap-3">
          <span className="text-[10px] text-[#6B7280]">Press number key to select</span>
          <span className="text-[10px] text-[#6B7280]">|</span>
          <span className="text-[10px] text-[#6B7280] flex items-center gap-1">
            <kbd className="bg-[#12121A] px-1 py-0.5 rounded font-mono">{navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+N</kbd> to toggle
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── SEARCH HIGHLIGHT HELPER ────────────────────────────────────────────────────

function HighlightText({ text, query }) {
  if (!query || query.length < 2 || !text) return <>{text}</>;
  const q = query.toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-emerald-400">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── NOTIFICATION BELL ──────────────────────────────────────────────────────────

function NotificationBell({ activityFeed }) {
  const [open, setOpen] = useState(false);
  const bellRef = useRef(null);
  const recent = [...activityFeed].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
  const hasUnread = recent.length > 0;

  useEffect(() => {
    function handleClick(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const activityIcons = {
    post_published: CalendarClock,
    post_scheduled: CalendarClock,
    post_approved: CalendarClock,
    campaign_created: Megaphone,
    campaign_updated: Megaphone,
    client_updated: Users,
    research_added: NotebookPen,
    strategy_generated: Brain,
  };

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 rounded-md flex items-center justify-center hover:bg-white/5 transition-colors"
      >
        <Bell size={16} className="text-[#9CA3AF]" />
        {hasUnread && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 w-[340px] bg-[#1A1A26] border border-[#2A2A3A] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2A2A3A] flex items-center justify-between">
            <span className="text-xs font-semibold text-white/90">Recent Activity</span>
            <span className="text-[10px] text-[#6B7280]">{recent.length} items</span>
          </div>
          {recent.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-xs text-[#6B7280]">No recent activity</p>
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {recent.map(entry => {
                const Icon = activityIcons[entry.type] || Bell;
                return (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors border-b border-[#2A2A3A] last:border-0">
                    <div className="w-7 h-7 rounded-full bg-[#12121A] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon size={12} className="text-[#6B7280]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-[#9CA3AF] leading-snug">{entry.message}</p>
                      <p className="text-[10px] text-[#6B7280] mt-0.5">{relativeTime(entry.timestamp)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── LAYOUT COMPONENT ───────────────────────────────────────────────────────────

export default function Layout({ activeModule, onNavigate, children }) {
  const { settings, globalSearch, campaigns, posts, activityFeed } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);

  // Badge counts
  const activeCampaignCount = campaigns.filter(c => c.status === 'Active').length;
  const now = Date.now();
  const weekFromNow = now + 7 * 86400000;
  const postsThisWeek = posts.filter(p => {
    if (p.status !== 'Scheduled') return false;
    const d = new Date(p.scheduledDate).getTime();
    return d >= now && d <= weekFromNow;
  }).length;

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcuts: Cmd/Ctrl+K for search, Cmd/Ctrl+N for command palette
  useEffect(() => {
    function handleKeyDown(e) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (isMod && e.key === 'n') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Search
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const results = globalSearch(searchQuery);
      setSearchResults(results);
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  }, [searchQuery, globalSearch]);

  // Close search on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearchResultClick = (result) => {
    setShowSearch(false);
    setSearchQuery('');
    if (result.type === 'client') onNavigate('client-hub', { clientId: result.id });
    else if (result.type === 'campaign') onNavigate('campaigns', { campaignId: result.id });
    else if (result.type === 'post') onNavigate('content-calendar', { postId: result.id });
    else if (result.type === 'research') onNavigate('research-log', { researchId: result.id });
    else if (result.type === 'strategy') onNavigate('strategy-engine', { strategyId: result.id });
    else if (result.type === 'proposal') onNavigate('proposal-builder', { proposalId: result.id });
  };

  const currentNav = NAV_ITEMS.find(n => n.key === activeModule) || NAV_ITEMS[0];
  const userInitials = settings.userName ? getInitials(settings.userName) : 'BW';

  const typeIcons = {
    client: Users,
    campaign: Megaphone,
    post: Calendar,
    research: BookOpen,
    strategy: Brain,
    proposal: FileText,
  };

  const modKey = navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl';

  // Badge map for sidebar items
  const badgeCounts = {
    'campaigns': activeCampaignCount,
    'content-calendar': postsThisWeek,
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Command Palette Overlay */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={onNavigate}
      />

      {/* Sidebar */}
      <aside
        className={`flex flex-col h-full border-r border-[#2A2A3A] transition-all duration-300 flex-shrink-0 ${
          collapsed ? 'w-[64px]' : 'w-[240px]'
        }`}
        style={{ background: '#0E0E16' }}
      >
        {/* Logo */}
        <div className="flex items-center h-[56px] px-4 border-b border-[#2A2A3A] flex-shrink-0">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-400 font-bold text-sm">BW</span>
              </div>
              <span className="text-sm font-semibold text-white/90 whitespace-nowrap">Bear Witness</span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded bg-emerald-500/20 flex items-center justify-center mx-auto">
              <span className="text-emerald-400 font-bold text-sm">BW</span>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeModule === item.key;
            const badge = badgeCounts[item.key];
            return (
              <button
                key={item.key}
                onClick={() => onNavigate(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 group relative ${
                  active
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-[#9CA3AF] hover:text-white hover:bg-white/5'
                }`}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-emerald-400 rounded-r" />
                )}
                <Icon size={18} className="flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1">{item.label}</span>
                )}
                {!collapsed && badge != null && badge > 0 && (
                  <span className="text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full min-w-[20px] text-center flex-shrink-0">
                    {badge}
                  </span>
                )}
                {collapsed && badge != null && badge > 0 && (
                  <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center h-10 border-t border-[#2A2A3A] text-[#6B7280] hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="flex items-center justify-between h-[56px] px-5 border-b border-[#2A2A3A] flex-shrink-0" style={{ background: '#0E0E16' }}>
          <div className="flex items-center gap-4">
            <h1 className="text-base font-semibold text-white/90">{currentNav.label}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search */}
            <div className="relative" ref={searchRef}>
              <div className="flex items-center gap-2 bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-1.5 w-[280px] focus-within:border-emerald-500/40 transition-colors">
                <Search size={14} className="text-[#6B7280] flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search everything..."
                  className="bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-[#6B7280] w-full p-0"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
                />
                {searchQuery ? (
                  <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="text-[#6B7280] hover:text-white">
                    <X size={12} />
                  </button>
                ) : (
                  <span className="text-[10px] text-[#6B7280] bg-[#0A0A0F] px-1.5 py-0.5 rounded font-mono flex-shrink-0">{modKey}K</span>
                )}
              </div>

              {/* Search Results Dropdown */}
              {showSearch && searchResults.length > 0 && (
                <div className="absolute top-full mt-1 left-0 w-[360px] bg-[#1A1A26] border border-[#2A2A3A] rounded-lg shadow-xl z-50 max-h-[400px] overflow-y-auto">
                  {searchResults.map(result => {
                    const TypeIcon = typeIcons[result.type] || Search;
                    return (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSearchResultClick(result)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-[#2A2A3A] last:border-0"
                      >
                        <TypeIcon size={14} className="text-[#6B7280] flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm text-white/90 truncate">
                            <HighlightText text={result.name} query={searchQuery} />
                          </div>
                          <div className="text-xs text-[#6B7280] truncate">
                            <HighlightText text={result.subtitle} query={searchQuery} />
                          </div>
                        </div>
                        <span className="ml-auto text-[10px] uppercase tracking-wider text-[#6B7280] bg-[#12121A] px-2 py-0.5 rounded flex-shrink-0">
                          {result.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {showSearch && searchResults.length === 0 && searchQuery.length >= 2 && (
                <div className="absolute top-full mt-1 left-0 w-[360px] bg-[#1A1A26] border border-[#2A2A3A] rounded-lg shadow-xl z-50 p-4">
                  <p className="text-sm text-[#6B7280]">No results for "{searchQuery}"</p>
                </div>
              )}
            </div>

            {/* Command Palette Trigger */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-white/5 transition-colors"
              title="Quick Actions"
            >
              <Command size={14} className="text-[#6B7280]" />
              <span className="text-[10px] text-[#6B7280] bg-[#0A0A0F] px-1.5 py-0.5 rounded font-mono">{modKey}N</span>
            </button>

            {/* Notification Bell */}
            <NotificationBell activityFeed={activityFeed} />

            {/* Clock */}
            <div className="text-xs text-[#6B7280] font-mono tabular-nums whitespace-nowrap">
              {clock.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              {' '}
              {formatTime(clock)}
            </div>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center cursor-pointer hover:bg-emerald-500/30 transition-colors" onClick={() => onNavigate('settings')}>
              <span className="text-xs font-semibold text-emerald-400">{userInitials}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-5" style={{ background: '#0A0A0F' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
