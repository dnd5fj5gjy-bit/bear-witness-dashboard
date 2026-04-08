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
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
