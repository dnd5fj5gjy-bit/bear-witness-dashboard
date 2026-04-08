import { useState, useEffect, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import {
  LayoutDashboard, Users, Megaphone, Calendar, BookOpen,
  Brain, FileText, Settings, Search, ChevronLeft, ChevronRight,
  X,
} from 'lucide-react';
import { formatTime, getInitials } from '../lib/utils';

const NAV_ITEMS = [
  { key: 'command-centre', label: 'Command Centre', icon: LayoutDashboard },
  { key: 'client-hub', label: 'Client Hub', icon: Users },
  { key: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { key: 'content-calendar', label: 'Content Calendar', icon: Calendar },
  { key: 'research-log', label: 'Research Log', icon: BookOpen },
  { key: 'strategy-engine', label: 'Strategy Engine', icon: Brain },
  { key: 'proposal-builder', label: 'Proposal Builder', icon: FileText },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export default function Layout({ activeModule, onNavigate, children }) {
  const { settings, globalSearch } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
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

  return (
    <div className="flex h-screen w-full overflow-hidden">
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
                  <span className="text-sm font-medium whitespace-nowrap overflow-hidden">{item.label}</span>
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

          <div className="flex items-center gap-4">
            {/* Global Search */}
            <div className="relative" ref={searchRef}>
              <div className="flex items-center gap-2 bg-[#12121A] border border-[#2A2A3A] rounded-md px-3 py-1.5 w-[280px] focus-within:border-emerald-500/40 transition-colors">
                <Search size={14} className="text-[#6B7280] flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search everything..."
                  className="bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-[#6B7280] w-full p-0"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowSearch(true)}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setShowSearch(false); }} className="text-[#6B7280] hover:text-white">
                    <X size={12} />
                  </button>
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
                          <div className="text-sm text-white/90 truncate">{result.name}</div>
                          <div className="text-xs text-[#6B7280] truncate">{result.subtitle}</div>
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
