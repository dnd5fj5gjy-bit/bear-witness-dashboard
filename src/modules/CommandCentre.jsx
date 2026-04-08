import { useMemo, useState } from 'react';
import { useStore } from '../hooks/useStore';
import {
  Users, Megaphone, CalendarClock, Brain, Plus,
  UserPlus, NotebookPen, Clock, ArrowRight, TrendingUp,
  TrendingDown, Zap, Activity, Eye, MousePointerClick,
  BarChart3, Command,
} from 'lucide-react';
import { getInitials, getClientColor, relativeTime, truncate, formatTime } from '../lib/utils';

// ─── STAT CARDS CONFIG ──────────────────────────────────────────────────────────

const STAT_CARDS = [
  { key: 'clients', label: 'Active Clients', icon: Users, color: '#10B981' },
  { key: 'campaigns', label: 'Active Campaigns', icon: Megaphone, color: '#3B82F6' },
  { key: 'scheduled', label: 'Posts This Week', icon: CalendarClock, color: '#F59E0B' },
  { key: 'strategies', label: 'Strategies Generated', icon: Brain, color: '#8B5CF6' },
];

// ─── QUICK ACTIONS CONFIG ───────────────────────────────────────────────────────

const QUICK_ACTIONS_CONFIG = [
  { label: 'Add Client',        icon: UserPlus,      color: '#10B981', shortcut: '\u2318 N, 1', navKey: 'client-hub',       navParams: { action: 'add' }, description: 'New client profile' },
  { label: 'New Campaign',      icon: Megaphone,     color: '#3B82F6', shortcut: '\u2318 N, 2', navKey: 'campaigns',        navParams: { action: 'add' }, description: 'Launch a campaign' },
  { label: 'Log Note',          icon: NotebookPen,   color: '#F59E0B', shortcut: '\u2318 N, 3', navKey: 'research-log',     navParams: { action: 'add' }, description: 'Research or meeting note' },
  { label: 'Schedule Post',     icon: CalendarClock,  color: '#8B5CF6', shortcut: '\u2318 N, 4', navKey: 'content-calendar', navParams: { action: 'add' }, description: 'Plan content' },
  { label: 'Generate Strategy', icon: Brain,          color: '#EC4899', shortcut: '\u2318 N, 5', navKey: 'strategy-engine',  navParams: { action: 'add' }, description: 'AI strategy generation' },
];

// ─── COMPONENT ──────────────────────────────────────────────────────────────────

export default function CommandCentre({ onNavigate }) {
  const { clients, campaigns, posts, strategies, activityFeed } = useStore();
  const [clientFilter, setClientFilter] = useState('all');

  // Filtered data based on client filter
  const filteredCampaigns = useMemo(() => {
    if (clientFilter === 'all') return campaigns;
    return campaigns.filter(c => c.clientId === clientFilter);
  }, [campaigns, clientFilter]);

  const filteredPosts = useMemo(() => {
    if (clientFilter === 'all') return posts;
    return posts.filter(p => p.clientId === clientFilter);
  }, [posts, clientFilter]);

  const filteredStrategies = useMemo(() => {
    if (clientFilter === 'all') return strategies;
    return strategies.filter(s => s.clientId === clientFilter);
  }, [strategies, clientFilter]);

  const filteredActivity = useMemo(() => {
    if (clientFilter === 'all') return activityFeed;
    return activityFeed.filter(a => a.clientId === clientFilter);
  }, [activityFeed, clientFilter]);

  // ─── STATS WITH TREND INDICATORS ────────────────────────────────────────────

  const stats = useMemo(() => {
    const now = Date.now();
    const weekFromNow = now + 7 * 86400000;
    const oneWeekAgo = now - 7 * 86400000;
    const twoWeeksAgo = now - 14 * 86400000;

    const activeClients = clients.filter(c => c.status === 'Active').length;
    const activeCampaigns = filteredCampaigns.filter(c => c.status === 'Active').length;

    // Posts scheduled this week
    const scheduledThisWeek = filteredPosts.filter(p => {
      if (p.status !== 'Scheduled') return false;
      const d = new Date(p.scheduledDate).getTime();
      return d >= now && d <= weekFromNow;
    }).length;

    // Posts that were scheduled last week (compare window: oneWeekAgo to now)
    const scheduledLastWeek = filteredPosts.filter(p => {
      const d = new Date(p.scheduledDate).getTime();
      return d >= oneWeekAgo && d < now && (p.status === 'Scheduled' || p.status === 'Published');
    }).length;

    // Campaigns active last week vs this week
    const campaignsLastWeek = filteredCampaigns.filter(c => {
      const start = new Date(c.startDate).getTime();
      const end = c.endDate ? new Date(c.endDate).getTime() : Infinity;
      return start <= oneWeekAgo && end >= twoWeeksAgo && c.status !== 'Cancelled';
    }).length;

    // Strategy count trends
    const strategiesTotal = filteredStrategies.length;
    const strategiesLastMonth = filteredStrategies.filter(s => {
      return s.createdAt < now - 30 * 86400000;
    }).length;
    const strategiesThisMonth = strategiesTotal - strategiesLastMonth;

    // Calculate trends
    const postsTrend = scheduledLastWeek > 0
      ? Math.round(((scheduledThisWeek - scheduledLastWeek) / scheduledLastWeek) * 100)
      : scheduledThisWeek > 0 ? 100 : 0;

    const campaignsTrend = campaignsLastWeek > 0
      ? Math.round(((activeCampaigns - campaignsLastWeek) / campaignsLastWeek) * 100)
      : activeCampaigns > 0 ? 100 : 0;

    return {
      clients: { value: activeClients, trend: null },
      campaigns: { value: activeCampaigns, trend: campaignsTrend },
      scheduled: { value: scheduledThisWeek, trend: postsTrend },
      strategies: { value: strategiesTotal, trend: strategiesThisMonth > 0 ? strategiesThisMonth : null },
    };
  }, [clients, filteredCampaigns, filteredPosts, filteredStrategies]);

  // ─── TODAY'S AGENDA ─────────────────────────────────────────────────────────

  const todayItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return filteredPosts
      .filter(p => {
        if (!p.scheduledDate) return false;
        const d = new Date(p.scheduledDate);
        return d >= today && d < tomorrow;
      })
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  }, [filteredPosts]);

  // ─── ACTIVE CAMPAIGNS ──────────────────────────────────────────────────────

  const activeCampaignsList = useMemo(() => {
    return filteredCampaigns
      .filter(c => c.status === 'Active')
      .map(c => {
        const client = clients.find(cl => cl.id === c.clientId);
        const campaignPosts = posts.filter(p => p.campaignId === c.id);
        const published = campaignPosts.filter(p => p.status === 'Published').length;
        const total = campaignPosts.length;
        const budgetSpent = c.budgetSpent ? parseFloat(c.budgetSpent) : 0;
        const budgetTotal = c.budget ? parseFloat(c.budget) : 0;
        const budgetPct = budgetTotal > 0 ? Math.round((budgetSpent / budgetTotal) * 100) : 0;
        return { ...c, clientName: client?.name || 'Unknown', published, total, budgetPct, budgetTotal, budgetSpent };
      });
  }, [filteredCampaigns, clients, posts]);

  // ─── CLIENT TILES ──────────────────────────────────────────────────────────

  const clientTiles = useMemo(() => {
    return clients
      .filter(c => c.status === 'Active')
      .map(c => {
        const activeCamps = campaigns.filter(
          camp => camp.clientId === c.id && camp.status === 'Active'
        ).length;
        return { ...c, activeCampaigns: activeCamps };
      });
  }, [clients, campaigns]);

  // ─── PERFORMANCE SNAPSHOT ──────────────────────────────────────────────────

  const performanceSnapshot = useMemo(() => {
    const publishedPosts = filteredPosts.filter(p => p.status === 'Published' && p.analytics);
    let totalReach = 0;
    let totalImpressions = 0;
    let totalEngagement = 0;
    let totalPosts = publishedPosts.length;

    publishedPosts.forEach(p => {
      const a = p.analytics;
      totalReach += (a.views || 0);
      totalImpressions += (a.views || 0) + (a.shares || 0) * 3;
      totalEngagement += (a.likes || 0) + (a.comments || 0) + (a.shares || 0) + (a.saves || 0);
    });

    const avgEngagement = totalPosts > 0 ? (totalEngagement / totalReach * 100).toFixed(1) : '0.0';

    return { totalReach, totalImpressions, totalEngagement, totalPosts, avgEngagement };
  }, [filteredPosts]);

  // ─── RECENT ACTIVITY ───────────────────────────────────────────────────────

  const recentActivity = useMemo(() => {
    return [...filteredActivity]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [filteredActivity]);

  // ─── QUICK ACTIONS ─────────────────────────────────────────────────────────

  const quickActions = QUICK_ACTIONS_CONFIG.map(qa => ({
    ...qa,
    action: () => onNavigate(qa.navKey, qa.navParams),
  }));

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  const activityIcons = {
    post_published: Zap,
    post_scheduled: CalendarClock,
    post_approved: CalendarClock,
    campaign_created: Megaphone,
    campaign_updated: Megaphone,
    client_updated: Users,
    research_added: NotebookPen,
    strategy_generated: Brain,
  };

  const getHealthColor = (campaign) => {
    if (!campaign.endDate) return '#6B7280';
    const end = new Date(campaign.endDate).getTime();
    const now = Date.now();
    const remaining = end - now;
    if (remaining < 0) return '#EF4444';
    if (remaining < 7 * 86400000) return '#F59E0B';
    return '#10B981';
  };

  const getBudgetColor = (pct) => {
    if (pct >= 90) return '#EF4444';
    if (pct >= 70) return '#F59E0B';
    return '#10B981';
  };

  const formatNumber = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  };

  // Active clients for filter tabs
  const activeClients = clients.filter(c => c.status === 'Active');

  return (
    <div className="space-y-6 max-w-[1400px]">

      {/* ─── CLIENT FILTER TABS ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setClientFilter('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
            clientFilter === 'all'
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
              : 'bg-[#1A1A26] text-[#9CA3AF] border border-[#2A2A3A] hover:text-white hover:border-[#3A3A4A]'
          }`}
        >
          All Clients
        </button>
        {activeClients.map(client => (
          <button
            key={client.id}
            onClick={() => setClientFilter(client.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              clientFilter === client.id
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#1A1A26] text-[#9CA3AF] border border-[#2A2A3A] hover:text-white hover:border-[#3A3A4A]'
            }`}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ background: getClientColor(client.id) }}
            />
            {client.name}
          </button>
        ))}
      </div>

      {/* ─── STATS BAR ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => {
          const Icon = card.icon;
          const stat = stats[card.key];
          const value = stat.value;
          const trend = stat.trend;
          const hasTrend = trend !== null && trend !== undefined;
          const isPositive = trend >= 0;
          return (
            <div
              key={card.key}
              className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4 hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                {hasTrend ? (
                  <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    <span>{isPositive && trend > 0 ? '+' : ''}{trend}%</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-xs text-[#6B7280]">
                    <TrendingUp size={13} />
                  </div>
                )}
              </div>
              <div className="text-2xl font-bold text-white/90">{value}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* ─── TODAY'S AGENDA — TIMELINE STYLE ────────────────────────────── */}
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A3A]">
              <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <Clock size={15} className="text-emerald-400" />
                Today's Agenda
              </h2>
              <span className="text-xs font-mono text-[#6B7280]">{todayItems.length} items</span>
            </div>
            <div className="p-4">
              {todayItems.length === 0 ? (
                <p className="text-sm text-[#6B7280] py-4 text-center">No items scheduled for today</p>
              ) : (
                <div className="relative pl-8">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#2A2A3A]" />

                  {todayItems.map((item, idx) => {
                    const client = clients.find(c => c.id === item.clientId);
                    const time = formatTime(new Date(item.scheduledDate));
                    const isLast = idx === todayItems.length - 1;
                    return (
                      <div
                        key={item.id}
                        className={`relative flex items-start gap-4 pb-4 ${isLast ? 'pb-0' : ''}`}
                      >
                        {/* Timeline dot */}
                        <div className="absolute -left-8 top-1.5 flex items-center justify-center">
                          <div
                            className="w-[9px] h-[9px] rounded-full border-2 flex-shrink-0"
                            style={{
                              borderColor: getClientColor(item.clientId),
                              background: idx === 0 ? getClientColor(item.clientId) : '#1A1A26',
                            }}
                          />
                        </div>

                        {/* Time marker */}
                        <div className="text-xs font-mono text-emerald-400/80 w-11 flex-shrink-0 pt-0.5 tabular-nums">
                          {time}
                        </div>

                        {/* Event card */}
                        <div
                          className="flex-1 bg-[#12121A] border border-[#2A2A3A] rounded-md p-3 hover:border-emerald-500/20 transition-colors cursor-pointer group"
                          onClick={() => onNavigate('content-calendar', { postId: item.id })}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-white/90 font-medium truncate group-hover:text-emerald-400 transition-colors">
                              {item.title}
                            </span>
                            <span className="text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex-shrink-0 ml-2">
                              {item.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: getClientColor(item.clientId) }}
                            />
                            <span>{item.platform}</span>
                            <span className="text-[#2A2A3A]">|</span>
                            <span>{client?.name}</span>
                            <span className="text-[#2A2A3A]">|</span>
                            <span>{item.type}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── ACTIVE CAMPAIGNS ──────────────────────────────────────────── */}
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A3A]">
              <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <Activity size={15} className="text-blue-400" />
                Active Campaigns
              </h2>
              <button
                onClick={() => onNavigate('campaigns')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="p-4 overflow-x-auto">
              {activeCampaignsList.length === 0 ? (
                <p className="text-sm text-[#6B7280] py-4 text-center">No active campaigns</p>
              ) : (
                <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
                  {activeCampaignsList.map(camp => {
                    const budgetColor = getBudgetColor(camp.budgetPct);
                    return (
                      <div
                        key={camp.id}
                        className="bg-[#12121A] border border-[#2A2A3A] rounded-lg p-4 min-w-[280px] max-w-[320px] hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer flex-shrink-0"
                        onClick={() => onNavigate('campaigns', { campaignId: camp.id })}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getHealthColor(camp) }} />
                          <span className="text-xs text-[#6B7280]">{camp.clientName}</span>
                        </div>
                        <div className="text-sm font-medium text-white/90 mb-1 truncate">{camp.name}</div>
                        <div className="text-xs text-[#6B7280] mb-3">{camp.objective} - {camp.type}</div>

                        {/* Budget Progress Bar */}
                        {camp.budgetTotal > 0 && (
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-[#6B7280]">Budget</span>
                              <span className="text-[10px] font-mono" style={{ color: budgetColor }}>
                                {camp.budgetPct}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-[#1A1A26] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(camp.budgetPct, 100)}%`,
                                  background: budgetColor,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            {camp.platforms.slice(0, 3).map(p => (
                              <span key={p} className="text-[10px] bg-[#1A1A26] text-[#9CA3AF] px-1.5 py-0.5 rounded">{p}</span>
                            ))}
                          </div>
                          <span className="text-[10px] text-[#6B7280]">{camp.published}/{camp.total} posts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ─── PERFORMANCE SNAPSHOT ──────────────────────────────────────── */}
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A3A]">
              <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <BarChart3 size={15} className="text-emerald-400" />
                Performance Snapshot
              </h2>
              <span className="text-xs text-[#6B7280]">{performanceSnapshot.totalPosts} published posts</span>
            </div>
            <div className="p-4">
              {performanceSnapshot.totalPosts === 0 ? (
                <p className="text-sm text-[#6B7280] py-4 text-center">No published posts with analytics data</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-[#12121A] border border-[#2A2A3A] rounded-lg p-3 text-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: '#3B82F615' }}>
                      <Eye size={15} className="text-blue-400" />
                    </div>
                    <div className="text-lg font-bold text-white/90">{formatNumber(performanceSnapshot.totalReach)}</div>
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mt-0.5">Total Reach</div>
                  </div>
                  <div className="bg-[#12121A] border border-[#2A2A3A] rounded-lg p-3 text-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: '#8B5CF615' }}>
                      <BarChart3 size={15} className="text-purple-400" />
                    </div>
                    <div className="text-lg font-bold text-white/90">{formatNumber(performanceSnapshot.totalImpressions)}</div>
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mt-0.5">Impressions</div>
                  </div>
                  <div className="bg-[#12121A] border border-[#2A2A3A] rounded-lg p-3 text-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: '#10B98115' }}>
                      <MousePointerClick size={15} className="text-emerald-400" />
                    </div>
                    <div className="text-lg font-bold text-white/90">{formatNumber(performanceSnapshot.totalEngagement)}</div>
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mt-0.5">Engagements</div>
                  </div>
                  <div className="bg-[#12121A] border border-[#2A2A3A] rounded-lg p-3 text-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: '#F59E0B15' }}>
                      <TrendingUp size={15} className="text-amber-400" />
                    </div>
                    <div className="text-lg font-bold text-white/90">{performanceSnapshot.avgEngagement}%</div>
                    <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mt-0.5">Eng. Rate</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── CLIENT PORTFOLIO ─────────────────────────────────────────── */}
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A3A]">
              <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <Users size={15} className="text-emerald-400" />
                Client Portfolio
              </h2>
              <button
                onClick={() => onNavigate('client-hub')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {clientTiles.map(client => (
                  <div
                    key={client.id}
                    className="bg-[#12121A] border border-[#2A2A3A] rounded-lg p-3 hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer text-center"
                    onClick={() => onNavigate('client-hub', { clientId: client.id })}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-semibold"
                      style={{ background: `${getClientColor(client.id)}20`, color: getClientColor(client.id) }}
                    >
                      {getInitials(client.name)}
                    </div>
                    <div className="text-sm text-white/90 font-medium truncate">{client.name}</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">{client.activeCampaigns} active campaign{client.activeCampaigns !== 1 ? 's' : ''}</div>
                  </div>
                ))}

                {/* Add client tile */}
                <div
                  className="bg-[#12121A] border border-dashed border-[#2A2A3A] rounded-lg p-3 hover:border-emerald-500/30 transition-colors cursor-pointer flex flex-col items-center justify-center"
                  onClick={() => onNavigate('client-hub', { action: 'add' })}
                >
                  <Plus size={20} className="text-[#6B7280] mb-1" />
                  <span className="text-xs text-[#6B7280]">Add Client</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">

          {/* ─── QUICK ACTIONS — CARD GRID ──────────────────────────────────── */}
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg">
            <div className="px-5 py-3.5 border-b border-[#2A2A3A]">
              <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <Zap size={15} className="text-yellow-400" />
                Quick Actions
              </h2>
            </div>
            <div className="p-3 grid grid-cols-1 gap-2">
              {quickActions.map(qa => {
                const Icon = qa.icon;
                return (
                  <button
                    key={qa.label}
                    onClick={qa.action}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg bg-[#12121A] border border-[#2A2A3A] hover:bg-white/5 hover:border-[#3A3A4A] transition-colors text-left w-full group"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${qa.color}15` }}>
                      <Icon size={16} style={{ color: qa.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#9CA3AF] group-hover:text-white transition-colors font-medium">{qa.label}</div>
                      <div className="text-[10px] text-[#6B7280]">{qa.description}</div>
                    </div>
                    <span className="text-[9px] font-mono text-[#6B7280] bg-[#0A0A0F] px-1.5 py-0.5 rounded flex-shrink-0 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-colors whitespace-nowrap">
                      {qa.shortcut}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── ACTIVITY FEED ─────────────────────────────────────────────── */}
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg">
            <div className="px-5 py-3.5 border-b border-[#2A2A3A]">
              <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <Activity size={15} className="text-blue-400" />
                Recent Activity
              </h2>
            </div>
            <div className="max-h-[480px] overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-[#6B7280] p-4 text-center">No activity yet</p>
              ) : (
                <div className="divide-y divide-[#2A2A3A]">
                  {recentActivity.map(entry => {
                    const Icon = activityIcons[entry.type] || Activity;
                    return (
                      <div key={entry.id} className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
                        <div className="w-7 h-7 rounded-full bg-[#12121A] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Icon size={13} className="text-[#6B7280]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-[#9CA3AF] leading-snug">{truncate(entry.message, 80)}</p>
                          <p className="text-[11px] text-[#6B7280] mt-0.5">{relativeTime(entry.timestamp)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
