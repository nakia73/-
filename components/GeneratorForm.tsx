
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
    const apiKey = getActiveKey();
    if (!apiKey) {
      addToast(t.gen_no_key, 'error');
      return;
    }

    setUploading(true);
    try {
      let fileToUpload = file;
      if (settings.model.startsWith('sora')) {
          addToast(t.gen_processing_img || "Processing image for Sora...", "info");
          fileToUpload = await fitImageToAspectRatio(file, settings.aspectRatio);
      }

      const url = await uploadFileToKie(fileToUpload, apiKey);
      if (isStart) setStartImageUrl(url); else setEndImageUrl(url);
      addToast(t.common_success, "success");
    } catch (error: any) {
      console.error("Upload failed", error);
      addToast(`${t.common_error}: ${error.message}`, "error");
    } finally {
      setUploading(false);
      if (isStart && startFileRef.current) startFileRef.current.value = '';
      if (!isStart && endFileRef.current) endFileRef.current.value = '';
    }
  };

  const handleEnhancePrompt = async () => {
    if (!draftIdea.trim()) {
        addToast("Please enter a draft idea first", "warning");
        return;
    }

    const apiKey = geminiApiKey; 
    if (!apiKey) {
      addToast(t.gen_no_gemini_key || "Gemini API Key required.", 'error');
      return;
    }
    
    setIsEnhancing(true);
    try {
        const active = promptTemplates.find(pt => pt.id === activePromptTemplateId);
        const metaPrompt = active ? active.template : DEFAULT_BASE_SYSTEM_PROMPT;

        const enhanced = await generateEnhancedPrompt(apiKey, draftIdea, promptConfig, enhancerModel, metaPrompt);
        setPrompt(enhanced);
        addToast(t.common_success, "success");
    } catch (error: any) {
        addToast(`${t.common_error}: ${error.message}`, "error");
    } finally {
        setIsEnhancing(false);
    }
  };

  // --- Meta Prompt Modal Logic (Enhanced with full template editing) ---

  const handleTemplateSelectInModal = (id: string) => {
      const tmpl = promptTemplates.find(t => t.id === id);
      if (tmpl) {
          setActivePromptTemplateId(id); // Switch context
          setLocalMetaId(tmpl.id);
          setLocalMetaName(tmpl.name);
          setLocalMetaContent(tmpl.template);
      }
  };

  const handleSaveMetaTemplate = () => {
      if (!localMetaName.trim()) {
          addToast("Template name required", "warning");
          return;
      }
      
      if (localMetaId) {
          updatePromptTemplate(localMetaId, localMetaName, localMetaContent);
          addToast(t.common_success, "success");
      } else {
          addPromptTemplate(localMetaName, localMetaContent);
          addToast(t.common_success, "success");
      }
  };

  const handleSaveAsNew = () => {
      const newName = `${localMetaName} (Copy)`;
      addPromptTemplate(newName, localMetaContent);
      addToast(t.common_success, "success");
  };

  const handleDeleteMetaTemplate = () => {
      if (localMetaId) {
          const tmpl = promptTemplates.find(t => t.id === localMetaId);
          if (tmpl?.isDefault) {
              addToast("Cannot delete default template", "warning");
              return;
          }
          deletePromptTemplate(localMetaId);
          addToast(t.common_success, "info");
          resetMetaEditor();
      }
  };

  const handleSubmit = () => {
    if (mode === 'image-to-video' && !startImageUrl && !prompt) {
      addToast("Please provide an image or prompt", "warning");
      return;
    }
    if (mode === 'text-to-video' && !prompt.trim()) {
      addToast("Please enter a prompt", "warning");
      return;
    }

    onAddToQueue(
      prompt, 
      mode === 'image-to-video' && startImageUrl ? startImageUrl : null, 
      mode === 'image-to-video' && endImageUrl ? endImageUrl : null, 
      settings,
      promptConfig
    );
    setPrompt(''); 
  };

  const handleDirectorExecuteBatch = (scenes: any[]) => {
    scenes.forEach((scene: any) => {
      const sceneImage = scene.imageUrl || null;
      onAddToQueue(scene.prompt, sceneImage, null, settings, directorPromptConfig); 
    });
    addToast(`Queued ${scenes.length} scenes for batch generation!`, "success");
  };

  const handleModelSelection = (newModel: string) => {
    const isHighCost = newModel === 'veo-3.1-generate-preview' || newModel === 'sora-2-pro';
    if (isHighCost && !suppressQualityWarning) {
        setShowQualityWarning(true);
    }
    setSettings(s => ({ ...s, model: newModel }));
  };

  const handleQualityConfirm = (dontShowAgain: boolean) => {
    setShowQualityWarning(false);
    if (dontShowAgain) {
        setSuppressQualityWarning(true);
        setTimeout(() => handleSaveSettings(), 100);
    }
  };

  const currentModelInfo = getModelInfo(settings.model);
  const isSora = settings.model.startsWith('sora');
  const isPro = settings.model.includes('pro');

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Modals */}
      <QualityWarningModal 
         isOpen={showQualityWarning} 
         onClose={() => setShowQualityWarning(false)}
         onConfirm={handleQualityConfirm}
         t={t}
      />

      {/* Meta Prompt Modal (Full Featured Template Editor) */}
      {showMetaModal && (
         <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">{localMetaId ? t.dir_tmpl_edit : t.modal_new_tmpl}</h3>
                  <button onClick={() => setShowMetaModal(false)} className="text-gray-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               
               {/* Template Switcher Inside Modal */}
               <div className="mb-4 flex gap-2">
                   <select 
                       value={localMetaId || ''}
                       onChange={(e) => handleTemplateSelectInModal(e.target.value)}
                       className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-2 text-sm text-white focus:border-secondary outline-none"
                   >
                       <option value="" disabled>{t.modal_select_edit}</option>
                       {promptTemplates.map(pt => (
                           <option key={pt.id} value={pt.id}>
                               {pt.name} {pt.isDefault ? t.dir_tmpl_default : ''}
                           </option>
                       ))}
                   </select>
                   <button 
                       onClick={resetMetaEditor}
                       className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-xs text-gray-300 whitespace-nowrap"
                       title="Create New Template"
                   >
                       {t.modal_new_tmpl}
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
                            placeholder="Template Name"
                       />
                   </div>
                   
                   <div>
                        <label className="text-xs text-gray-400 block mb-1">{t.adv_meta_label}</label>
                        <textarea 
                            value={localMetaContent}
                            onChange={(e) => setLocalMetaContent(e.target.value)}
                            className="w-full h-48 bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-gray-300 focus:border-secondary outline-none resize-none font-mono leading-relaxed"
                            placeholder={t.adv_meta_placeholder}
                        />
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        {localMetaId && !promptTemplates.find(t => t.id === localMetaId)?.isDefault && (
                            <button 
                                onClick={handleDeleteMetaTemplate}
                                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded hover:bg-red-500/10"
                            >
                                {t.dir_tmpl_delete}
                            </button>
                        )}
                        
                        <div className="flex-1 flex gap-2 justify-end">
                            {localMetaId && (
                                <button 
                                    onClick={handleSaveAsNew}
                                    className="px-4 py-2 text-xs text-gray-300 hover:text-white border border-white/10 rounded hover:bg-white/5"
                                >
                                    {t.modal_save_as_new}
                                </button>
                            )}
                            <button 
                                onClick={handleSaveMetaTemplate}
                                className="px-6 py-2 bg-secondary text-black text-xs font-bold rounded shadow-lg shadow-secondary/20 hover:bg-cyan-400 transition-colors"
                            >
                                {localMetaId ? t.modal_update : t.modal_create}
                            </button>
                        </div>
                    </div>
               </div>
            </div>
         </div>
      )}

      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-background/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center gap-6 w-full">
          <div className="relative group flex-1">
            <button className="w-full flex items-center justify-between bg-surface hover:bg-surfaceHighlight border border-white/10 px-3 py-2 rounded-lg text-sm text-white transition-colors">
              <span className={`truncate font-bold ${currentModelInfo.color}`}>
                {currentModelInfo.label}
              </span>
              <svg className="w-4 h-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div className="absolute top-full left-0 mt-1 w-full bg-surface border border-white/10 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
              {[
                  'veo-3.1-fast-generate-preview', 
                  'veo-3.1-generate-preview',
                  'sora-2',
                  'sora-2-pro'
              ].map((m, i) => {
                  const info = getModelInfo(m);
                  return (
                    <button 
                        key={m}
                        onClick={() => handleModelSelection(m)}
                        className={`w-full text-left px-4 py-3 hover:bg-white/5 text-sm text-white flex flex-col ${i > 0 ? 'border-t border-white/5' : ''}`}
                    >
                        <div className="flex justify-between items-center w-full mb-1">
                        <span className={`font-medium ${info.color}`}>{info.label}</span>
                        <span className="text-[10px] bg-white/5 text-gray-400 px-1.5 rounded border border-white/10 whitespace-nowrap">{info.cost}</span>
                        </div>
                        <span className="text-xs text-gray-500">{info.desc}</span>
                    </button>
                  );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pt-4 flex gap-6 text-sm font-medium border-b border-white/5">
        <button 
          onClick={() => setMode('text-to-video')}
          className={`pb-3 relative transition-colors ${mode === 'text-to-video' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          {t.gen_tab_text}
          {mode === 'text-to-video' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>}
        </button>
        <button 
          onClick={() => setMode('image-to-video')}
          className={`pb-3 relative transition-colors ${mode === 'image-to-video' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
          {t.gen_tab_image}
          {mode === 'image-to-video' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>}
        </button>
        <button 
          onClick={() => setMode('director')}
          className={`pb-3 relative transition-colors ${mode === 'director' ? 'text-secondary' : 'text-gray-500 hover:text-gray-300'}`}
        >
          {t.gen_tab_director}
          {mode === 'director' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-secondary shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {mode === 'director' ? (
          <DirectorPanel 
            apiKeys={apiKeys}
            geminiApiKey={geminiApiKey}
            settings={settings}
            // Pass setter to allow Director Panel to modify settings (Aspect, Resolution, etc.)
            setSettings={setSettings}
            onExecuteBatch={handleDirectorExecuteBatch}
            
            // Pass SEPARATED config to DirectorPanel
            promptConfig={directorPromptConfig}
            setPromptConfig={setDirectorPromptConfig}
            
            // Pass Meta props
            activePromptTemplateName={promptTemplates.find(t => t.id === activePromptTemplateId)?.name || 'Meta Prompt'}
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
          <>
            {/* Mode Specific Inputs */}
            {mode === 'image-to-video' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">{t.gen_start_frame_url}</label>
                  <div 
                    className="border border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:bg-white/5 transition-colors relative"
                    onClick={() => startFileRef.current?.click()}
                  >
                     {startImageUrl ? (
                        <div className="relative h-32 w-full">
                           <img src={startImageUrl} className="w-full h-full object-contain rounded" alt="Start frame" />
                           <div className="absolute top-0 right-0 bg-black/50 p-1 rounded text-xs text-white">{t.common_change}</div>
                        </div>
                     ) : (
                        <div className="text-gray-500 text-sm">
                          {uploading ? t.gen_uploading : t.gen_upload_placeholder}
                        </div>
                     )}
                  </div>
                  <input 
                    type="file" 
                    ref={startFileRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                  />
                </div>

                {!isSora && (
                    <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">{t.gen_end_frame_url}</label>
                    <div 
                        className="border border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:bg-white/5 transition-colors"
                        onClick={() => endFileRef.current?.click()}
                    >
                        {endImageUrl ? (
                            <div className="relative h-32 w-full">
                            <img src={endImageUrl} className="w-full h-full object-contain rounded" alt="End frame" />
                            <div className="absolute top-0 right-0 bg-black/50 p-1 rounded text-xs text-white">{t.common_change}</div>
                            </div>
                        ) : (
                            <div className="text-gray-500 text-sm">
                            {uploading ? t.gen_uploading : t.gen_upload_placeholder}
                            </div>
                        )}
                    </div>
                    <input 
                        type="file" 
                        ref={endFileRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], false)}
                    />
                    </div>
                )}
              </div>
            )}

            {/* Advanced Prompt Settings Panel (Prompt Creation) */}
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
                
                activePromptTemplateName={promptTemplates.find(t => t.id === activePromptTemplateId)?.name || 'Default'}
                onOpenMetaModal={() => setShowMetaModal(true)}
                
                mode={mode}
            />

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">{t.gen_prompt_label}</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t.gen_prompt_placeholder}
                  className="w-full h-32 bg-surface border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">{t.gen_aspect_ratio}</label>
                  <select 
                    value={settings.aspectRatio}
                    onChange={(e) => setSettings({...settings, aspectRatio: e.target.value as any})}
                    className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none appearance-none"
                  >
                    <option value="16:9">{t.gen_opt_landscape}</option>
                    <option value="9:16">{t.gen_opt_portrait}</option>
                  </select>
                </div>

                {isSora ? (
                    <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">{t.gen_duration}</label>
                    <select 
                        value={settings.duration}
                        onChange={(e) => setSettings({...settings, duration: e.target.value as any})}
                        className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none appearance-none"
                    >
                        <option value="10">{t.gen_opt_10s}</option>
                        <option value="15">{t.gen_opt_15s}</option>
                    </select>
                    </div>
                ) : (
                    <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">{t.gen_resolution}</label>
                    <select 
                        value={settings.resolution}
                        onChange={(e) => setSettings({...settings, resolution: e.target.value as any})}
                        className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none appearance-none"
                    >
                        <option value="720p">{t.gen_opt_720p}</option>
                        <option value="1080p">{t.gen_opt_1080p}</option>
                    </select>
                    </div>
                )}
              </div>
              
              {isPro && (
                 <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">{t.gen_quality}</label>
                    <select 
                        value={settings.size}
                        onChange={(e) => setSettings({...settings, size: e.target.value as any})}
                        className="w-full bg-surface border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-primary outline-none appearance-none"
                    >
                        <option value="standard">{t.gen_opt_std}</option>
                        <option value="high">{t.gen_opt_hq}</option>
                    </select>
                 </div>
              )}
              
              {isSora && (
                 <div className="flex items-center gap-2 pt-2">
                    <input 
                        type="checkbox"
                        checked={settings.removeWatermark ?? true}
                        onChange={(e) => setSettings({...settings, removeWatermark: e.target.checked})}
                        className="w-4 h-4 rounded border-white/20 bg-black/50 checked:bg-primary text-primary focus:ring-0"
                    />
                    <span className="text-xs text-gray-300">{t.gen_watermark}</span>
                 </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={mode === 'image-to-video' && !startImageUrl && !prompt}
                className="w-full py-4 bg-primary hover:bg-primaryHover text-black font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-4"
              >
                <span>{t.gen_queue_btn}</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GeneratorForm;
