import { useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import {
  Users, Megaphone, CalendarClock, Brain, Plus,
  UserPlus, NotebookPen, Clock, ArrowRight, TrendingUp,
  Zap, Activity,
} from 'lucide-react';
import { getInitials, getClientColor, relativeTime, truncate } from '../lib/utils';

const STAT_CARDS = [
  { key: 'clients', label: 'Active Clients', icon: Users, color: '#10B981' },
  { key: 'campaigns', label: 'Active Campaigns', icon: Megaphone, color: '#3B82F6' },
  { key: 'scheduled', label: 'Posts This Week', icon: CalendarClock, color: '#F59E0B' },
  { key: 'strategies', label: 'Strategies Generated', icon: Brain, color: '#8B5CF6' },
];

export default function CommandCentre({ onNavigate }) {
  const { clients, campaigns, posts, strategies, activityFeed } = useStore();

  const stats = useMemo(() => {
    const now = Date.now();
    const weekFromNow = now + 7 * 86400000;
    const activeClients = clients.filter(c => c.status === 'Active').length;
    const activeCampaigns = campaigns.filter(c => c.status === 'Active').length;
    const scheduledThisWeek = posts.filter(p => {
      if (p.status !== 'Scheduled') return false;
      const d = new Date(p.scheduledDate).getTime();
      return d >= now && d <= weekFromNow;
    }).length;
    return {
      clients: activeClients,
      campaigns: activeCampaigns,
      scheduled: scheduledThisWeek,
      strategies: strategies.length,
    };
  }, [clients, campaigns, posts, strategies]);

  const todayItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return posts
      .filter(p => {
        if (!p.scheduledDate) return false;
        const d = new Date(p.scheduledDate);
        return d >= today && d < tomorrow;
      })
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  }, [posts]);

  const activeCampaignsList = useMemo(() => {
    return campaigns
      .filter(c => c.status === 'Active')
      .map(c => {
        const client = clients.find(cl => cl.id === c.clientId);
        const campaignPosts = posts.filter(p => p.campaignId === c.id);
        const published = campaignPosts.filter(p => p.status === 'Published').length;
        const total = campaignPosts.length;
        return { ...c, clientName: client?.name || 'Unknown', published, total };
      });
  }, [campaigns, clients, posts]);

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

  const recentActivity = useMemo(() => {
    return [...activityFeed]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [activityFeed]);

  const quickActions = [
    { label: 'Add Client', icon: UserPlus, color: '#10B981', action: () => onNavigate('client-hub', { action: 'add' }) },
    { label: 'New Campaign', icon: Megaphone, color: '#3B82F6', action: () => onNavigate('campaigns', { action: 'add' }) },
    { label: 'Log Note', icon: NotebookPen, color: '#F59E0B', action: () => onNavigate('research-log', { action: 'add' }) },
    { label: 'Schedule Post', icon: CalendarClock, color: '#8B5CF6', action: () => onNavigate('content-calendar', { action: 'add' }) },
    { label: 'Generate Strategy', icon: Brain, color: '#EC4899', action: () => onNavigate('strategy-engine', { action: 'add' }) },
  ];

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

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(card => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg p-4 hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${card.color}15` }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <TrendingUp size={14} className="text-[#6B7280]" />
              </div>
              <div className="text-2xl font-bold text-white/90">{stats[card.key]}</div>
              <div className="text-xs text-[#6B7280] mt-0.5">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Today's Agenda + Active Campaigns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Agenda */}
          <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#2A2A3A]">
              <h2 className="text-sm font-semibold text-white/90 flex items-center gap-2">
                <Clock size={15} className="text-emerald-400" />
                Today's Agenda
              </h2>
              <span className="text-xs text-[#6B7280]">{todayItems.length} items</span>
            </div>
            <div className="p-4">
              {todayItems.length === 0 ? (
                <p className="text-sm text-[#6B7280] py-4 text-center">No items scheduled for today</p>
              ) : (
                <div className="space-y-3">
                  {todayItems.map(item => {
                    const client = clients.find(c => c.id === item.clientId);
                    const time = new Date(item.scheduledDate).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-[#12121A] rounded-md hover:bg-[#16161F] transition-colors cursor-pointer"
                        onClick={() => onNavigate('content-calendar', { postId: item.id })}
                      >
                        <div className="text-xs font-mono text-[#6B7280] w-12 flex-shrink-0">{time}</div>
                        <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ background: getClientColor(item.clientId) }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-white/90 truncate">{item.title}</div>
                          <div className="text-xs text-[#6B7280]">{item.platform} - {client?.name}</div>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex-shrink-0">
                          {item.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Active Campaigns */}
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
                  {activeCampaignsList.map(camp => (
                    <div
                      key={camp.id}
                      className="bg-[#12121A] border border-[#2A2A3A] rounded-lg p-4 min-w-[260px] max-w-[300px] hover:border-[rgba(16,185,129,0.3)] transition-colors cursor-pointer flex-shrink-0"
                      onClick={() => onNavigate('campaigns', { campaignId: camp.id })}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getHealthColor(camp) }} />
                        <span className="text-xs text-[#6B7280]">{camp.clientName}</span>
                      </div>
                      <div className="text-sm font-medium text-white/90 mb-1 truncate">{camp.name}</div>
                      <div className="text-xs text-[#6B7280] mb-3">{camp.objective} - {camp.type}</div>
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1">
                          {camp.platforms.slice(0, 3).map(p => (
                            <span key={p} className="text-[10px] bg-[#1A1A26] text-[#9CA3AF] px-1.5 py-0.5 rounded">{p}</span>
                          ))}
                        </div>
                        <span className="text-[10px] text-[#6B7280]">{camp.published}/{camp.total} posts</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Client Portfolio */}
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

        {/* Right Column: Activity Feed + Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
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
                    className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-[#12121A] hover:bg-white/5 transition-colors text-left w-full group"
                  >
                    <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: `${qa.color}15` }}>
                      <Icon size={15} style={{ color: qa.color }} />
                    </div>
                    <span className="text-sm text-[#9CA3AF] group-hover:text-white transition-colors">{qa.label}</span>
                    <Plus size={14} className="ml-auto text-[#6B7280] group-hover:text-white transition-colors" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Activity Feed */}
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
