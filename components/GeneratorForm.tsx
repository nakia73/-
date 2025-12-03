
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
    model: 'sora-2', // Default to Sora 2 for ALL modes
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
                      <h3 className="text-sm font-bold text-white">{localMetaId ? t.modal_select_edit : t.modal_new_tmpl}</h3>
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
                        <label className="text-xs text-gray-400 block mb-1">{t.adv_meta_label}</label>
                        <textarea
                            value={localMetaContent}
                            onChange={(e) => setLocalMetaContent(e.target.value)}
                            placeholder={t.adv_meta_placeholder}
                            className="w-full h-48 bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-gray-300 focus:border-secondary outline-none resize-none font-mono leading-relaxed"
                        />
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        {localMetaId && !promptTemplates.find(t => t.id === localMetaId)?.isDefault && (
                            <button 
                                onClick={handleMetaDelete}
                                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded hover:bg-red-500/10"
                            >
                                {t.common_delete}
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

      {/* Header & Global Settings (Always Visible) */}
      <div className="flex-shrink-0 z-20 bg-background pb-4 px-1 pt-1">
          {/* Tab Navigation */}
          <div className="flex p-1 bg-surfaceHighlight/50 rounded-xl mb-6 border border-white/5 relative z-20 shrink-0">
            <button
                onClick={() => {
                    setMode('text-to-video');
                    // Reset image if needed, but model stays as user selected (or default Sora 2)
                    setStartImageUrl('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'text-to-video' ? 'bg-surface text-white shadow-lg border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}
            >
                {t.gen_tab_text}
            </button>
            <button
                onClick={() => {
                    setMode('image-to-video');
                    setStartImageUrl(''); // Reset to ensure fresh upload state
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'image-to-video' ? 'bg-surface text-white shadow-lg border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}
            >
                {t.gen_tab_image}
            </button>
            <button
                onClick={() => {
                    setMode('director');
                    // Default to Sora 2 if not already (though request says make it default always)
                    // We can force Sora 2 here to be safe as per user request
                    setSettings(s => ({ ...s, model: 'sora-2' }));
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'director' ? 'bg-surface text-white shadow-lg border border-white/10' : 'text-gray-500 hover:text-gray-300'}`}
            >
                {t.gen_tab_director}
            </button>
          </div>

          {/* Model Selection (GLOBAL) */}
          <div className="bg-surface border border-white/10 rounded-xl p-4 mb-2">
            <div className="flex justify-between items-center mb-3">
                <span className={`text-xs font-bold uppercase tracking-wider ${modelInfo.color}`}>
                {modelInfo.label}
                </span>
                <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">
                {modelInfo.cost}
                </span>
            </div>
            
            <select
                value={settings.model}
                onChange={(e) => setSettings({...settings, model: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-secondary outline-none appearance-none transition-colors hover:border-white/20"
            >
                {/* Reordered: Sora 2 First */}
                <option value="sora-2">{t.gen_model_sora}</option>
                <option value="sora-2-pro">{t.gen_model_sora_pro}</option>
                <option value="veo-3.1-fast-generate-preview">{t.gen_model_veo_fast}</option>
                <option value="veo-3.1-generate-preview">{t.gen_model_veo_hq}</option>
            </select>
            <p className="text-[10px] text-gray-500 mt-2">{modelInfo.desc}</p>
          </div>
      </div>

      {/* Main Content Area (Scrollable) */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        {mode === 'director' ? (
            <DirectorPanel 
                apiKeys={apiKeys}
                geminiApiKey={geminiApiKey}
                settings={settings}
                setSettings={setSettings}
                onExecuteBatch={(scenes) => {
                    // Batch execution logic
                    scenes.forEach((scene, idx) => {
                        setTimeout(() => {
                            onAddToQueue(scene.prompt, scene.imageUrl || null, null, settings, directorPromptConfig);
                        }, idx * 200);
                    });
                    addToast(`Queued ${scenes.length} tasks`, "success");
                }}
                
                promptConfig={directorPromptConfig}
                setPromptConfig={setDirectorPromptConfig}
                
                activePromptTemplateName={promptTemplates.find(p => p.id === activePromptTemplateId)?.name || 'Custom'}
                onOpenMetaModal={() => setShowMetaModal(true)}
                
                directorTemplates={directorTemplates}
                activeTemplateId={activeTemplateId}
                setActiveTemplateId={setActiveTemplateId}
                addTemplate={addTemplate}
                updateTemplate={updateTemplate}
                deleteTemplate={deleteTemplate}

                t={t}
            />
        ) : (
            <div className="h-full overflow-y-auto pr-2 pb-4 space-y-6">
                
                {/* 1. Advanced Settings (Prompt Generation & Config) */}
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
                    
                    activePromptTemplateName={promptTemplates.find(p => p.id === activePromptTemplateId)?.name || 'Custom'}
                    onOpenMetaModal={() => setShowMetaModal(true)}
                    
                    mode={mode}
                />

                {/* 2. Prompt Input */}
                <div>
                    <label className="text-xs text-gray-400 font-medium block mb-2 uppercase tracking-wide">{t.gen_prompt_label}</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t.gen_prompt_placeholder}
                        className="w-full h-32 bg-surface border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none shadow-inner"
                    />
                </div>

                {/* 3. Image Uploads */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Start Image (Common for all) */}
                    <div>
                        <label className="text-xs text-gray-400 font-medium block mb-2 truncate">{t.gen_start_frame_url}</label>
                        <div 
                        onClick={() => startFileRef.current?.click()}
                        className={`border border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-white/5 transition-all relative group h-32 flex flex-col items-center justify-center ${startImageUrl ? 'border-primary/50 bg-primary/5' : 'border-white/20'}`}
                        >
                        {startImageUrl ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img src={startImageUrl} alt="Start" className="max-h-full max-w-full rounded object-contain shadow-lg" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                    <span className="text-xs font-bold text-white">{t.common_change}</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                {uploading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-8 h-8 text-gray-600 group-hover:text-gray-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                )}
                                <span className="text-[10px] text-gray-500 mt-2">{t.gen_upload_placeholder}</span>
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

                    {/* End Image (Veo Only) */}
                    <div>
                        <label className={`text-xs font-medium block mb-2 truncate ${isSora ? 'text-gray-700 line-through' : 'text-gray-400'}`}>{t.gen_end_frame_url}</label>
                        <div 
                        onClick={() => !isSora && endFileRef.current?.click()}
                        className={`border border-dashed rounded-lg p-4 text-center transition-all relative group h-32 flex flex-col items-center justify-center ${isSora ? 'border-white/5 bg-black/20 cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-white/5 border-white/20'}`}
                        >
                            {endImageUrl ? (
                                <div className="relative w-full h-full flex items-center justify-center">
                                    <img src={endImageUrl} alt="End" className="max-h-full max-w-full rounded object-contain shadow-lg" />
                                    {!isSora && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                            <span className="text-xs font-bold text-white">{t.common_change}</span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className="text-[10px] text-gray-600 mt-2">{isSora ? 'Not supported in Sora' : t.gen_upload_placeholder}</span>
                                </>
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
                </div>

                {/* 4. Basic Settings (Aspect/Res) */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 font-medium block mb-2">{t.gen_aspect_ratio}</label>
                        <select 
                            value={settings.aspectRatio}
                            onChange={(e) => setSettings({...settings, aspectRatio: e.target.value as any})}
                            className="w-full bg-surface border border-white/10 rounded-lg p-3 text-sm text-white focus:border-secondary outline-none appearance-none"
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
                                className="w-full bg-surface border border-white/10 rounded-lg p-3 text-sm text-white focus:border-secondary outline-none appearance-none"
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
                                className="w-full bg-surface border border-white/10 rounded-lg p-3 text-sm text-white focus:border-secondary outline-none appearance-none"
                            >
                                <option value="720p">{t.gen_opt_720p}</option>
                                <option value="1080p">{t.gen_opt_1080p}</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* 5. Watermark (Sora only) */}
                {isSora && (
                    <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                        <span className="text-xs text-gray-300">{t.gen_watermark}</span>
                        <button 
                            onClick={() => setSettings(s => ({ ...s, removeWatermark: !s.removeWatermark }))}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${settings.removeWatermark ? 'bg-secondary' : 'bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.removeWatermark ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                )}
                
                {/* 6. Generate Button */}
                <div className="pt-2">
                    <button
                        onClick={handleQueueClick}
                        className="w-full py-4 bg-primary hover:bg-primaryHover text-black font-bold rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/25 flex items-center justify-center gap-2 group"
                    >
                        <div className="relative">
                            <svg className="w-6 h-6 group-hover:animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <span className="text-sm">{t.gen_queue_btn}</span>
                            <span className="text-[9px] opacity-75 font-normal">{queueLength > 0 ? `${queueLength} tasks in queue` : 'Ready to start'}</span>
                        </div>
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default GeneratorForm;
