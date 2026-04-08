// Utility functions

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit'
  });
}

export function relativeTime(date) {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function getClientColor(id) {
  const colors = [
    '#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return colors[Math.abs(hash) % colors.length];
}

export function truncate(str, len = 100) {
  if (!str) return '';
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export const SECTORS = [
  'Health and Wellness', 'Fitness', 'Sustainability', 'Tech',
  'Food and Beverage', 'Adventure and Outdoor', 'Crypto and Finance',
  'Media and Entertainment', 'Other'
];

export const PLATFORMS = [
  'Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn',
  'X/Twitter', 'Threads', 'Substack', 'Newsletter', 'Podcast', 'Other'
];

export const BUDGET_RANGES = ['Under 1k', '1-5k', '5-15k', '15-50k', '50k+'];

export const PARTNERSHIP_TYPES = [
  'Retainer Client', 'Equity Partner', 'Project-Based', 'Advisory', 'Internal Brand'
];

export const CLIENT_STATUSES = ['Active', 'Paused', 'Offboarding', 'Prospect'];

export const CAMPAIGN_OBJECTIVES = [
  'Brand Awareness', 'Lead Generation', 'Sales/Conversions',
  'Community Growth', 'Content Series', 'Product Launch',
  'Event Promotion', 'Partnership Activation', 'Other'
];

export const CAMPAIGN_TYPES = ['Organic', 'Paid', 'Hybrid'];

export const CAMPAIGN_STATUSES = ['Planning', 'Active', 'Paused', 'Complete', 'Cancelled'];

export const POST_TYPES = [
  'Image Post', 'Carousel', 'Reel/Short Video', 'Story',
  'Text Post', 'Thread', 'Long-Form Video', 'Newsletter', 'Blog Post'
];

export const POST_STATUSES = [
  'Draft', 'Ready for Review', 'Approved', 'Scheduled', 'Published', 'Rejected'
];

export const RESEARCH_CATEGORIES = [
  'Market Research', 'Competitor Analysis', 'Audience Insight',
  'Meeting Notes', 'Campaign Review', 'Strategy Observation',
  'Industry Trend', 'Partnership Intel', 'Content Inspiration',
  'Financial/Investment Note', 'Other'
];

export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

export const PLATFORM_CHAR_LIMITS = {
  'Instagram': 2200,
  'X/Twitter': 280,
  'LinkedIn': 3000,
  'TikTok': 2200,
  'Facebook': 63206,
  'Threads': 500,
};

export const PLATFORM_ICONS = {
  'Instagram': 'instagram',
  'Facebook': 'facebook',
  'TikTok': 'music',
  'YouTube': 'youtube',
  'LinkedIn': 'linkedin',
  'X/Twitter': 'twitter',
  'Google Ads': 'search',
  'Email': 'mail',
  'Newsletter': 'newspaper',
  'Podcast': 'mic',
  'Threads': 'message-circle',
  'Substack': 'book-open',
  'Influencer': 'users',
  'Affiliate': 'link',
  'Multi-Platform': 'globe',
  'Other': 'circle',
};
