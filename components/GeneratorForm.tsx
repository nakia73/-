
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
    <div className="flex flex-col h-full bg-[#0c0c0e]">
      
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
              <div className="bg-[#18181b] border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl">
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
                            className="w-full bg-[#27272a] border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary outline-none"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">{t.adv_meta_label}</label>
                        <textarea
                            value={localMetaContent}
                            onChange={(e) => setLocalMetaContent(e.target.value)}
                            placeholder={t.adv_meta_placeholder}
                            className="w-full h-48 bg-[#27272a] border border-white/10 rounded px-3 py-2 text-xs text-gray-300 focus:border-secondary outline-none resize-none font-mono leading-relaxed custom-scrollbar"
                        />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-white/5">
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
                            <button onClick={handleMetaSave} className="px-6 py-2 bg-secondary hover:bg-cyan-400 text-black text-xs font-bold rounded transition-colors shadow-lg shadow-secondary/20">
                                {localMetaId ? t.modal_update : t.modal_create}
                            </button>
                        </div>
                    </div>
                  </div>
              </div>
          </div>
      )}

      {/* Header Area (Unified Model + Tabs) */}
      <div className="flex-shrink-0 z-20 bg-[#0c0c0e] border-b border-white/5 pb-4">
          
          {/* Title Header (RESTORED) */}
          <div className="px-4 pt-5 pb-2 flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">{t.gen_title}</h2>
          </div>

          {/* Top Model Selector Bar */}
          <div className="px-4 pb-3">
            <div className="bg-[#18181b] border border-white/5 rounded-xl p-3 shadow-inner">
                <div className="flex justify-between items-center mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${modelInfo.color} flex items-center gap-1.5`}>
                       <div className={`w-1.5 h-1.5 rounded-full ${modelInfo.color.replace('text-', 'bg-')}`}></div>
                       {modelInfo.label}
                    </span>
                    <span className="text-[9px] text-gray-500 bg-black/30 px-2 py-0.5 rounded border border-white/5 font-mono">
                       {modelInfo.cost}
                    </span>
                </div>
                
                <select
                    value={settings.model}
                    onChange={(e) => setSettings({...settings, model: e.target.value})}
                    className="w-full bg-[#27272a] hover:bg-[#323238] border border-white/10 rounded-lg p-2.5 text-xs text-white focus:border-secondary outline-none appearance-none transition-colors cursor-pointer"
                >
                    {/* Reordered: Sora 2 First */}
                    <option value="sora-2">{t.gen_model_sora}</option>
                    <option value="sora-2-pro">{t.gen_model_sora_pro}</option>
                    <option value="veo-3.1-fast-generate-preview">{t.gen_model_veo_fast}</option>
                    <option value="veo-3.1-generate-preview">{t.gen_model_veo_hq}</option>
                </select>
            </div>
          </div>

          {/* Mode Tabs */}
          <div className="px-4">
            <div className="flex p-1 bg-[#18181b] rounded-lg border border-white/5">
                <button
                    onClick={() => {
                        setMode('text-to-video');
                        setStartImageUrl('');
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${mode === 'text-to-video' ? 'bg-[#27272a] text-white shadow-sm border border-white/10' : 'text-gray-600 hover:text-gray-400'}`}
                >
                    {t.gen_tab_text}
                </button>
                <button
                    onClick={() => {
                        setMode('image-to-video');
                        setStartImageUrl(''); // Reset
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${mode === 'image-to-video' ? 'bg-[#27272a] text-white shadow-sm border border-white/10' : 'text-gray-600 hover:text-gray-400'}`}
                >
                    {t.gen_tab_image}
                </button>
                <button
                    onClick={() => {
                        setMode('director');
                        // Ensure Sora 2 is selected if logic dictates, but relying on global selector now
                    }}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded-md transition-all ${mode === 'director' ? 'bg-[#27272a] text-white shadow-sm border border-white/10' : 'text-gray-600 hover:text-gray-400'}`}
                >
                    {t.gen_tab_director}
                </button>
            </div>
          </div>
      </div>

      {/* Main Form Content (Scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar bg-[#0c0c0e]">
        {mode === 'director' ? (
            <div className="p-4 h-full">
                <DirectorPanel 
                    apiKeys={apiKeys}
                    geminiApiKey={geminiApiKey}
                    settings={settings}
                    setSettings={setSettings}
                    onExecuteBatch={(scenes) => {
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
            </div>
        ) : (
            <div className="p-4 space-y-6">
                
                {/* 1. Advanced Settings */}
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
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2 pl-1">{t.gen_prompt_label}</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder={t.gen_prompt_placeholder}
                        className="w-full h-32 bg-[#18181b] border border-white/5 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-600 focus:bg-[#202023] focus:border-white/20 outline-none transition-all resize-none"
                    />
                </div>

                {/* 3. Image Uploads */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Start Image */}
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-2 pl-1 truncate">{t.gen_start_frame_url}</label>
                        <div 
                        onClick={() => startFileRef.current?.click()}
                        className={`border border-dashed rounded-xl p-0 h-28 cursor-pointer overflow-hidden relative group transition-all flex flex-col items-center justify-center ${startImageUrl ? 'border-primary/30 bg-primary/5' : 'border-white/10 hover:bg-white/5 hover:border-white/20'}`}
                        >
                        {startImageUrl ? (
                            <>
                                <img src={startImageUrl} alt="Start" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t.common_change}</span>
                                </div>
                            </>
                        ) : (
                            <>
                                {uploading ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mb-2" />
                                ) : (
                                    <svg className="w-6 h-6 text-gray-600 group-hover:text-gray-400 transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                )}
                                <span className="text-[9px] text-gray-600 uppercase tracking-wide">{t.gen_upload_placeholder}</span>
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

                    {/* End Image */}
                    <div>
                        <label className={`text-[10px] font-bold uppercase tracking-wider block mb-2 pl-1 truncate ${isSora ? 'text-gray-700 line-through' : 'text-gray-500'}`}>{t.gen_end_frame_url}</label>
                        <div 
                        onClick={() => !isSora && endFileRef.current?.click()}
                        className={`border border-dashed rounded-xl p-0 h-28 relative group transition-all flex flex-col items-center justify-center ${isSora ? 'border-white/5 bg-black/20 cursor-not-allowed' : 'cursor-pointer border-white/10 hover:bg-white/5 hover:border-white/20'}`}
                        >
                            {endImageUrl ? (
                                <>
                                    <img src={endImageUrl} alt="End" className="w-full h-full object-cover rounded-xl" />
                                    {!isSora && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t.common_change}</span>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <svg className={`w-6 h-6 mb-2 ${isSora ? 'text-gray-800' : 'text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <span className={`text-[9px] uppercase tracking-wide ${isSora ? 'text-gray-800' : 'text-gray-600'}`}>{isSora ? 'N/A' : t.gen_upload_placeholder}</span>
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

                {/* 4. Basic Settings */}
                <div className="grid grid-cols-2 gap-4 bg-[#18181b] p-3 rounded-xl border border-white/5">
                    <div>
                        <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">{t.gen_aspect_ratio}</label>
                        <select 
                            value={settings.aspectRatio}
                            onChange={(e) => setSettings({...settings, aspectRatio: e.target.value as any})}
                            className="w-full bg-[#27272a] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-secondary outline-none appearance-none"
                        >
                            <option value="16:9">{t.gen_opt_landscape}</option>
                            <option value="9:16">{t.gen_opt_portrait}</option>
                        </select>
                    </div>

                    {isSora ? (
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">{t.gen_duration}</label>
                            <select 
                                value={settings.duration}
                                onChange={(e) => setSettings({...settings, duration: e.target.value as any})}
                                className="w-full bg-[#27272a] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-secondary outline-none appearance-none"
                            >
                                <option value="10">{t.gen_opt_10s}</option>
                                <option value="15">{t.gen_opt_15s}</option>
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">{t.gen_resolution}</label>
                            <select 
                                value={settings.resolution}
                                onChange={(e) => setSettings({...settings, resolution: e.target.value as any})}
                                className="w-full bg-[#27272a] border border-white/10 rounded-lg p-2 text-xs text-white focus:border-secondary outline-none appearance-none"
                            >
                                <option value="720p">{t.gen_opt_720p}</option>
                                <option value="1080p">{t.gen_opt_1080p}</option>
                            </select>
                        </div>
                    )}
                </div>

                {/* 5. Watermark (Sora only) */}
                {isSora && (
                    <div className="flex items-center justify-between p-3 bg-[#18181b] rounded-xl border border-white/5">
                        <span className="text-xs text-gray-400 font-medium">{t.gen_watermark}</span>
                        <button 
                            onClick={() => setSettings(s => ({ ...s, removeWatermark: !s.removeWatermark }))}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors ${settings.removeWatermark ? 'bg-secondary' : 'bg-gray-700'}`}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${settings.removeWatermark ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </button>
                    </div>
                )}
                
                {/* 6. Generate Button */}
                <div className="pt-2 pb-6">
                    <button
                        onClick={handleQueueClick}
                        className="w-full py-3.5 bg-primary hover:bg-primaryHover text-black font-bold rounded-xl transition-all hover:translate-y-[-1px] active:translate-y-[1px] shadow-lg shadow-primary/20 flex items-center justify-center gap-3 group"
                    >
                        <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <div className="flex flex-col items-start leading-none">
                            <span className="text-sm tracking-wide">{t.gen_queue_btn}</span>
                            <span className="text-[9px] opacity-70 font-normal mt-0.5 uppercase tracking-wider">{queueLength > 0 ? `${queueLength} pending` : 'Ready'}</span>
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
