
import React, { useState } from 'react';

interface QualityWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dontShowAgain: boolean) => void;
  t: any;
}

const QualityWarningModal: React.FC<QualityWarningModalProps> = ({ isOpen, onClose, onConfirm, t }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-surface border border-yellow-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-yellow-500/10 animate-scale-in relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 to-yellow-400"></div>
        
        <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-yellow-500/10 rounded-full border border-yellow-500/20 text-yellow-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <div>
                <h2 className="text-xl font-bold text-white mb-2">{t.warn_title}</h2>
                <p className="text-gray-300 text-sm leading-relaxed">{t.warn_desc}</p>
            </div>
        </div>

        <div className="bg-black/30 rounded-lg p-4 mb-6 border border-white/5 text-center">
            <p className="text-yellow-400 font-mono font-bold text-sm">{t.warn_cost_comparison}</p>
        </div>

        <div className="flex items-center gap-2 mb-8 cursor-pointer" onClick={() => setDontShowAgain(!dontShowAgain)}>
            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${dontShowAgain ? 'bg-primary border-primary text-black' : 'border-white/30 bg-transparent'}`}>
                {dontShowAgain && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
            <span className="text-sm text-gray-400 select-none">{t.warn_dont_show}</span>
        </div>

        <div className="flex gap-3">
            <button 
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
                {t.warn_btn_cancel}
            </button>
            <button 
                onClick={() => onConfirm(dontShowAgain)}
                className="flex-1 py-3 rounded-xl font-bold text-black bg-yellow-500 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition-all transform active:scale-[0.98]"
            >
                {t.warn_btn_confirm}
            </button>
        </div>
      </div>
    </div>
  );
};

export default QualityWarningModal;
