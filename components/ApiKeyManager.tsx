
import React, { useState, useEffect } from 'react';
import { ApiKeyData, Translation } from '../types';

interface ApiKeyManagerProps {
  apiKeys: ApiKeyData[];
  onUpdateKey: (index: number, key: string, label: string) => void;
  geminiApiKey?: string;
  onUpdateGeminiKey?: (key: string) => void;
  onRefreshCredits?: () => Promise<void>;
  enableLocalHistory: boolean;
  onUpdateLocalHistory: (enable: boolean) => void;
  onSave: () => Promise<void>;
  isSaving: boolean;
  userEmail?: string;
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void; 
  t: Translation;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ 
  apiKeys, onUpdateKey, geminiApiKey = '', onUpdateGeminiKey, onRefreshCredits,
  enableLocalHistory, onUpdateLocalHistory,
  onSave, isSaving, userEmail,
  isOpen, onClose, onOpenAuth, t 
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [localGeminiKey, setLocalGeminiKey] = useState(geminiApiKey);

  // Sync prop change
  useEffect(() => {
    setLocalGeminiKey(geminiApiKey);
  }, [geminiApiKey]);

  // Auto refresh on open
  useEffect(() => {
    if (isOpen && onRefreshCredits) {
        handleRefresh();
    }
  }, [isOpen]);

  const handleRefresh = async () => {
      if (!onRefreshCredits) return;
      setRefreshing(true);
      try {
          await onRefreshCredits();
      } catch (e) {
          console.error("Failed to refresh", e);
      } finally {
          setRefreshing(false);
      }
  };

  const handleGeminiChange = (val: string) => {
      setLocalGeminiKey(val);
      if (onUpdateGeminiKey) onUpdateGeminiKey(val);
  };

  const existingLabels = Array.from(new Set(
    apiKeys.map(k => k.accountLabel).filter(l => l && l.trim() !== '')
  ));
  
  if (!isOpen) return null;

  const processedAccounts = new Set<string>();
  let totalCredits = 0;

  apiKeys.forEach(k => {
      if (k.key && k.key.trim().length > 0 && k.remainingCredits !== undefined) {
          const identifier = k.accountLabel && k.accountLabel.trim().length > 0 
              ? k.accountLabel.trim() 
              : k.key.trim();
              
          if (!processedAccounts.has(identifier)) {
              processedAccounts.add(identifier);
              totalCredits += k.remainingCredits;
          }
      }
  });

  const totalValue = (totalCredits / 1000) * 5; 

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <datalist id="account-labels">
         {existingLabels.map(label => <option key={label} value={label} />)}
      </datalist>

      <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl animate-slide-in">
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-surfaceHighlight/20">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {t.api_title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
               <p className="text-gray-400 text-sm">{t.api_desc}</p>
               {userEmail && <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">{t.auth_syncing_to} {userEmail}</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {!userEmail && (
               <button 
                 onClick={() => {
                   onClose();
                   onOpenAuth();
                 }}
                 className="px-3 py-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary text-xs font-bold rounded-lg border border-secondary/30 flex items-center gap-1 transition-colors"
               >
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                 {t.auth_sync_btn}
               </button>
             )}
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
               <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Total Balance Banner */}
          <div className="bg-gradient-to-r from-surfaceHighlight to-surface border border-white/10 rounded-xl p-4 flex justify-between items-center relative overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"></div>
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs text-gray-400 uppercase tracking-wider">{t.api_total_bal}</h4>
                    <div className="group relative inline-block">
                        <svg className="w-3.5 h-3.5 text-gray-500 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div className="absolute left-0 bottom-full mb-2 w-48 bg-black border border-white/20 p-2 rounded text-[10px] text-gray-300 hidden group-hover:block z-20">
                            {t.api_account_tooltip}
                        </div>
                    </div>
                    <button 
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className={`ml-2 p-1 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-all ${refreshing ? 'animate-spin text-primary' : ''}`}
                        title="Refresh Balance"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
                <div className="text-2xl font-bold text-white font-mono flex items-baseline gap-3">
                    <span>{totalCredits.toLocaleString()} <span className="text-sm text-gray-500 font-sans">{t.api_credits}</span></span>
                    <span className="text-green-400 text-lg">${totalValue.toFixed(2)}</span>
                </div>
             </div>
             <div className="flex gap-3 relative z-10">
                 <a href="https://kie.ai/billing" target="_blank" className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-white border border-white/10">
                    {t.api_top_up}
                 </a>
             </div>
          </div>

          {/* General & LLM Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-black/20 rounded-xl border border-white/5 p-4">
                <h3 className="text-sm font-bold text-secondary mb-4 uppercase tracking-wider flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {t.api_section_general}
                </h3>
                <div className="space-y-4">
                    {/* Local History Toggle */}
                    <div className="flex items-center justify-between bg-surfaceHighlight/30 p-3 rounded-lg border border-white/5">
                        <div>
                            <h4 className="text-sm font-medium text-gray-300">{t.api_local_hist_label}</h4>
                            <p className="text-xs text-gray-500 mt-1">{t.api_local_hist_desc}</p>
                        </div>
                        <button 
                        onClick={() => onUpdateLocalHistory(!enableLocalHistory)}
                        className={`w-12 h-6 rounded-full p-1 transition-colors ${enableLocalHistory ? 'bg-primary' : 'bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${enableLocalHistory ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                </div>
              </div>

              <div className="bg-black/20 rounded-xl border border-white/5 p-4">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        {t.api_section_llm}
                    </h3>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-purple-400 hover:underline flex items-center gap-1">
                        {t.api_gemini_link}
                    </a>
                </div>
                
                <div className="space-y-2">
                     <label className="block text-xs font-medium text-gray-300">{t.api_gemini_label}</label>
                     <input
                        type="password"
                        value={localGeminiKey}
                        onChange={(e) => handleGeminiChange(e.target.value)}
                        placeholder={t.api_gemini_placeholder}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none font-mono"
                     />
                     <p className="text-[10px] text-gray-500">{t.api_gemini_desc}</p>
                </div>
              </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
               <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  {t.api_section_cluster}
               </h3>
               <a 
                 href="https://kie.ai/api-key" 
                 target="_blank" 
                 rel="noreferrer"
                 className="text-xs text-primary hover:underline flex items-center gap-1 px-2 py-1 bg-primary/10 rounded"
               >
                 {t.api_get_key}
               </a>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apiKeys.map((keyData, index) => (
                <div 
                  key={keyData.id}
                  className={`p-4 rounded-xl border transition-all ${
                    keyData.status === 'busy' ? 'bg-primary/5 border-primary/30' : 
                    keyData.status === 'error' ? 'bg-red-500/5 border-red-500/30' : 
                    'bg-surfaceHighlight/50 border-white/5'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        keyData.status === 'busy' ? 'bg-primary' : 
                        keyData.status === 'error' ? 'bg-red-500' : 
                        keyData.key ? 'bg-green-500' : 'bg-gray-600'
                      }`}></div>
                      <span className="font-mono text-xs text-gray-400">{t.api_node}_{index + 1}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {keyData.remainingCredits !== undefined && (
                            <span className="text-[10px] font-mono text-gray-400">
                                {keyData.remainingCredits.toLocaleString()} CR (${((keyData.remainingCredits/1000)*5).toFixed(2)})
                            </span>
                        )}
                        {keyData.status === 'busy' && (
                        <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
                            Active
                        </span>
                        )}
                        {keyData.status === 'error' && (
                        <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">
                            {t.api_offline}
                        </span>
                        )}
                    </div>
                  </div>

                  {/* Account Grouping Label */}
                  <div className="mb-2">
                      <input 
                        type="text"
                        list="account-labels" // Connect to Datalist
                        value={keyData.accountLabel || ''}
                        onChange={(e) => onUpdateKey(index, keyData.key, e.target.value)}
                        placeholder={t.api_account_label}
                        className="w-full bg-transparent border-b border-white/10 px-0 py-1 text-xs text-gray-300 focus:border-secondary focus:text-white outline-none transition-colors placeholder-gray-600"
                      />
                  </div>

                  <input
                    type="password"
                    value={keyData.key}
                    onChange={(e) => onUpdateKey(index, e.target.value, keyData.accountLabel || '')}
                    placeholder={`${t.api_placeholder} #${index + 1}`}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono"
                  />

                  <div className="mt-3 flex justify-between text-[10px] text-gray-500 uppercase font-medium">
                    <span>{t.api_total}: {keyData.totalGenerated}</span>
                    <span>{t.api_status}: {keyData.errorMessage || keyData.status}</span>
                  </div>
                  
                  <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${keyData.status === 'error' ? 'bg-red-500' : 'bg-primary'}`}
                      style={{ width: `${(keyData.activeRequests / 2) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-white/10 bg-surfaceHighlight/10 flex justify-between items-center">
           <div className="flex items-center gap-4 text-sm text-gray-400">
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-green-500"></div>
               <span>{t.api_legend_idle}</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-primary"></div>
               <span>{t.api_legend_proc}</span>
             </div>
           </div>
           
           <div className="flex gap-3">
              <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm">
                {t.common_close}
              </button>
              <button 
                onClick={onSave}
                disabled={isSaving}
                className="px-6 py-2 bg-primary hover:bg-primaryHover text-black text-sm font-bold rounded-lg shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                   <>
                     <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                     {t.common_saving}
                   </>
                ) : (
                   <>
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                     {t.common_save}
                   </>
                )}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyManager;
