
import React, { useState } from 'react';
import { translations } from '../utils/translations'; // Can import directly if not passed as props easily, but here we will stick to pattern if possible. 
// Wait, ApiKeyModal is only used in App, let's update App to pass 't' or handle internally.
// Actually, App uses ApiKeyManager primarily now, but ApiKeyModal was legacy for single key. 
// I'll update it just in case it's used, or to be consistent.

interface ApiKeyModalProps {
  onKeySelected: () => void;
  t?: any; // Optional to avoid breaking if used elsewhere without it
}

// Fallback t if not provided (though App provides it)
const defaultT = translations['en'];

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onKeySelected, t = defaultT }) => {
  const [error, setError] = useState<string | null>(null);

  const handleSelectKey = async () => {
    try {
      setError(null);
      await window.aistudio?.openSelectKey();
      setTimeout(() => {
        onKeySelected();
      }, 500);
    } catch (e: any) {
      console.error(e);
      if (e.message && e.message.includes("Requested entity was not found")) {
        setError(t.modal_error_expired);
      } else {
        setError(t.modal_error_fail);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="bg-surface border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="mb-6 relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-full blur opacity-25"></div>
          <div className="relative w-16 h-16 bg-surfaceHighlight rounded-full flex items-center justify-center mx-auto border border-white/10">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">{t.modal_title}</h2>
        <p className="text-gray-400 mb-8">
          {t.modal_desc}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleSelectKey}
          className="w-full py-3 px-4 bg-gradient-to-r from-primary to-primaryHover hover:to-purple-500 text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-primary/25 flex items-center justify-center gap-2"
        >
          <span>{t.modal_btn}</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </button>

        <div className="mt-6 text-xs text-gray-500">
          {t.modal_agree}
          <br />
          <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-secondary hover:underline mt-1 inline-block"
          >
            {t.modal_billing}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;
