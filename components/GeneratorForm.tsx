
import React, { useState, useRef, useEffect } from 'react';
import { VideoSettings, ApiKeyData, Translation, DirectorTemplate, PromptConfig, PromptTemplate } from '../types';
import { uploadFileToKie } from '../services/uploadService';
import { fitImageToAspectRatio } from '../services/imageProcessing';
import { generateEnhancedPrompt, ENHANCER_MODELS, DEFAULT_BASE_SYSTEM_PROMPT } from '../services/promptService';
import { useToast } from './ToastContext';
import DirectorPanel from './DirectorPanel';
import QualityWarningModal from './QualityWarningModal';

interface GeneratorFormProps {
  onAddToQueue: (prompt: string, startImageUrl: string | null, endImageUrl: string | null, settings: VideoSettings, promptConfig?: PromptConfig) => void;
  queueLength: number;
  apiKeys: ApiKeyData[];
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
  onAddToQueue, queueLength, apiKeys, 
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
  const [localMetaId, setLocalMetaId] = useState<string | null>(null); // If ID exists, we are editing
  
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

  const [promptConfig, setPromptConfig] = useState<PromptConfig>({
    language: 'ja',
    enableText: false,
    audioMode: 'off',
    enableJsonTiming: false,
    imageReferenceMode: 'animate'
  });

  // Sync local state when active template changes
  useEffect(() => {
      const active = promptTemplates.find(pt => pt.id === activePromptTemplateId);
      if (active) {
          setLocalMetaContent(active.template);
          setLocalMetaName(active.name);
          setLocalMetaId(active.id);
      } else if (promptTemplates.length > 0) {
          // Fallback if active ID is invalid
          setLocalMetaContent(promptTemplates[0].template);
          setLocalMetaName(promptTemplates[0].name);
          setLocalMetaId(promptTemplates[0].id);
      } else {
          // Fallback default
          setLocalMetaContent(DEFAULT_BASE_SYSTEM_PROMPT);
      }
  }, [activePromptTemplateId, promptTemplates]);

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
      addToast("Image uploaded successfully", "success");
    } catch (error: any) {
      console.error("Upload failed", error);
      addToast(`Upload failed: ${error.message}`, "error");
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
    
    setIsEnhancing(true);
    try {
        const active = promptTemplates.find(pt => pt.id === activePromptTemplateId);
        const metaPrompt = active ? active.template : DEFAULT_BASE_SYSTEM_PROMPT;

        const enhanced = await generateEnhancedPrompt(draftIdea, promptConfig, enhancerModel, metaPrompt);
        setPrompt(enhanced);
        addToast("Prompt generated and applied!", "success");
    } catch (error: any) {
        addToast("Generation failed: " + error.message, "error");
    } finally {
        setIsEnhancing(false);
    }
  };

  const handleSaveMetaTemplate = () => {
      if (!localMetaName.trim()) {
          addToast("Template name required", "warning");
          return;
      }
      
      if (localMetaId) {
          updatePromptTemplate(localMetaId, localMetaName, localMetaContent);
          addToast("Template updated", "success");
      } else {
          // If ID is null, user wants to save as new
          addPromptTemplate(localMetaName, localMetaContent);
          addToast("New template saved", "success");
      }
      // Don't close modal, just confirm save
  };

  const handleSaveAsNew = () => {
      const newName = `${localMetaName} (Copy)`;
      addPromptTemplate(newName, localMetaContent);
      addToast("Saved as new template", "success");
  };

  const handleDeleteMetaTemplate = () => {
      if (localMetaId) {
          const tmpl = promptTemplates.find(t => t.id === localMetaId);
          if (tmpl?.isDefault) {
              addToast("Cannot delete default template", "warning");
              return;
          }
          deletePromptTemplate(localMetaId);
          addToast("Template deleted", "info");
          // Reset to default will happen via useEffect
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
      onAddToQueue(scene.prompt, sceneImage, null, settings, undefined);
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

      {/* Meta Prompt Modal */}
      {showMetaModal && (
         <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-surface border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-white">{t.adv_meta_label}</h3>
                  <button onClick={() => setShowMetaModal(false)} className="text-gray-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               
               {/* Template Selection */}
               <div className="mb-4">
                   <label className="text-xs text-gray-400 block mb-1">Select Template</label>
                   <div className="flex gap-2">
                       <select 
                           value={activePromptTemplateId}
                           onChange={(e) => setActivePromptTemplateId(e.target.value)}
                           className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-2 text-sm text-white focus:border-secondary outline-none"
                       >
                           {promptTemplates.map(pt => (
                               <option key={pt.id} value={pt.id}>
                                   {pt.name} {pt.isDefault ? '(Default)' : ''}
                               </option>
                           ))}
                       </select>
                       <button 
                           onClick={() => {
                               // Create new empty
                               setLocalMetaId(null);
                               setLocalMetaName('New Template');
                               setLocalMetaContent('You are a prompt engineer...');
                               addToast("Start editing new template", "info");
                           }}
                           className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-xs text-gray-300"
                           title="New Template"
                       >
                           + New
                       </button>
                   </div>
               </div>

               <div className="mb-2">
                   <label className="text-xs text-gray-400 block mb-1">Template Name</label>
                   <input 
                        type="text"
                        value={localMetaName}
                        onChange={(e) => setLocalMetaName(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-secondary outline-none"
                        placeholder="Template Name"
                   />
               </div>
               
               <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                  {t.adv_meta_placeholder}
               </p>

               <textarea 
                    value={localMetaContent}
                    onChange={(e) => setLocalMetaContent(e.target.value)}
                    className="w-full h-48 bg-black/40 border border-white/10 rounded p-3 text-xs text-gray-300 focus:border-secondary outline-none resize-none font-mono leading-relaxed mb-4"
                />

                <div className="flex gap-3 pt-2 border-t border-white/5">
                    {localMetaId && !promptTemplates.find(t => t.id === localMetaId)?.isDefault && (
                        <button 
                            onClick={handleDeleteMetaTemplate}
                            className="px-3 py-2 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded hover:bg-red-500/10"
                        >
                            Delete
                        </button>
                    )}
                    
                    <div className="flex-1 flex gap-2 justify-end">
                        {localMetaId && (
                            <button 
                                onClick={handleSaveAsNew}
                                className="px-4 py-2 text-xs text-gray-300 hover:text-white border border-white/10 rounded hover:bg-white/5"
                            >
                                Save as New
                            </button>
                        )}
                        <button 
                            onClick={handleSaveMetaTemplate}
                            className="px-6 py-2 bg-secondary text-black text-xs font-bold rounded shadow-lg shadow-secondary/20 hover:bg-cyan-400 transition-colors"
                        >
                            {localMetaId ? 'Update' : 'Save'}
                        </button>
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
            settings={settings}
            onExecuteBatch={handleDirectorExecuteBatch}
            
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
                           <div className="absolute top-0 right-0 bg-black/50 p-1 rounded text-xs text-white">Change</div>
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
                            <div className="absolute top-0 right-0 bg-black/50 p-1 rounded text-xs text-white">Change</div>
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

                {/* Advanced Prompt Settings Panel */}
                <div className="bg-surface border border-white/10 rounded-lg overflow-hidden">
                   <button 
                     onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                     className="w-full flex items-center justify-between p-3 hover:bg-white/5 transition-colors"
                   >
                     <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                        <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        {t.adv_title}
                     </span>
                     <svg className={`w-4 h-4 text-gray-500 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                     </svg>
                   </button>
                   
                   {showAdvancedSettings && (
                     <div className="p-3 border-t border-white/5 space-y-3 bg-black/20 animate-fade-in">
                        
                        {/* Compact Prompt Generator Section */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-secondary flex items-center gap-2">
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    {t.adv_gen_section}
                                </h4>
                                <button 
                                    onClick={() => setShowMetaModal(true)}
                                    className="text-[10px] text-gray-500 hover:text-white hover:underline cursor-pointer flex items-center gap-1"
                                >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    {/* Display current template name */}
                                    {promptTemplates.find(t => t.id === activePromptTemplateId)?.name || 'Meta Prompt'}
                                </button>
                            </div>

                            <textarea 
                                value={draftIdea}
                                onChange={(e) => setDraftIdea(e.target.value)}
                                placeholder={t.adv_draft_placeholder}
                                className="w-full h-12 bg-surfaceHighlight border border-white/10 rounded p-2 text-xs text-white focus:border-primary outline-none resize-none"
                            />

                            <div className="flex gap-2">
                                <select
                                    value={enhancerModel}
                                    onChange={(e) => setEnhancerModel(e.target.value)}
                                    className="bg-black/40 border border-white/10 rounded text-[10px] text-gray-400 px-2 focus:border-primary outline-none w-1/3"
                                >
                                    {ENHANCER_MODELS.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={handleEnhancePrompt}
                                    disabled={isEnhancing || !draftIdea.trim()}
                                    className="flex-1 flex items-center justify-center gap-2 bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 py-1.5 rounded text-xs text-secondary font-bold transition-colors disabled:opacity-50"
                                >
                                    {isEnhancing ? (
                                        <div className="w-3 h-3 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        t.adv_btn_generate
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Configuration Toggles (Compact Grid) */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                           <div>
                             <label className="text-[10px] text-gray-500 block mb-1">{t.adv_lang}</label>
                             <select 
                                value={promptConfig.language}
                                onChange={(e) => setPromptConfig(c => ({ ...c, language: e.target.value as 'ja' | 'en' }))}
                                className="w-full bg-black/40 border border-white/10 rounded p-1 text-xs text-white focus:border-secondary outline-none"
                             >
                                <option value="ja">{t.adv_lang_ja}</option>
                                <option value="en">{t.adv_lang_en}</option>
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
                                    {(['off', 'narration', 'dialogue'] as const).map((mode) => (
                                        <button
                                        key={mode}
                                        onClick={() => setPromptConfig(c => ({ ...c, audioMode: mode }))}
                                        className={`flex-1 py-0.5 rounded text-[10px] transition-colors ${
                                            promptConfig.audioMode === mode 
                                            ? 'bg-white/10 text-white font-bold' 
                                            : 'text-gray-500 hover:text-gray-300'
                                        }`}
                                        >
                                        {mode === 'off' ? t.adv_audio_off : mode === 'narration' ? t.adv_audio_narration : t.adv_audio_dialogue}
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
                   )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                 <label className="text-xs text-gray-400 font-medium">{t.gen_prompt_label}</label>
              </div>
              
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.gen_prompt_placeholder}
                className="w-full h-32 bg-surface border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
              />
            </div>
          </>
        )}

        {/* Video Settings - Always Visible */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
            <div>
                <label className="block text-xs text-gray-500 mb-2">{t.gen_aspect_ratio}</label>
                <div className="flex bg-surface rounded-lg p-1 border border-white/5">
                    {['16:9', '9:16'].map((ratio) => (
                        <button
                        key={ratio}
                        onClick={() => setSettings(s => ({ ...s, aspectRatio: ratio as any }))}
                        className={`flex-1 py-2 text-xs font-medium rounded transition-all ${settings.aspectRatio === ratio ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                        {isSora ? (ratio === '16:9' ? 'Landscape' : 'Portrait') : ratio}
                        </button>
                    ))}
                </div>
            </div>

            {!isSora && (
                <div>
                    <label className="block text-xs text-gray-500 mb-2">{t.gen_resolution}</label>
                    <div className="flex bg-surface rounded-lg p-1 border border-white/5">
                        {['720p', '1080p'].map((res) => (
                            <button
                            key={res}
                            onClick={() => setSettings(s => ({ ...s, resolution: res as any }))}
                            className={`flex-1 py-2 text-xs font-medium rounded transition-all ${settings.resolution === res ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                            {res}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isSora && (
                <div>
                    <label className="block text-xs text-gray-500 mb-2">{t.gen_duration}</label>
                    <div className="flex bg-surface rounded-lg p-1 border border-white/5">
                        {['10', '15'].map((sec) => (
                            <button
                            key={sec}
                            onClick={() => setSettings(s => ({ ...s, duration: sec as any }))}
                            className={`flex-1 py-2 text-xs font-medium rounded transition-all ${settings.duration === sec ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                            {sec}s
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {isPro && (
                <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-2">{t.gen_quality}</label>
                    <div className="flex bg-surface rounded-lg p-1 border border-white/5">
                        {['standard', 'high'].map((sz) => (
                            <button
                            key={sz}
                            onClick={() => setSettings(s => ({ ...s, size: sz as any }))}
                            className={`flex-1 py-2 text-xs font-medium rounded transition-all ${settings.size === sz ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                            {sz}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {isSora && (
                <div className="col-span-2 flex items-center justify-between bg-surface rounded-lg p-3 border border-white/5">
                    <span className="text-xs text-gray-400 font-medium">{t.gen_watermark}</span>
                    <button
                        onClick={() => setSettings(s => ({ ...s, removeWatermark: !s.removeWatermark }))}
                        className={`w-10 h-5 rounded-full p-0.5 transition-colors ${settings.removeWatermark ? 'bg-primary' : 'bg-gray-700'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${settings.removeWatermark ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                </div>
            )}
        </div>
      </div>

      {mode !== 'director' && (
        <div className="p-6 border-t border-white/5 bg-background/50 backdrop-blur-sm mt-auto">
          <button
            onClick={handleSubmit}
            disabled={uploading}
            className="w-full py-3.5 rounded-xl font-semibold text-black text-sm transition-all duration-200 bg-primary hover:bg-primaryHover shadow-[0_0_20px_rgba(190,242,100,0.3)] hover:shadow-[0_0_30px_rgba(190,242,100,0.5)] transform active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
             <span>{uploading ? t.gen_uploading : t.gen_queue_btn}</span>
             {queueLength > 0 && <span className="bg-black/20 px-2 py-0.5 rounded-full text-xs font-bold">{queueLength}</span>}
          </button>
        </div>
      )}
    </div>
  );
};

export default GeneratorForm;
