import { useState, useRef, useCallback } from 'react';
import { useStore } from '../hooks/useStore';
import { storage } from '../lib/storage';
import { classNames, generateId } from '../lib/utils';
import {
  Settings, Users, Key, Palette, Database, Plus, X, Trash2, Check,
  Download, Upload, AlertTriangle, Shield, Eye, EyeOff, Monitor,
  Globe, Mail, ChevronDown, ChevronUp, Server, Wifi, WifiOff, RefreshCw
} from 'lucide-react';

const ACCENT_COLOURS = [
  { name: 'Emerald', value: '#10B981', class: 'bg-[#10B981]' },
  { name: 'Blue', value: '#3B82F6', class: 'bg-[#3B82F6]' },
];

const SECTIONS = [
  { key: 'server', label: 'Server', icon: Server },
  { key: 'team', label: 'Team Settings', icon: Users },
  { key: 'api', label: 'API Configuration', icon: Key },
  { key: 'display', label: 'Display Settings', icon: Palette },
  { key: 'data', label: 'Data Management', icon: Database },
];

// ── Confirmation Modal ─────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, confirmVariant, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#222233] border border-[#2A2A3A] rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EF4444]/15 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-[#EF4444]" />
          </div>
          <div>
            <h3 className="text-[rgba(255,255,255,0.9)] font-semibold text-base">{title}</h3>
            <p className="text-[#9CA3AF] text-sm mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={classNames(
              'px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors',
              confirmVariant === 'danger' ? 'bg-[#EF4444] hover:bg-[#DC2626]' : 'bg-[#10B981] hover:bg-[#059669]'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Section Wrapper ────────────────────────────────────────────────────
function SettingsSection({ title, icon: Icon, children, description }) {
  return (
    <div className="bg-[#1A1A26] border border-[#2A2A3A] rounded-lg">
      <div className="px-5 py-4 border-b border-[#2A2A3A]">
        <h2 className="text-[rgba(255,255,255,0.9)] font-semibold text-sm flex items-center gap-2">
          <Icon size={16} className="text-[#10B981]" />
          {title}
        </h2>
        {description && <p className="text-[#6B7280] text-xs mt-1">{description}</p>}
      </div>
      <div className="p-5 space-y-5">
        {children}
      </div>
    </div>
  );
}

// ── Server Configuration ──────────────────────────────────────────────
function ServerSettings({ store }) {
  const [serverUrl, setServerUrl] = useState(() => localStorage.getItem('bw2:serverUrl') || '');
  const [serverApiKey, setServerApiKey] = useState(() => localStorage.getItem('bw2:serverApiKey') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null); // null | 'testing' | 'connected' | 'error'
  const [testError, setTestError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const trimmedUrl = serverUrl.trim().replace(/\/+$/, '');
    if (trimmedUrl) {
      localStorage.setItem('bw2:serverUrl', trimmedUrl);
    } else {
      localStorage.removeItem('bw2:serverUrl');
    }
    if (serverApiKey.trim()) {
      localStorage.setItem('bw2:serverApiKey', serverApiKey.trim());
    } else {
      localStorage.removeItem('bw2:serverApiKey');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    const trimmedUrl = serverUrl.trim().replace(/\/+$/, '');
    if (!trimmedUrl) {
      setTestStatus('error');
      setTestError('No server URL configured');
      return;
    }

    setTestStatus('testing');
    setTestError('');

    try {
      const res = await fetch(`${trimmedUrl}/api/health`, {
        method: 'GET',
        headers: serverApiKey.trim() ? { 'X-API-Key': serverApiKey.trim() } : {},
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.status === 'ok') {
        setTestStatus('connected');
      } else {
        setTestStatus('error');
        setTestError('Unexpected response from server');
      }
    } catch (err) {
      setTestStatus('error');
      setTestError(err.message || 'Connection failed');
    }

    setTimeout(() => {
      if (testStatus !== 'error') setTestStatus(null);
    }, 5000);
  };

  const handleSyncFromServer = async () => {
    handleSave();
    // Allow localStorage to update before refresh
    setTimeout(async () => {
      try {
        await store.refreshFromServer();
        setTestStatus('connected');
      } catch (err) {
        setTestStatus('error');
        setTestError('Sync failed: ' + (err.message || 'Unknown error'));
      }
    }, 50);
  };

  const handleDisconnect = () => {
    localStorage.removeItem('bw2:serverUrl');
    localStorage.removeItem('bw2:serverApiKey');
    setServerUrl('');
    setServerApiKey('');
    setTestStatus(null);
    setTestError('');
    // Reload to revert to localStorage mode
    window.location.reload();
  };

  return (
    <SettingsSection
      title="Server Configuration"
      icon={Server}
      description="Connect to a backend server to share data across users and devices"
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2 mb-1">
        {store.isServerMode ? (
          <span className="flex items-center gap-1.5 text-[#10B981] text-xs font-medium">
            <Wifi size={14} /> Connected to server
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[#9CA3AF] text-xs">
            <WifiOff size={14} /> Local storage mode (offline)
          </span>
        )}
      </div>

      {/* Server URL */}
      <div>
        <label className="block text-[#9CA3AF] text-xs mb-1.5">Backend URL</label>
        <input
          type="text"
          value={serverUrl}
          onChange={e => setServerUrl(e.target.value)}
          placeholder="http://100.107.76.20:5182"
          className="w-full"
        />
        <p className="text-[#6B7280] text-xs mt-1">
          The URL of your Bear Witness API server (e.g. http://your-server:5182)
        </p>
      </div>

      {/* API Key */}
      <div>
        <label className="block text-[#9CA3AF] text-xs mb-1.5">Backend API Key</label>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={serverApiKey}
            onChange={e => setServerApiKey(e.target.value)}
            placeholder="bearwitness-api-key-..."
            className="w-full pr-10"
          />
          <button
            onClick={() => setShowApiKey(!showApiKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#9CA3AF]"
          >
            {showApiKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { handleSave(); handleTest(); }}
          disabled={testStatus === 'testing'}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#222233] border border-[#2A2A3A] text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] hover:border-[#3A3A4A] text-sm rounded-lg transition-colors disabled:opacity-50"
        >
          {testStatus === 'testing' ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Wifi size={14} />
          )}
          Test Connection
        </button>

        <button
          onClick={handleSyncFromServer}
          disabled={!serverUrl.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/25 text-sm rounded-lg transition-colors disabled:opacity-40"
        >
          <RefreshCw size={14} />
          Save &amp; Sync
        </button>

        {store.isServerMode && (
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20 text-sm rounded-lg transition-colors"
          >
            <WifiOff size={14} />
            Disconnect
          </button>
        )}

        {saved && (
          <span className="text-[#10B981] text-xs flex items-center gap-1">
            <Check size={12} /> Saved
          </span>
        )}
      </div>

      {/* Test result */}
      {testStatus === 'connected' && (
        <p className="text-[#10B981] text-xs flex items-center gap-1">
          <Check size={12} /> Server is reachable and responding
        </p>
      )}
      {testStatus === 'error' && (
        <p className="text-[#EF4444] text-xs flex items-center gap-1">
          <AlertTriangle size={12} /> {testError || 'Connection failed'}
        </p>
      )}
    </SettingsSection>
  );
}

// ── Team Settings ──────────────────────────────────────────────────────
function TeamSettings({ settings, onUpdate }) {
  const [newMember, setNewMember] = useState({ name: '', role: '', email: '' });
  const [adding, setAdding] = useState(false);

  const handleFieldChange = (field, value) => {
    onUpdate({ [field]: value });
  };

  const handleAddMember = () => {
    if (!newMember.name.trim()) return;
    const members = [...(settings.teamMembers || []), { id: generateId(), ...newMember }];
    onUpdate({ teamMembers: members });
    setNewMember({ name: '', role: '', email: '' });
    setAdding(false);
  };

  const handleRemoveMember = (id) => {
    const members = (settings.teamMembers || []).filter(m => m.id !== id);
    onUpdate({ teamMembers: members });
  };

  return (
    <SettingsSection title="Team Settings" icon={Users} description="Agency information and team members">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Agency Name</label>
          <input
            type="text"
            value={settings.agencyName || 'Bear Witness'}
            onChange={e => handleFieldChange('agencyName', e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Website</label>
          <input
            type="text"
            value={settings.website || 'bearwitness.world'}
            onChange={e => handleFieldChange('website', e.target.value)}
            className="w-full"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-[#9CA3AF] text-xs mb-1.5">Default Contact Email</label>
          <input
            type="email"
            value={settings.contactEmail || ''}
            onChange={e => handleFieldChange('contactEmail', e.target.value)}
            placeholder="hello@bearwitness.world"
            className="w-full"
          />
        </div>
      </div>

      {/* Team Members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-[#9CA3AF] text-xs font-semibold uppercase tracking-wider">Team Members</label>
          <button
            onClick={() => setAdding(true)}
            className="text-[#10B981] hover:text-[#059669] text-xs flex items-center gap-1"
          >
            <Plus size={12} /> Add Member
          </button>
        </div>

        <div className="space-y-2">
          {(settings.teamMembers || []).length === 0 && !adding && (
            <p className="text-[#6B7280] text-xs">No team members added yet.</p>
          )}
          {(settings.teamMembers || []).map(member => (
            <div key={member.id} className="flex items-center justify-between gap-3 bg-[#12121A] border border-[#2A2A3A] rounded-lg px-3 py-2">
              <div className="min-w-0 flex-1">
                <span className="text-[rgba(255,255,255,0.9)] text-sm">{member.name}</span>
                {member.role && <span className="text-[#6B7280] text-xs ml-2">{member.role}</span>}
                {member.email && <span className="text-[#6B7280] text-xs ml-2">{member.email}</span>}
              </div>
              <button
                onClick={() => handleRemoveMember(member.id)}
                className="text-[#6B7280] hover:text-[#EF4444] p-1 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {adding && (
            <div className="bg-[#12121A] border border-[#2A2A3A] rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newMember.name}
                  onChange={e => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Name"
                  className="text-sm"
                  autoFocus
                />
                <input
                  type="text"
                  value={newMember.role}
                  onChange={e => setNewMember(prev => ({ ...prev, role: e.target.value }))}
                  placeholder="Role"
                  className="text-sm"
                />
                <input
                  type="email"
                  value={newMember.email}
                  onChange={e => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email"
                  className="text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setAdding(false); setNewMember({ name: '', role: '', email: '' }); }}
                  className="text-[#6B7280] hover:text-[#9CA3AF] text-xs px-3 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddMember}
                  disabled={!newMember.name.trim()}
                  className="bg-[#10B981] hover:bg-[#059669] disabled:opacity-40 text-white text-xs px-3 py-1 rounded-md"
                >
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}

// ── API Configuration ──────────────────────────────────────────────────
function APISettings({ settings, onUpdate }) {
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState(null);

  const maskedKey = (key) => {
    if (!key) return '';
    if (key.length <= 12) return key;
    return key.slice(0, 7) + '...' + key.slice(-4);
  };

  const handleTestKey = () => {
    const key = settings.apiKey;
    if (!key) {
      setTestStatus('error');
      return;
    }
    // Basic validation: Anthropic keys start with sk-ant-
    if (key.startsWith('sk-ant-') && key.length > 20) {
      setTestStatus('valid');
    } else {
      setTestStatus('warning');
    }
    setTimeout(() => setTestStatus(null), 3000);
  };

  return (
    <SettingsSection title="API Configuration" icon={Key} description="Configure the Anthropic API key for AI features">
      <div>
        <label className="block text-[#9CA3AF] text-xs mb-1.5">Anthropic API Key</label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.apiKey || ''}
              onChange={e => onUpdate({ apiKey: e.target.value })}
              placeholder="sk-ant-..."
              className="w-full pr-10"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#9CA3AF]"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          <button
            onClick={handleTestKey}
            className="px-3 py-2 bg-[#222233] border border-[#2A2A3A] text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] hover:border-[#3A3A4A] text-sm rounded-lg transition-colors"
          >
            Test
          </button>
        </div>
        {testStatus === 'valid' && (
          <p className="text-[#10B981] text-xs mt-1 flex items-center gap-1"><Check size={12} /> Key format looks valid</p>
        )}
        {testStatus === 'warning' && (
          <p className="text-[#F59E0B] text-xs mt-1 flex items-center gap-1"><AlertTriangle size={12} /> Key format may be incorrect</p>
        )}
        {testStatus === 'error' && (
          <p className="text-[#EF4444] text-xs mt-1">No API key provided</p>
        )}
        <p className="text-[#6B7280] text-xs mt-2">
          Your API key is stored locally in the browser and never sent to any server other than the Anthropic API.
        </p>
      </div>
    </SettingsSection>
  );
}

// ── Display Settings ───────────────────────────────────────────────────
function DisplaySettings({ settings, onUpdate }) {
  return (
    <SettingsSection title="Display Settings" icon={Palette} description="Customise the appearance of the dashboard">
      {/* Density */}
      <div>
        <label className="block text-[#9CA3AF] text-xs mb-2">Layout Density</label>
        <div className="flex gap-2">
          {['compact', 'comfortable'].map(d => (
            <button
              key={d}
              onClick={() => onUpdate({ density: d })}
              className={classNames(
                'px-4 py-2 rounded-lg border text-sm capitalize transition-colors',
                (settings.density || 'comfortable') === d
                  ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                  : 'bg-[#12121A] text-[#9CA3AF] border-[#2A2A3A] hover:border-[#3A3A4A]'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Accent Colour */}
      <div>
        <label className="block text-[#9CA3AF] text-xs mb-2">Accent Colour</label>
        <div className="flex gap-3">
          {ACCENT_COLOURS.map(c => (
            <button
              key={c.value}
              onClick={() => onUpdate({ accentColour: c.value })}
              className={classNames(
                'flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-colors',
                (settings.accentColour || '#10B981') === c.value
                  ? 'border-[rgba(255,255,255,0.2)] bg-[#222233]'
                  : 'border-[#2A2A3A] bg-[#12121A] hover:border-[#3A3A4A]'
              )}
            >
              <span className={classNames('w-3 h-3 rounded-full', c.class)} />
              <span className="text-[rgba(255,255,255,0.9)]">{c.name}</span>
              {(settings.accentColour || '#10B981') === c.value && (
                <Check size={12} className="text-[#10B981]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sidebar Default */}
      <div>
        <label className="block text-[#9CA3AF] text-xs mb-2">Sidebar Default State</label>
        <div className="flex gap-2">
          {['expanded', 'collapsed'].map(s => (
            <button
              key={s}
              onClick={() => onUpdate({ sidebarDefault: s })}
              className={classNames(
                'px-4 py-2 rounded-lg border text-sm capitalize transition-colors',
                (settings.sidebarDefault || 'expanded') === s
                  ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                  : 'bg-[#12121A] text-[#9CA3AF] border-[#2A2A3A] hover:border-[#3A3A4A]'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}

// ── Data Management ────────────────────────────────────────────────────
function DataManagement({ store }) {
  const [modal, setModal] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [exportResult, setExportResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = async () => {
    try {
      const data = await storage.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bear-witness-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportResult('success');
      setTimeout(() => setExportResult(null), 3000);
    } catch (err) {
      setExportResult('error');
      setTimeout(() => setExportResult(null), 3000);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (typeof data !== 'object') {
        setImportResult('error');
        return;
      }

      await storage.importAll(data);
      setImportResult('success');
      setTimeout(() => {
        setImportResult(null);
        window.location.reload();
      }, 1500);
    } catch (err) {
      setImportResult('error');
      setTimeout(() => setImportResult(null), 3000);
    }

    // Reset input
    e.target.value = '';
  };

  const handleClearAll = async () => {
    await storage.clearAll();
    setModal(null);
    window.location.reload();
  };

  const handleClearModule = async (key, label) => {
    try {
      await storage.remove(key);
      setModal(null);
      window.location.reload();
    } catch (err) {
      console.warn('Clear module error:', err);
    }
  };

  const moduleKeys = [
    { key: 'clients', label: 'Clients' },
    { key: 'campaigns', label: 'Campaigns' },
    { key: 'posts', label: 'Posts' },
    { key: 'research', label: 'Research' },
    { key: 'strategies', label: 'Strategies' },
    { key: 'proposals', label: 'Proposals' },
    { key: 'activityFeed', label: 'Activity Feed' },
  ];

  return (
    <SettingsSection title="Data Management" icon={Database} description="Export, import, or clear dashboard data">
      {/* Export */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[rgba(255,255,255,0.9)] text-sm font-medium">Export All Data</h3>
          <p className="text-[#6B7280] text-xs mt-0.5">Download all dashboard data as a JSON file.</p>
        </div>
        <div className="flex items-center gap-2">
          {exportResult === 'success' && <span className="text-[#10B981] text-xs flex items-center gap-1"><Check size={12} /> Exported</span>}
          {exportResult === 'error' && <span className="text-[#EF4444] text-xs">Export failed</span>}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#222233] border border-[#2A2A3A] text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] hover:border-[#3A3A4A] text-sm rounded-lg transition-colors"
          >
            <Download size={14} />
            Export JSON
          </button>
        </div>
      </div>

      {/* Import */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[rgba(255,255,255,0.9)] text-sm font-medium">Import Data</h3>
          <p className="text-[#6B7280] text-xs mt-0.5">Import data from a previously exported JSON file. This will merge with existing data.</p>
        </div>
        <div className="flex items-center gap-2">
          {importResult === 'success' && <span className="text-[#10B981] text-xs flex items-center gap-1"><Check size={12} /> Imported</span>}
          {importResult === 'error' && <span className="text-[#EF4444] text-xs">Invalid file</span>}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#222233] border border-[#2A2A3A] text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] hover:border-[#3A3A4A] text-sm rounded-lg transition-colors"
          >
            <Upload size={14} />
            Import JSON
          </button>
        </div>
      </div>

      {/* Per-module clear */}
      <div>
        <h3 className="text-[rgba(255,255,255,0.9)] text-sm font-medium mb-2">Clear Module Data</h3>
        <p className="text-[#6B7280] text-xs mb-3">Clear data for individual modules.</p>
        <div className="flex flex-wrap gap-2">
          {moduleKeys.map(mod => (
            <button
              key={mod.key}
              onClick={() => setModal({ type: 'clear-module', key: mod.key, label: mod.label })}
              className="px-3 py-1.5 bg-[#12121A] border border-[#2A2A3A] text-[#9CA3AF] hover:border-[#EF4444]/30 hover:text-[#EF4444] text-xs rounded-lg transition-colors"
            >
              {mod.label}
            </button>
          ))}
        </div>
      </div>

      {/* Clear all */}
      <div className="pt-4 border-t border-[#2A2A3A]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[#EF4444] text-sm font-medium">Clear All Data</h3>
            <p className="text-[#6B7280] text-xs mt-0.5">Permanently delete all dashboard data. This cannot be undone.</p>
          </div>
          <button
            onClick={() => setModal({ type: 'clear-all' })}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] hover:bg-[#EF4444]/20 text-sm rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            Clear All
          </button>
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'clear-all' && (
        <ConfirmModal
          title="Clear All Data"
          message="This will permanently delete all clients, campaigns, posts, research, strategies, proposals, and settings. This action cannot be undone."
          confirmLabel="Delete Everything"
          confirmVariant="danger"
          onConfirm={handleClearAll}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === 'clear-module' && (
        <ConfirmModal
          title={`Clear ${modal.label}`}
          message={`This will permanently delete all ${modal.label.toLowerCase()} data. This action cannot be undone.`}
          confirmLabel={`Clear ${modal.label}`}
          confirmVariant="danger"
          onConfirm={() => handleClearModule(modal.key, modal.label)}
          onCancel={() => setModal(null)}
        />
      )}
    </SettingsSection>
  );
}

// ── Main Module ───────────────────────────────────────────────────────
export default function SettingsPage({ onNavigate, params } = {}) {
  const store = useStore();
  const { settings = {} } = store;
  const [activeSection, setActiveSection] = useState('server');
  const [saved, setSaved] = useState(false);

  const handleUpdate = useCallback((updates) => {
    store.updateSettings({ ...settings, ...updates });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [store, settings]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[rgba(255,255,255,0.9)]">Settings</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Configure your Bear Witness dashboard</p>
        </div>
        {saved && (
          <span className="flex items-center gap-1.5 text-[#10B981] text-sm animate-pulse">
            <Check size={14} /> Saved
          </span>
        )}
      </div>

      {/* Section Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {SECTIONS.map(section => {
          const Icon = section.icon;
          return (
            <button
              key={section.key}
              onClick={() => setActiveSection(section.key)}
              className={classNames(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap',
                activeSection === section.key
                  ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                  : 'text-[#9CA3AF] hover:text-[rgba(255,255,255,0.9)] border border-transparent'
              )}
            >
              <Icon size={14} />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="space-y-5">
        {activeSection === 'server' && (
          <ServerSettings store={store} />
        )}
        {activeSection === 'team' && (
          <TeamSettings settings={settings} onUpdate={handleUpdate} />
        )}
        {activeSection === 'api' && (
          <APISettings settings={settings} onUpdate={handleUpdate} />
        )}
        {activeSection === 'display' && (
          <DisplaySettings settings={settings} onUpdate={handleUpdate} />
        )}
        {activeSection === 'data' && (
          <DataManagement store={store} />
        )}
      </div>
    </div>
  );
}
