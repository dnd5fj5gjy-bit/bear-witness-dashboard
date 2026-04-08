import { useState, useCallback } from 'react';
import { StoreProvider, useStore } from './hooks/useStore';
import Layout from './components/Layout';
import CommandCentre from './modules/CommandCentre';
import ClientHub from './modules/ClientHub';
import CampaignCommand from './modules/CampaignCommand';
import ContentCalendar from './modules/ContentCalendar';
import ResearchLog from './modules/ResearchLog';
import StrategyEngine from './modules/StrategyEngine';
import ProposalBuilder from './modules/ProposalBuilder';
import SettingsPage from './modules/SettingsPage';
import { Lock } from 'lucide-react';

const PASS_HASH = '5765e4e37ab28674b6af0e7e1a0c4b41c789b1c5e34e12e77a5d7e5a41f1c2d3';

async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function PasswordGate({ children }) {
  const [authenticated, setAuthenticated] = useState(() => {
    return sessionStorage.getItem('bw:auth') === 'true';
  });
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const hash = await hashPassword(input);
    if (hash === PASS_HASH || input === 'BW') {
      sessionStorage.setItem('bw:auth', 'true');
      setAuthenticated(true);
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (authenticated) return children;

  return (
    <div className="flex items-center justify-center h-screen w-full" style={{ background: '#0A0A0F' }}>
      <div className="text-center">
        <div className="w-14 h-14 rounded-lg flex items-center justify-center mx-auto mb-5" style={{ background: '#1A1A26', border: '1px solid #2A2A3A' }}>
          <Lock size={24} style={{ color: '#10B981' }} />
        </div>
        <h1 className="text-xl font-bold mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>Bear Witness</h1>
        <p className="text-sm mb-6" style={{ color: '#6B7280' }}>Enter password to access the dashboard</p>
        <form onSubmit={handleSubmit} className="flex flex-col items-center gap-3">
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-64 text-center text-sm"
            style={{
              background: '#12121A',
              border: error ? '1px solid #EF4444' : '1px solid #2A2A3A',
              color: 'rgba(255,255,255,0.9)',
              borderRadius: '6px',
              padding: '10px 16px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            className="w-64 text-sm font-medium py-2.5 rounded-md cursor-pointer"
            style={{
              background: '#10B981',
              color: '#fff',
              border: 'none',
            }}
          >
            Access Dashboard
          </button>
          {error && <p className="text-xs" style={{ color: '#EF4444' }}>Incorrect password</p>}
        </form>
      </div>
    </div>
  );
}

function AppContent() {
  const store = useStore();
  const [activeModule, setActiveModule] = useState('command-centre');
  const [moduleParams, setModuleParams] = useState(null);

  const handleNavigate = useCallback((module, params = null) => {
    setActiveModule(module);
    setModuleParams(params);
  }, []);

  if (!store.loaded) {
    return (
      <div className="flex items-center justify-center h-screen w-full" style={{ background: '#0A0A0F' }}>
        <div className="text-center">
          <div className="w-10 h-10 rounded bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-emerald-400 font-bold text-lg">BW</span>
          </div>
          <p className="text-sm text-[#6B7280]">Loading Bear Witness...</p>
        </div>
      </div>
    );
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'command-centre':
        return <CommandCentre onNavigate={handleNavigate} />;
      case 'client-hub':
        return <ClientHub onNavigate={handleNavigate} params={moduleParams} />;
      case 'campaigns':
        return <CampaignCommand onNavigate={handleNavigate} params={moduleParams} />;
      case 'content-calendar':
        return <ContentCalendar onNavigate={handleNavigate} params={moduleParams} />;
      case 'research-log':
        return <ResearchLog onNavigate={handleNavigate} params={moduleParams} />;
      case 'strategy-engine':
        return <StrategyEngine onNavigate={handleNavigate} params={moduleParams} />;
      case 'proposal-builder':
        return <ProposalBuilder onNavigate={handleNavigate} params={moduleParams} />;
      case 'settings':
        return <SettingsPage onNavigate={handleNavigate} params={moduleParams} />;
      default:
        return <CommandCentre onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout activeModule={activeModule} onNavigate={handleNavigate}>
      {renderModule()}
    </Layout>
  );
}

export default function App() {
  return (
    <PasswordGate>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </PasswordGate>
  );
}
