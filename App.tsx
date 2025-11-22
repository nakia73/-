
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
      if (user) {
          setTimeout(() => loadHistory(user.id), 100);
      }
  }, [user, enableLocalHistory]);

  return (
    <div className="flex h-screen bg-background text-white font-sans selection:bg-primary selection:text-black overflow-hidden">
      
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

      <Navigation 
        onOpenKeyManager={() => setKeyManagerOpen(true)} 
        onOpenAuth={() => setAuthOpen(true)}
        onLogout={handleLogout}
        language={language}
        setLanguage={setLanguage}
        user={user}
        t={t}
      />

      <div className="w-[400px] flex-shrink-0 border-r border-white/5 flex flex-col bg-background relative z-10">
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

      <div className="flex-1 flex flex-col bg-surface relative">
        <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-background/50 backdrop-blur">
           <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <span className="font-bold text-lg tracking-tight text-white">Sonic-GEN</span>
                  <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400 border border-white/5">STUDIO</span>
              </div>

              <div className="h-4 w-[1px] bg-white/10 mx-2"></div>

              {user && (
                  <div className="flex items-center gap-2 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                      <span className="text-xs text-gray-400">
                          {hideEmail ? '***@***.***' : user.email}
                      </span>
                      <button 
                        onClick={() => setHideEmail(!hideEmail)}
                        className="text-gray-500 hover:text-white transition-colors"
                      >
                          {hideEmail ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                          ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                      </button>
                  </div>
              )}
           </div>

           <div className="flex items-center gap-4">
              <CreditDisplay apiKeys={apiKeys} onRefresh={refreshAllCredits} t={t} />

              <button 
                onClick={() => setKeyManagerOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/5"
              >
                 <div className="flex gap-1">
                    {apiKeys.slice(0,3).map(k => (
                      <div key={k.id} className={`w-1.5 h-1.5 rounded-full ${k.status === 'busy' ? 'bg-primary animate-pulse' : k.status === 'error' ? 'bg-red-500' : k.key ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                    ))}
                    {apiKeys.length > 3 && <span className="text-[10px] text-gray-500 leading-none">...</span>}
                 </div>
                 <span className="text-xs font-medium text-gray-300">{t.app_cluster_status}</span>
              </button>
           </div>
        </header>

        <div className="flex-1 p-8 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-surfaceHighlight/20 to-background">
           {selectedVideo ? (
             <div className="w-full max-w-4xl h-full max-h-full flex flex-col justify-center">
               <VideoPlayer video={selectedVideo} t={t} />
             </div>
           ) : (
             <div className="text-center opacity-30 select-none">
                <div className="w-24 h-24 bg-surfaceHighlight rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/10">
                    <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold mb-2 tracking-tight text-white">{t.app_welcome_title}</h1>
                <p className="text-sm font-light text-gray-400">{t.app_welcome_desc}</p>
             </div>
           )}
        </div>
      </div>

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
