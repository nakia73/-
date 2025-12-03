
import React, { useState, useEffect } from 'react';
import ApiKeyManager from './components/ApiKeyManager';
import GeneratorForm from './components/GeneratorForm';
import VideoPlayer from './components/VideoPlayer';
import Navigation from './components/Navigation';
import HistorySidebar from './components/HistorySidebar';
import AuthModal from './components/AuthModal';
import CreditDisplay from './components/CreditDisplay';
import { ToastProvider } from './components/ToastContext';
import { GeneratedVideo, Language } from './types';
import { useVideoQueue } from './hooks/useVideoQueue';
import { useAuth } from './hooks/useAuth';
import { useAppSettings } from './hooks/useAppSettings';
import { translations } from './utils/translations';

const VeoStudioApp: React.FC = () => {
  const [language, setLanguage] = useState<Language>('ja');
  const t = translations[language];

  // Auth
  const { user, isAuthOpen, setAuthOpen, handleLogout } = useAuth();
  
  // Video Queue Logic
  const { 
    apiKeys, addKey, importKeys, refreshAllCredits, 
    loadHistory, tasks, addToQueue, history,
    setEnableLocalHistory
  } = useVideoQueue(t);
  
  // App Settings (Persist & Sync)
  const { 
    geminiApiKey, setGeminiApiKey,
    suppressQualityWarning, setSuppressQualityWarning,
    enableLocalHistory, setEnableLocalHistory: setSettingsHistory,
    
    directorTemplates, activeTemplateId, setActiveTemplateId, 
    addTemplate, updateTemplate, deleteTemplate,
    
    promptTemplates, activePromptTemplateId, setActivePromptTemplateId,
    addPromptTemplate, updatePromptTemplate, deletePromptTemplate,

    isSaving, isKeyManagerOpen, setKeyManagerOpen, handleSaveSettings 
  } = useAppSettings({ user, apiKeys, importKeys });

  // UI State
  const [selectedVideo, setSelectedVideo] = useState<GeneratedVideo | null>(null);
  const [hideEmail, setHideEmail] = useState(true);

  useEffect(() => {
      setEnableLocalHistory(enableLocalHistory);
  }, [enableLocalHistory, setEnableLocalHistory]);

  useEffect(() => {
      if (user) {
          setTimeout(() => loadHistory(user.id), 100);
      }
  }, [user, enableLocalHistory]);

  return (
    <div className="flex h-screen bg-[#09090b] text-gray-200 font-sans selection:bg-primary/30 selection:text-primary-100 overflow-hidden">
      
      <AuthModal 
        isOpen={isAuthOpen}
        onClose={() => setAuthOpen(false)}
        t={t}
      />

      <ApiKeyManager 
        isOpen={isKeyManagerOpen} 
        onClose={() => setKeyManagerOpen(false)}
        apiKeys={apiKeys}
        onUpdateKey={addKey}
        geminiApiKey={geminiApiKey}
        onUpdateGeminiKey={setGeminiApiKey}
        onRefreshCredits={refreshAllCredits}
        enableLocalHistory={enableLocalHistory}
        onUpdateLocalHistory={setSettingsHistory}
        onSave={() => handleSaveSettings()}
        isSaving={isSaving}
        userEmail={user?.email}
        onOpenAuth={() => setAuthOpen(true)}
        t={t}
      />

      {/* Left Navigation Rail */}
      <Navigation 
        onOpenKeyManager={() => setKeyManagerOpen(true)} 
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
        language={language}
        setLanguage={setLanguage}
        user={user}
        t={t}
      />

      {/* Generator Column */}
      <div className="w-[380px] flex-shrink-0 border-r border-white/5 flex flex-col bg-[#0c0c0e] relative z-10 shadow-xl">
         <GeneratorForm 
           onAddToQueue={addToQueue}
           queueLength={tasks.filter(t => t.status === 'pending').length}
           apiKeys={apiKeys} 
           geminiApiKey={geminiApiKey}
           suppressQualityWarning={suppressQualityWarning}
           setSuppressQualityWarning={setSuppressQualityWarning}
           handleSaveSettings={handleSaveSettings}
           
           directorTemplates={directorTemplates}
           activeTemplateId={activeTemplateId}
           setActiveTemplateId={setActiveTemplateId}
           addTemplate={addTemplate}
           updateTemplate={updateTemplate}
           deleteTemplate={deleteTemplate}

           promptTemplates={promptTemplates}
           activePromptTemplateId={activePromptTemplateId}
           setActivePromptTemplateId={setActivePromptTemplateId}
           addPromptTemplate={addPromptTemplate}
           updatePromptTemplate={updatePromptTemplate}
           deletePromptTemplate={deletePromptTemplate}
           
           t={t}
         />
      </div>

      {/* Main Stage (Player) */}
      <div className="flex-1 flex flex-col bg-[#000000] relative min-w-0">
        
        {/* Top Bar */}
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-[#09090b]/80 backdrop-blur z-20">
           <div className="flex items-center gap-4">
              {/* Logo Section */}
              <div className="flex items-center gap-2">
                  <img 
                    src="./logo.svg" 
                    alt="Sonic-GEN" 
                    className="h-10 w-auto object-contain max-w-[200px]"
                    onError={(e) => {
                        // Fallback to text logo if image is missing
                        e.currentTarget.style.display = 'none';
                        document.getElementById('fallback-logo')?.classList.remove('hidden');
                    }}
                  />
                  {/* Fallback Text Logo */}
                  <div id="fallback-logo" className="hidden flex items-center gap-2">
                      <div className="w-2 h-2 bg-primary rounded-full shadow-[0_0_8px_rgba(190,242,100,0.6)] animate-pulse"></div>
                      <span className="font-bold text-lg tracking-tight text-white">Sonic-GEN</span>
                  </div>

                  <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400 border border-white/5 tracking-wider font-mono self-center mt-0.5">STUDIO</span>
              </div>

              {user && (
                  <>
                    <div className="h-4 w-[1px] bg-white/10 ml-2"></div>
                    <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setHideEmail(!hideEmail)}>
                        <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors font-mono">
                            {hideEmail ? '***@***.***' : user.email}
                        </span>
                        <svg className={`w-3 h-3 text-gray-600 group-hover:text-gray-400 ${hideEmail ? '' : 'text-primary'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           {hideEmail ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> }
                           {hideEmail ? null : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}
                        </svg>
                    </div>
                  </>
              )}
           </div>

           <div className="flex items-center gap-4">
              <CreditDisplay apiKeys={apiKeys} onRefresh={refreshAllCredits} t={t} />

              <button 
                onClick={() => setKeyManagerOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/5 group"
              >
                 <div className="flex gap-1">
                    {apiKeys.slice(0,3).map(k => (
                      <div key={k.id} className={`w-1.5 h-1.5 rounded-full transition-all ${k.status === 'busy' ? 'bg-primary shadow-[0_0_5px_rgba(190,242,100,0.8)]' : k.status === 'error' ? 'bg-red-500' : k.key ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
                    ))}
                    {apiKeys.length > 3 && <span className="text-[10px] text-gray-600 group-hover:text-gray-400 leading-none">...</span>}
                 </div>
                 <span className="text-xs font-medium text-gray-400 group-hover:text-gray-200">{t.app_cluster_status}</span>
              </button>
           </div>
        </header>

        {/* Viewport */}
        <div className="flex-1 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#18181b] to-black overflow-hidden">
           {selectedVideo ? (
             <div className="w-full h-full flex flex-col justify-center max-w-5xl animate-fade-in">
               <VideoPlayer video={selectedVideo} t={t} />
             </div>
           ) : (
             <div className="text-center select-none flex flex-col items-center">
                <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
                    <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                </div>
                <h1 className="text-2xl font-bold mb-2 tracking-tight text-white">{t.app_welcome_title}</h1>
                <p className="text-sm font-light text-gray-500 max-w-sm">{t.app_welcome_desc}</p>
             </div>
           )}
        </div>
      </div>

      {/* Right Sidebar (History/Queue) */}
      <HistorySidebar 
        history={history}
        tasks={tasks}
        onSelectHistory={setSelectedVideo} 
        activeId={selectedVideo?.id}
        t={t}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <VeoStudioApp />
    </ToastProvider>
  );
}

export default App;
