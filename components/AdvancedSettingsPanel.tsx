
import React from 'react';
import { PromptConfig, Translation } from '../types';
import { ENHANCER_MODELS } from '../services/promptService';

interface AdvancedSettingsPanelProps {
  t: Translation;
  showAdvancedSettings: boolean;
  setShowAdvancedSettings: (show: boolean) => void;
  
  // Prompt Gen Props
  draftIdea: string;
  setDraftIdea: (val: string) => void;
  enhancerModel: string;
  setEnhancerModel: (val: string) => void;
  isEnhancing: boolean;
  handleEnhancePrompt: () => void;
  
  // Config Props
  promptConfig: PromptConfig;
  setPromptConfig: React.Dispatch<React.SetStateAction<PromptConfig>>;
  
  // Meta Props
  activePromptTemplateName: string;
  onOpenMetaModal: () => void;
  
  // Context Props
  mode: 'text-to-video' | 'image-to-video' | 'director';
  hideGenerator?: boolean; 
  flatMode?: boolean; 
  
  // New Props for Control
  disabled?: boolean;
  headerRight?: React.ReactNode;
}

const AdvancedSettingsPanel: React.FC<AdvancedSettingsPanelProps> = ({
  t,
  showAdvancedSettings,
  setShowAdvancedSettings,
  draftIdea,
  setDraftIdea,
  enhancerModel,
  setEnhancerModel,
  isEnhancing,
  handleEnhancePrompt,
  promptConfig,
  setPromptConfig,
  activePromptTemplateName,
  onOpenMetaModal,
  mode,
  hideGenerator = false,
  flatMode = false,
  disabled = false,
  headerRight
}) => {
  
  // STRICTLY SEPARATED TITLES BASED ON MODE
  const panelTitle = mode === 'director' ? t.adv_title_director : t.adv_title_gen;

  const content = (
    <div className={`${flatMode ? 'space-y-4' : 'p-3 border-t border-white/5 space-y-4 bg-black/20 animate-fade-in'} ${disabled ? 'opacity-40 pointer-events-none grayscale' : ''} transition-all duration-200`}>
      
      {/* Prompt Generator Section - Only if NOT hidden (Standard Mode) */}
      {!hideGenerator && (
         <div className="space-y-3 pb-3 border-b border-white/5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-secondary flex items-center gap-2">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                {t.adv_gen_section}
              </h4>
              <button 
                onClick={onOpenMetaModal}
                className="text-[10px] text-gray-500 hover:text-white hover:underline cursor-pointer flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {activePromptTemplateName}
              </button>
            </div>

            <textarea 
              value={draftIdea}
              onChange={(e) => setDraftIdea(e.target.value)}
              placeholder={t.adv_draft_placeholder}
              className="w-full h-16 bg-surfaceHighlight border border-white/10 rounded p-2 text-xs text-white focus:border-primary outline-none resize-none"
            />

            <div className="flex items-center gap-2 justify-between">
               <select
                value={enhancerModel}
                onChange={(e) => setEnhancerModel(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded text-[10px] text-gray-400 px-2 py-1.5 focus:border-primary outline-none"
              >
                {ENHANCER_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              
              <button 
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || !draftIdea.trim()}
                className="px-4 py-1.5 flex items-center justify-center gap-2 bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 rounded text-xs text-secondary font-bold transition-colors disabled:opacity-50"
              >
                {isEnhancing ? (
                  <div className="w-3 h-3 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                ) : (
                  t.adv_btn_generate
                )}
              </button>
            </div>
         </div>
      )}

      {/* Configuration Toggles (Compact Grid) */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">{t.adv_lang}</label>
          <select 
            value={promptConfig.language}
            onChange={(e) => setPromptConfig(c => ({ ...c, language: e.target.value as any }))}
            className="w-full bg-black/40 border border-white/10 rounded p-1 text-xs text-white focus:border-secondary outline-none"
          >
            <option value="none">{t.adv_lang_none}</option>
            <option value="ja">{t.adv_lang_ja}</option>
            <option value="en">{t.adv_lang_en}</option>
            <option value="ko">{t.adv_lang_ko}</option>
            <option value="zh-CN">{t.adv_lang_zh_cn}</option>
            <option value="zh-TW">{t.adv_lang_zh_tw}</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">{t.adv_text}</label>
          <button 
            onClick={() => setPromptConfig(c => ({ ...c, enableText: !c.enableText }))}
            className={`w-full p-1 rounded text-xs font-medium border transition-colors ${
              promptConfig.enableText 
                ? 'bg-primary/20 border-primary text-primary' 
                : 'bg-black/40 border-white/10 text-gray-400'
            }`}
          >
            {promptConfig.enableText ? t.adv_text_on : t.adv_text_off}
          </button>
        </div>
      </div>

      {/* Audio & Timing */}
      <div className="space-y-2">
        <div>
          <label className="text-[10px] text-gray-500 block mb-1">{t.adv_audio}</label>
          <div className="flex bg-black/40 rounded p-0.5 border border-white/10">
            {(['off', 'narration', 'dialogue'] as const).map((audioMode) => (
              <button
                key={audioMode}
                onClick={() => setPromptConfig(c => ({ ...c, audioMode }))}
                className={`flex-1 py-0.5 rounded text-[10px] transition-colors ${
                  promptConfig.audioMode === audioMode 
                    ? 'bg-white/10 text-white font-bold' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {audioMode === 'off' ? t.adv_audio_off : audioMode === 'narration' ? t.adv_audio_narration : t.adv_audio_dialogue}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-[10px] text-gray-300 font-medium block">{t.adv_timing}</label>
            <span className="text-[9px] text-gray-600">{t.adv_timing_desc}</span>
          </div>
          <button 
            onClick={() => setPromptConfig(c => ({ ...c, enableJsonTiming: !c.enableJsonTiming }))}
            className={`w-8 h-4 rounded-full p-0.5 transition-colors ${promptConfig.enableJsonTiming ? 'bg-secondary' : 'bg-gray-700'}`}
          >
            <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${promptConfig.enableJsonTiming ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Image Reference Mode (New) - Only if in Image Mode */}
        {mode === 'image-to-video' && (
          <div className="pt-2 border-t border-white/5">
            <label className="text-[10px] text-gray-300 font-medium block mb-1">{t.adv_img_ref_mode}</label>
            <div className="flex bg-black/40 rounded p-0.5 border border-white/10 mb-1">
              <button
                onClick={() => setPromptConfig(c => ({ ...c, imageReferenceMode: 'animate' }))}
                className={`flex-1 py-0.5 rounded text-[10px] transition-colors ${
                  promptConfig.imageReferenceMode === 'animate' 
                    ? 'bg-white/10 text-white font-bold' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.adv_img_mode_animate}
              </button>
              <button
                onClick={() => setPromptConfig(c => ({ ...c, imageReferenceMode: 'subject' }))}
                className={`flex-1 py-0.5 rounded text-[10px] transition-colors ${
                  promptConfig.imageReferenceMode === 'subject' 
                    ? 'bg-white/10 text-white font-bold' 
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t.adv_img_mode_subject}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (flatMode) {
      return (
          <div className="bg-surface border border-white/10 rounded-xl p-4 relative overflow-hidden">
              <div className="flex justify-between items-center mb-3 relative z-10">
                  <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                      {panelTitle}
                  </h3>
                  {headerRight}
              </div>
              {content}
          </div>
      );
  }

  return (
    <div className="bg-surface border border-white/10 rounded-lg overflow-hidden">
      <div className="w-full flex items-center justify-between p-3 bg-surface hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}>
        <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {panelTitle}
        </span>
        <div className="flex items-center gap-2">
             {headerRight}
             <svg className={`w-4 h-4 text-gray-500 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
             </svg>
        </div>
      </div>
      
      {showAdvancedSettings && content}
    </div>
  );
};

export default AdvancedSettingsPanel;