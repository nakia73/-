
import React, { useState, useRef, useEffect } from 'react';
import { VideoSettings, ApiKeyData, Translation, DirectorTemplate, PromptConfig, PromptTemplate } from '../types';
import { uploadFileToKie } from '../services/uploadService';
import { fitImageToAspectRatio } from '../services/imageProcessing';
import { generateEnhancedPrompt, ENHANCER_MODELS, DEFAULT_BASE_SYSTEM_PROMPT } from '../services/promptService';
import { useToast } from './ToastContext';
import DirectorPanel from './DirectorPanel';
import QualityWarningModal from './QualityWarningModal';
import AdvancedSettingsPanel from './AdvancedSettingsPanel';

interface GeneratorFormProps {
  onAddToQueue: (prompt: string, startImageUrl: string | null, endImageUrl: string | null, settings: VideoSettings, promptConfig?: PromptConfig) => void;
  queueLength: number;
  apiKeys: ApiKeyData[];
  geminiApiKey?: string; 
  suppressQualityWarning: boolean;
  setSuppressQualityWarning: (suppress: boolean) => void;
  handleSaveSettings: () => Promise<void>;
  
  // Director Templates
  directorTemplates: DirectorTemplate[];
  activeTemplateId: string;
  setActiveTemplateId: (id: string) => void;
  addTemplate: (name: string, prompt: string) => void;
  updateTemplate: (id: string, name: string, prompt: string) => void;
  deleteTemplate: (id: string) => void;

  // Prompt Generator Templates
  promptTemplates: PromptTemplate[];
  activePromptTemplateId: string;
  setActivePromptTemplateId: (id: string) => void;
  addPromptTemplate: (name: string, template: string) => void;
  updatePromptTemplate: (id: string, name: string, template: string) => void;
  deletePromptTemplate: (id: string) => void;

  t: Translation;
}

type GenerationMode = 'text-to-video' | 'image-to-video' | 'director';

const GeneratorForm: React.FC<GeneratorFormProps> = ({ 
  onAddToQueue, queueLength, apiKeys, geminiApiKey,
  suppressQualityWarning, setSuppressQualityWarning, handleSaveSettings,
  
  directorTemplates, activeTemplateId, setActiveTemplateId, addTemplate, updateTemplate, deleteTemplate,
  
  promptTemplates, activePromptTemplateId, setActivePromptTemplateId, 
  addPromptTemplate, updatePromptTemplate, deletePromptTemplate,
  
  t 
}) => {
  const { addToast } = useToast();
  const [mode, setMode] = useState<GenerationMode>('text-to-video');
  const [prompt, setPrompt] = useState('');
  
  const [startImageUrl, setStartImageUrl] = useState('');
  const [endImageUrl, setEndImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showQualityWarning, setShowQualityWarning] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  
  // Prompt Enhancer State
  const [enhancerModel, setEnhancerModel] = useState(ENHANCER_MODELS[0].id);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [draftIdea, setDraftIdea] = useState('');
  
  // Meta Prompt Modal State
  const [showMetaModal, setShowMetaModal] = useState(false);
  // Local state for the modal inputs
  const [localMetaName, setLocalMetaName] = useState('');
  const [localMetaContent, setLocalMetaContent] = useState('');
  const [localMetaId, setLocalMetaId] = useState<string | null>(null); 
  
  const startFileRef = useRef<HTMLInputElement>(null);
  const endFileRef = useRef<HTMLInputElement>(null);
  
  const [settings, setSettings] = useState<VideoSettings>({
    aspectRatio: '16:9',
    resolution: '720p',
    model: 'veo-3.1-fast-generate-preview',
    duration: '10',
    size: 'standard',
    removeWatermark: true
  });

  // Standard Config for Text/Image Modes
  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    language: 'ja',
    enableText: false,
    audioMode: 'off',
    enableJsonTiming: false,
    imageReferenceMode: 'animate'
  });

  // SEPARATED Config for Director Mode to avoid bleeding
  const [directorPromptConfig, setDirectorPromptConfig] = useState<PromptConfig>({
    language: 'ja',
    enableText: false,
    audioMode: 'off',
    enableJsonTiming: false,
    imageReferenceMode: 'animate'
  });

  // Sync local state when active template changes or modal opens
  useEffect(() => {
      if (showMetaModal) {
         loadActiveTemplateToLocal();
      }
  }, [showMetaModal, activePromptTemplateId]);

  const loadActiveTemplateToLocal = () => {
      const active = promptTemplates.find(pt => pt.id === activePromptTemplateId);
      if (active) {
          setLocalMetaContent(active.template);
          setLocalMetaName(active.name);
          setLocalMetaId(active.id);
      } else {
          resetMetaEditor();
      }
  };

  const resetMetaEditor = () => {
      setLocalMetaId(null);
      setLocalMetaName('New Custom Prompt');
      setLocalMetaContent(DEFAULT_BASE_SYSTEM_PROMPT);
  };

  const getActiveKey = () => {
      const validKey = apiKeys.find(k => k.key && k.key.length > 10 && k.status !== 'error');
      return validKey?.key;
  };

  const getModelInfo = (modelKey: string) => {
     if (modelKey.startsWith('veo-3.1-fast')) return { label: t.gen_model_veo_fast, cost: t.gen_cost_veo_fast, desc: t.gen_veo_fast_desc, color: 'text-secondary' };
     if (modelKey.startsWith('veo-3.1-gen')) return { label: t.gen_model_veo_hq, cost: t.gen_cost_veo_hq, desc: t.gen_veo_hq_desc, color: 'text-primary' };
     if (modelKey === 'sora-2') return { label: t.gen_model_sora, cost: t.gen_cost_sora, desc: t.gen_sora_desc, color: 'text-purple-400' };
     if (modelKey === 'sora-2-pro') return { label: t.gen_model_sora_pro, cost: t.gen_cost_sora_pro, desc: t.gen_sora_pro_desc, color: 'text-pink-500' };
     return { label: modelKey, cost: '', desc: '', color: 'text-white' };
  };

  const handleImageUpload = async (file: File, isStart: boolean) => {
    const activeKey = getActiveKey();
    if (!activeKey) {
        addToast(t.gen_no_key, 'error');
        return;
    }

    setUploading(true);
    try {
      // Pre-process image to fit ratio (Veo requirement mainly, but good for Sora too)
      const processedFile = await fitImageToAspectRatio(file, settings.aspectRatio);
      
      const url = await uploadFileToKie(processedFile, activeKey);
      
      if (isStart) setStartImageUrl(url);
      else setEndImageUrl(url);
      
      addToast(t.common_success, 'success');
    } catch (error: any) {
      addToast(`${t.common_error}: ${error.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleQueueClick = () => {
      const activeKey = getActiveKey();
      if (!activeKey) {
          addToast(t.gen_no_key, 'error');
          return;
      }

      // Check for High Cost models
      const isHighCost = settings.model.includes('pro') || settings.model.includes('generate-preview');
      if (isHighCost && !suppressQualityWarning) {
          setShowQualityWarning(true);
          return;
      }
      
      processQueueAdd();
  };

  const processQueueAdd = () => {
      if (!prompt.trim() && !startImageUrl) {
          addToast("Please enter a prompt or upload an image", 'warning');
          return;
      }
      onAddToQueue(prompt, startImageUrl || null, endImageUrl || null, settings, promptConfig);
      setShowQualityWarning(false);
      
      // Reset after add (optional)
      // setPrompt(''); 
  };

  const handleEnhancePrompt = async () => {
    const activeKey = geminiApiKey; // Use Gemini Key
    if (!activeKey) {
        addToast(t.gen_no_gemini_key, 'error');
        return;
    }

    setIsEnhancing(true);
    try {
        // Use active Prompt Template as system instruction
        const currentTemplate = promptTemplates.find(pt => pt.id === activePromptTemplateId)?.template || DEFAULT_BASE_SYSTEM_PROMPT;

        const enhanced = await generateEnhancedPrompt(activeKey, draftIdea, promptConfig, enhancerModel, currentTemplate);
        setPrompt(enhanced);
        addToast(t.common_success, 'success');
    } catch (e: any) {
        addToast(e.message, 'error');
    } finally {
        setIsEnhancing(false);
    }
  };

  // --- Meta Modal Actions ---
  const handleMetaSave = () => {
      if (localMetaId) {
          updatePromptTemplate(localMetaId, localMetaName, localMetaContent);
      } else {
          addPromptTemplate(localMetaName, localMetaContent);
      }
      setShowMetaModal(false);
      addToast(t.common_success, 'success');
  };

  const handleMetaDelete = () => {
      if (localMetaId) {
          const tmpl = promptTemplates.find(t => t.id === localMetaId);
          if (tmpl?.isDefault) {
              addToast("Cannot delete default template", "warning");
              return;
          }
          deletePromptTemplate(localMetaId);
          setShowMetaModal(false);
          addToast(t.common_success, 'info');
      }
  };

  const handleMetaSaveAsNew = () => {
      const newName = `${localMetaName} (Copy)`;
      addPromptTemplate(newName, localMetaContent);
      setShowMetaModal(false);
      addToast(t.common_success, 'success');
  };

  const modelInfo = getModelInfo(settings.model);
  const isSora = settings.model.startsWith('sora');

  return (
    <div className="flex flex-col h-full">
      
      <QualityWarningModal 
        isOpen={showQualityWarning}
        onClose={() => setShowQualityWarning(false)}
        onConfirm={(dontShow) => {
            if (dontShow) setSuppressQualityWarning(true);
            processQueueAdd();
        }}
        t={t}
      />

      {/* Meta Prompt Editor Modal */}
      {showMetaModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-surface border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-white">{t.adv_meta_label}</h3>
                      <button onClick={() => setShowMetaModal(false)} className="text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">{t.dir_tmpl_name}</label>
                          <input 
                              type="text"
                              value={localMetaName}
                              onChange={(e) => setLocalMetaName(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary outline-none"
                          />
                      </div>
                      <div>
                          <label className="text-xs text-gray-400 block mb-1">{t.dir_tmpl_prompt}</label>
                          <textarea 
                              value={localMetaContent}
                              onChange={(e) => setLocalMetaContent(e.target.value)}
                              className="w-full h-48 bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-gray-300 focus:border-secondary outline-none resize-none font-mono leading-relaxed"
                              placeholder={t.adv_meta_placeholder}
                          />
                      </div>

                      <div className="flex gap-3 pt-2 border-t border-white/5">
                          {localMetaId && !promptTemplates.find(pt => pt.id === localMetaId)?.isDefault && (
                              <button 
                                  onClick={handleMetaDelete}
                                  className="px-3 py-2 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded hover:bg-red-500/10"
                              >
                                  {t.dir_tmpl_delete}
                              </button>
                          )}
                          <div className="flex-1 flex gap-2 justify-end">
                              {localMetaId && (
                                  <button 
                                      onClick={handleMetaSaveAsNew}
                                      className="px-4 py-2 text-xs text-gray-300 hover:text-white border border-white/10 rounded hover:bg-white/5"
                                  >
                                      {t.modal_save_as_new}
                                  </button>
                              )}
                              <button onClick={handleMetaSave} className="px-6 py-2 bg-secondary text-black text-xs font-bold rounded hover:bg-cyan-400 transition-colors">
                                  {localMetaId ? t.modal_update : t.modal_create}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="p-6 pb-0 flex-shrink-0">
        <div className="flex justify-between items-center mb-6">
           <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
             <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
             </svg>
             {t.gen_title}
           </h2>
           <span className="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/5">
              Q: {queueLength}
           </span>
        </div>

        <div className="flex p-1 bg-black/40 rounded-xl mb-6 border border-white/10 relative">
          <div 
             className="absolute top-1 bottom-1 bg-surfaceHighlight rounded-lg transition-all duration-300 ease-out border border-white/5 shadow-sm"
             style={{ 
               left: mode === 'text-to-video' ? '4px' : mode === 'image-to-video' ? '33.33%' : '66.66%', 
               width: 'calc(33.33% - 5px)'
             }}
          ></div>
          <button 
            onClick={() => {
                setMode('text-to-video');
                setSettings(s => ({ ...s, model: 'veo-3.1-fast-generate-preview' }));
                setStartImageUrl(''); // Clear images
                setEndImageUrl('');
            }} 
            className={`flex-1 relative z-10 py-2 text-xs font-bold transition-colors ${mode === 'text-to-video' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t.gen_tab_text}
          </button>
          <button 
            onClick={() => {
                setMode('image-to-video');
                setSettings(s => ({ ...s, model: 'veo-3.1-fast-generate-preview' }));
                setStartImageUrl(''); // Clear images
                setEndImageUrl('');
            }} 
            className={`flex-1 relative z-10 py-2 text-xs font-bold transition-colors ${mode === 'image-to-video' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t.gen_tab_image}
          </button>
          <button 
            onClick={() => {
                setMode('director');
                setSettings(s => ({ ...s, model: 'sora-2' }));
                setStartImageUrl(''); // Clear images
                setEndImageUrl('');
            }} 
            className={`flex-1 relative z-10 py-2 text-xs font-bold transition-colors ${mode === 'director' ? 'text-secondary' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t.gen_tab_director}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        
        {/* DIRECTOR MODE PANEL */}
        {mode === 'director' ? (
           <DirectorPanel 
              apiKeys={apiKeys}
              geminiApiKey={geminiApiKey}
              settings={settings}
              setSettings={setSettings}
              onExecuteBatch={(scenes) => {
                  scenes.forEach(scene => {
                       onAddToQueue(
                           scene.prompt, 
                           scene.imageUrl || null, 
                           null, 
                           {...settings}, // Pass global settings (model/ratio)
                           directorPromptConfig
                       );
                  });
              }}
              promptConfig={directorPromptConfig}
              setPromptConfig={setDirectorPromptConfig}
              
              activePromptTemplateName="" // Not used in Director mode
              onOpenMetaModal={() => {}} // Not used here
              
              directorTemplates={directorTemplates}
              activeTemplateId={activeTemplateId}
              setActiveTemplateId={setActiveTemplateId}
              addTemplate={addTemplate}
              updateTemplate={updateTemplate}
              deleteTemplate={deleteTemplate}
              
              t={t}
           />
        ) : (
          /* STANDARD GENERATOR (Text & Image) */
          <>
            {/* Model Selection */}
            <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <label className="text-xs text-gray-400 font-medium">Model</label>
                 <span className={`text-[10px] ${modelInfo.color} font-bold`}>{modelInfo.cost}</span>
               </div>
               <div className="grid grid-cols-1 gap-2">
                 <select 
                    value={settings.model}
                    onChange={(e) => setSettings({...settings, model: e.target.value})}
                    className="w-full bg-surface border border-white/10 rounded-lg p-3 text-sm text-white focus:border-primary outline-none appearance-none"
                  >
                    <option value="veo-3.1-fast-generate-preview">{t.gen_model_veo_fast}</option>
                    <option value="veo-3.1-generate-preview">{t.gen_model_veo_hq}</option>
                    <option value="sora-2">{t.gen_model_sora}</option>
                    <option value="sora-2-pro">{t.gen_model_sora_pro}</option>
                 </select>
                 <p className="text-[10px] text-gray-500 px-1">{modelInfo.desc}</p>
               </div>
            </div>

            {/* Prompt Section with Advanced Panel */}
            <div className="space-y-2">
               <label className="text-xs text-gray-400 font-medium flex justify-between">
                 {t.gen_prompt_label}
                 <span className={prompt.length > 500 ? 'text-red-400' : 'text-gray-600'}>{prompt.length} chars</span>
               </label>

               <AdvancedSettingsPanel 
                  t={t}
                  showAdvancedSettings={showAdvancedSettings}
                  setShowAdvancedSettings={setShowAdvancedSettings}
                  
                  draftIdea={draftIdea}
                  setDraftIdea={setDraftIdea}
                  enhancerModel={enhancerModel}
                  setEnhancerModel={setEnhancerModel}
                  isEnhancing={isEnhancing}
                  handleEnhancePrompt={handleEnhancePrompt}
                  
                  promptConfig={promptConfig}
                  setPromptConfig={setPromptConfig}
                  
                  activePromptTemplateName={promptTemplates.find(pt => pt.id === activePromptTemplateId)?.name || 'Default'}
                  onOpenMetaModal={() => setShowMetaModal(true)}
                  
                  mode={mode as 'text-to-video' | 'image-to-video'}
               />

               <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t.gen_prompt_placeholder}
                  className="w-full h-32 bg-surface border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
               />
            </div>

            {/* Image Uploads */}
            {(mode === 'image-to-video' || isSora) && (
              <div className="space-y-3">
                 <label className="text-xs text-gray-400 font-medium">{t.gen_start_frame_url}</label>
                 <div 
                   onClick={() => startFileRef.current?.click()}
                   className={`border border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:bg-white/5 transition-colors relative flex flex-col items-center justify-center gap-2 min-h-[100px] ${startImageUrl ? 'border-primary/50 bg-primary/5' : ''}`}
                 >
                    {startImageUrl ? (
                        <div className="relative w-full group">
                            <img src={startImageUrl} alt="Start" className="max-h-32 mx-auto rounded shadow-lg" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/60 transition-opacity rounded">
                                <span className="text-xs font-bold text-white">Change Image</span>
                            </div>
                        </div>
                    ) : (
                        <>
                           {uploading ? (
                             <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                           ) : (
                             <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                           )}
                           <span className="text-xs text-gray-600">{uploading ? t.gen_processing_img : t.gen_upload_placeholder}</span>
                        </>
                    )}
                 </div>
                 <input 
                   ref={startFileRef}
                   type="file" 
                   className="hidden" 
                   accept="image/*"
                   onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                 />
              </div>
            )}

            {mode === 'text-to-video' && !isSora && (
               <div className="space-y-3">
                  <label className="text-xs text-gray-400 font-medium">{t.gen_end_frame_url}</label>
                  <div 
                    onClick={() => endFileRef.current?.click()}
                    className="border border-dashed border-white/20 rounded-lg p-3 text-center cursor-pointer hover:bg-white/5 transition-colors min-h-[60px] flex items-center justify-center"
                  >
                     {endImageUrl ? (
                        <div className="flex items-center gap-2">
                             <img src={endImageUrl} alt="End" className="w-8 h-8 rounded object-cover" />
                             <span className="text-xs text-green-400">End Frame Set</span>
                        </div>
                     ) : (
                        <span className="text-xs text-gray-600">{t.gen_upload_img} (Optional)</span>
                     )}
                  </div>
                  <input 
                    ref={endFileRef}
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], false)}
                  />
               </div>
            )}

            {/* Config Grid */}
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-xs text-gray-400 font-medium block mb-2">{t.gen_aspect_ratio}</label>
                  <select 
                    value={settings.aspectRatio}
                    onChange={(e) => setSettings({...settings, aspectRatio: e.target.value as any})}
                    className="w-full bg-surface border border-white/10 rounded-lg p-2 text-sm text-white focus:border-primary outline-none appearance-none"
                  >
                    <option value="16:9">{t.gen_opt_landscape}</option>
                    <option value="9:16">{t.gen_opt_portrait}</option>
                  </select>
               </div>

               {isSora ? (
                   <div>
                       <label className="text-xs text-gray-400 font-medium block mb-2">{t.gen_duration}</label>
                       <select 
                           value={settings.duration}
                           onChange={(e) => setSettings({...settings, duration: e.target.value as any})}
                           className="w-full bg-surface border border-white/10 rounded-lg p-2 text-sm text-white focus:border-primary outline-none appearance-none"
                       >
                           <option value="10">{t.gen_opt_10s}</option>
                           <option value="15">{t.gen_opt_15s}</option>
                       </select>
                   </div>
               ) : (
                   <div>
                       <label className="text-xs text-gray-400 font-medium block mb-2">{t.gen_resolution}</label>
                       <select 
                           value={settings.resolution}
                           onChange={(e) => setSettings({...settings, resolution: e.target.value as any})}
                           className="w-full bg-surface border border-white/10 rounded-lg p-2 text-sm text-white focus:border-primary outline-none appearance-none"
                       >
                           <option value="720p">{t.gen_opt_720p}</option>
                           <option value="1080p">{t.gen_opt_1080p}</option>
                       </select>
                   </div>
               )}
            </div>

            <div className="mt-auto pt-4 border-t border-white/5">
              <button
                onClick={handleQueueClick}
                disabled={!prompt.trim() && !startImageUrl}
                className="w-full py-4 bg-primary hover:bg-primaryHover text-black font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 group"
              >
                <div className="w-1 h-4 bg-black/20 rounded-full group-hover:scale-y-110 transition-transform"></div>
                {t.gen_queue_btn}
                <svg className="w-5 h-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GeneratorForm;
