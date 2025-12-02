
import React, { useState, useRef, useEffect } from 'react';
import { VideoSettings, DirectorScene, Translation, ApiKeyData, DirectorTemplate, PromptConfig } from '../types';
import { generateScenePlan } from '../services/planningService';
import { uploadFileToKie } from '../services/uploadService';
import { useToast } from './ToastContext';
import AdvancedSettingsPanel from './AdvancedSettingsPanel';

interface DirectorPanelProps {
  apiKeys: ApiKeyData[];
  geminiApiKey?: string; // Dedicated Key
  settings: VideoSettings;
  setSettings: React.Dispatch<React.SetStateAction<VideoSettings>>; // Allow modifying global settings
  onExecuteBatch: (scenes: DirectorScene[]) => void;
  
  // Config passed from parent
  promptConfig: PromptConfig;
  setPromptConfig: React.Dispatch<React.SetStateAction<PromptConfig>>;
  
  // Meta Props for Panel
  activePromptTemplateName: string;
  onOpenMetaModal: () => void;
  
  directorTemplates: DirectorTemplate[];
  activeTemplateId: string;
  setActiveTemplateId: (id: string) => void;
  addTemplate: (name: string, prompt: string) => void;
  updateTemplate: (id: string, name: string, prompt: string) => void;
  deleteTemplate: (id: string) => void;

  t: Translation;
}

type DirectorState = 'input' | 'planning' | 'review';

const DirectorPanel: React.FC<DirectorPanelProps> = ({ 
  apiKeys, geminiApiKey, settings, setSettings, onExecuteBatch, 
  promptConfig, setPromptConfig, activePromptTemplateName, onOpenMetaModal,
  directorTemplates, activeTemplateId, setActiveTemplateId, addTemplate, updateTemplate, deleteTemplate,
  t 
}) => {
  const { addToast } = useToast();
  const [directorState, setDirectorState] = useState<DirectorState>('input');
  const [directorIdea, setDirectorIdea] = useState('');
  const [directorCount, setDirectorCount] = useState(10);
  const [directorScenes, setDirectorScenes] = useState<DirectorScene[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  const [directorImage, setDirectorImage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Config Enable Toggle for Director Mode (Detail)
  const [isConfigEnabled, setIsConfigEnabled] = useState(false); 
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(true);

  // Template Editing State
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editTmplName, setEditTmplName] = useState('');
  const [editTmplPrompt, setEditTmplPrompt] = useState('');
  const [editTmplId, setEditTmplId] = useState<string | null>(null); 

  const handleImageUpload = async (file: File) => {
    const activeKey = apiKeys.find(k => k.key && k.key.length > 10 && k.status !== 'error')?.key;
    if (!activeKey) {
      addToast(t.gen_no_key, "error");
      return;
    }

    setUploadingImage(true);
    try {
      const url = await uploadFileToKie(file, activeKey);
      setDirectorImage(url);
      addToast(t.common_success, "success");
    } catch (error: any) {
      addToast(`${t.common_error}: ${error.message}`, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDirectorPlan = async (activeKey: string) => {
    setDirectorState('planning');
    try {
      const selectedTemplate = directorTemplates.find(tmpl => tmpl.id === activeTemplateId);
      const systemPrompt = selectedTemplate?.systemPrompt;

      // Pass config only if enabled
      const configToPass = isConfigEnabled ? promptConfig : undefined;

      // Use the API key from the user's input in App, passed down or fetched here if we changed flow.
      const keyToUse = geminiApiKey || activeKey; // Fallback to Kie key if no Gemini key
      
      if (!keyToUse) {
           throw new Error("No valid API Key available for planning.");
      }

      const scenes = await generateScenePlan(keyToUse, directorIdea, directorCount, systemPrompt, configToPass);
      
      const scenesWithImage = scenes.map(s => ({
          ...s,
          imageUrl: directorImage || undefined
      }));
      
      setDirectorScenes(scenesWithImage);
      setDirectorState('review');
      addToast(t.common_success, "success");
    } catch (e: any) {
      console.error(e);
      addToast(`${t.common_error}: ${e.message}`, "error");
      setDirectorState('input');
    }
  };

  const handleUpdateScene = (id: string, newPrompt: string) => {
    setDirectorScenes(prev => prev.map(s => s.id === id ? { ...s, prompt: newPrompt } : s));
  };

  const handleToggleSceneImage = (id: string) => {
      setDirectorScenes(prev => prev.map(s => {
          if (s.id !== id) return s;
          return {
              ...s,
              imageUrl: s.imageUrl ? undefined : directorImage
          };
      }));
  };

  const handleDeleteScene = (id: string) => {
    setDirectorScenes(prev => prev.filter(s => s.id !== id));
  };

  // Modal Logic
  const openTemplateEditor = () => {
      // Load active template initially
      const active = directorTemplates.find(t => t.id === activeTemplateId);
      if (active) {
         loadTemplateToEditor(active);
      } else {
         resetTemplateEditor();
      }
      setIsEditingTemplate(true);
  };

  const loadTemplateToEditor = (tmpl: DirectorTemplate) => {
      setEditTmplId(tmpl.id);
      setEditTmplName(tmpl.name);
      setEditTmplPrompt(tmpl.systemPrompt);
  };

  const resetTemplateEditor = () => {
      setEditTmplId(null);
      setEditTmplName('New Custom Prompt');
      setEditTmplPrompt('You are a...');
  };

  const handleTemplateSelectInModal = (id: string) => {
      const tmpl = directorTemplates.find(t => t.id === id);
      if (tmpl) loadTemplateToEditor(tmpl);
  };

  const saveTemplate = () => {
      if (editTmplId) {
          updateTemplate(editTmplId, editTmplName, editTmplPrompt);
          addToast(t.common_success, "success");
      } else {
          addTemplate(editTmplName, editTmplPrompt);
          addToast(t.common_success, "success");
      }
      setIsEditingTemplate(false);
  };

  const saveAsNewTemplate = () => {
      const newName = `${editTmplName} (Copy)`;
      addTemplate(newName, editTmplPrompt);
      addToast(t.common_success, "success");
      setIsEditingTemplate(false);
  };

  const deleteCurrentTemplate = () => {
      if (editTmplId) {
          const tmpl = directorTemplates.find(t => t.id === editTmplId);
          if (tmpl?.isDefault) {
              addToast("Cannot delete default template", "warning");
              return;
          }
          deleteTemplate(editTmplId);
          addToast(t.common_success, "info");
          resetTemplateEditor(); // Reset after delete
      }
  };

  const isSora = settings.model.startsWith('sora');

  const { cost: estCost, dollar: estDollar } = (() => {
    const count = directorScenes.length;
    let cost = 0;
    if (settings.model.startsWith('sora')) {
        const baseRate = settings.model === 'sora-2-pro' ? 250 : 30;
        const durationMultiplier = settings.duration === '15' ? 1.5 : 1.0;
        cost = count * (baseRate * durationMultiplier);
    } else if (settings.model.includes('fast')) {
        cost = count * 60;
    } else {
        cost = count * 250;
    }
    const dollar = cost * 0.005;
    return { cost, dollar };
  })();

  return (
    <>
      {/* Template Editor Modal */}
      {isEditingTemplate && (
         <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-surface border border-white/10 rounded-xl p-6 max-w-lg w-full shadow-2xl">
                 <div className="flex justify-between items-center mb-4">
                     <h3 className="text-sm font-bold text-white">{editTmplId ? t.dir_tmpl_edit : t.modal_new_tmpl}</h3>
                     <button onClick={() => setIsEditingTemplate(false)} className="text-gray-400 hover:text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                 </div>
                 
                 {/* Switcher inside Modal */}
                 <div className="mb-4 flex gap-2">
                     <select 
                        value={editTmplId || ''}
                        onChange={(e) => handleTemplateSelectInModal(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-white focus:border-secondary outline-none"
                     >
                         <option value="" disabled>{t.modal_select_edit}</option>
                         {directorTemplates.map(tmpl => (
                             <option key={tmpl.id} value={tmpl.id}>{tmpl.name} {tmpl.isDefault ? t.dir_tmpl_default : ''}</option>
                         ))}
                     </select>
                     <button 
                        onClick={resetTemplateEditor}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-gray-300 border border-white/10"
                     >
                        {t.modal_new_tmpl}
                     </button>
                 </div>

                 <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">{t.dir_tmpl_name}</label>
                        <input 
                            type="text" 
                            value={editTmplName}
                            onChange={(e) => setEditTmplName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-secondary outline-none"
                        />
                    </div>
                    
                    <div>
                        <label className="text-xs text-gray-400 block mb-1">{t.dir_tmpl_prompt}</label>
                        <textarea
                            value={editTmplPrompt}
                            onChange={(e) => setEditTmplPrompt(e.target.value)}
                            className="w-full h-48 bg-black/40 border border-white/10 rounded px-3 py-2 text-xs text-gray-300 focus:border-secondary outline-none resize-none font-mono leading-relaxed"
                        />
                    </div>

                    <div className="flex gap-3 pt-2 border-t border-white/5">
                        {editTmplId && !directorTemplates.find(t => t.id === editTmplId)?.isDefault && (
                            <button 
                                onClick={deleteCurrentTemplate}
                                className="px-3 py-2 text-xs text-red-400 hover:text-red-300 border border-red-500/30 rounded hover:bg-red-500/10"
                            >
                                {t.dir_tmpl_delete}
                            </button>
                        )}

                        <div className="flex-1 flex gap-2 justify-end">
                            {editTmplId && (
                                <button 
                                    onClick={saveAsNewTemplate}
                                    className="px-4 py-2 text-xs text-gray-300 hover:text-white border border-white/10 rounded hover:bg-white/5"
                                >
                                    {t.modal_save_as_new}
                                </button>
                            )}
                            <button onClick={saveTemplate} className="px-6 py-2 bg-secondary text-black text-xs font-bold rounded hover:bg-cyan-400 transition-colors">
                                {editTmplId ? t.modal_update : t.modal_create}
                            </button>
                        </div>
                    </div>
                 </div>
             </div>
         </div>
      )}

      {/* Main Content */}
      {directorState === 'input' && (
        <div className="space-y-6 flex flex-col h-full">
          
          <div className="flex-1 space-y-6 overflow-y-auto pr-2">
              
              {/* 1. CUSTOM PROMPT (Moved to TOP) */}
              <div>
                  <div className="flex justify-between items-center mb-2">
                  <label className="text-xs text-gray-400 font-medium">{t.dir_persona_label}</label>
                  <button 
                      onClick={() => openTemplateEditor()}
                      className="text-[10px] text-secondary hover:underline flex items-center gap-1"
                  >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      {t.dir_tmpl_edit}
                  </button>
                  </div>
                  <select 
                  value={activeTemplateId}
                  onChange={(e) => setActiveTemplateId(e.target.value)}
                  className="w-full bg-surface border border-white/10 rounded-lg p-2 text-sm text-white focus:border-secondary outline-none appearance-none"
                  >
                      {directorTemplates.map(tmpl => (
                          <option key={tmpl.id} value={tmpl.id}>{tmpl.name} {tmpl.isDefault ? t.dir_tmpl_default : ''}</option>
                      ))}
                  </select>
              </div>

              {/* 2. CONCEPT (IDEA) INPUT */}
              <div>
                  <label className="text-xs text-gray-400 font-medium block mb-2">{t.dir_concept_label}</label>
                  <textarea
                      value={directorIdea}
                      onChange={(e) => setDirectorIdea(e.target.value)}
                      placeholder={t.dir_idea_placeholder}
                      className="w-full h-24 bg-surface border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
                  />
              </div>

              {/* 3. IMAGE UPLOAD & STRATEGY */}
              <div>
                  <label className="text-xs text-gray-400 font-medium block mb-2">{t.dir_image_label}</label>
                  <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-dashed border-white/20 rounded-lg p-4 text-center cursor-pointer hover:bg-white/5 transition-colors relative flex flex-col items-center justify-center gap-2 min-h-[80px]"
                  >
                      {directorImage ? (
                          <div className="relative w-full">
                              <img src={directorImage} alt="Ref" className="max-h-32 mx-auto rounded shadow-lg" />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/60 transition-opacity rounded">
                                  <span className="text-xs font-bold text-white">{t.dir_img_change}</span>
                              </div>
                          </div>
                      ) : (
                          <>
                              {uploadingImage ? (
                                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                  <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              )}
                              <span className="text-xs text-gray-600">{uploadingImage ? t.gen_uploading : t.dir_image_desc}</span>
                          </>
                      )}
                  </div>
                  <input 
                      ref={fileInputRef}
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  />

                  {/* Image Strategy Toggle (Director Mode) */}
                  {directorImage && (
                      <div className="mt-2 pt-2 border-t border-white/5">
                          <label className="text-[10px] text-gray-400 block mb-1">{t.dir_img_strategy}</label>
                          <div className="flex bg-black/40 rounded p-0.5 border border-white/10">
                              <button
                                  onClick={() => setPromptConfig(c => ({ ...c, imageReferenceMode: 'animate' }))}
                                  className={`flex-1 py-1 rounded text-[10px] transition-colors ${
                                      promptConfig.imageReferenceMode === 'animate' 
                                      ? 'bg-white/10 text-white font-bold' 
                                      : 'text-gray-500 hover:text-gray-300'
                                  }`}
                              >
                                  {t.adv_img_mode_animate}
                              </button>
                              <button
                                  onClick={() => setPromptConfig(c => ({ ...c, imageReferenceMode: 'subject' }))}
                                  className={`flex-1 py-1 rounded text-[10px] transition-colors ${
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

              {/* 4. DETAIL SETTINGS */}
              <div>
                   <AdvancedSettingsPanel
                        t={t}
                        showAdvancedSettings={showAdvancedSettings}
                        setShowAdvancedSettings={setShowAdvancedSettings}
                        
                        draftIdea=""
                        setDraftIdea={() => {}}
                        enhancerModel=""
                        setEnhancerModel={() => {}}
                        isEnhancing={false}
                        handleEnhancePrompt={() => {}}
                        
                        promptConfig={promptConfig}
                        setPromptConfig={setPromptConfig}
                        
                        activePromptTemplateName={activePromptTemplateName}
                        onOpenMetaModal={onOpenMetaModal}
                        
                        mode="director"
                        hideGenerator={true} 
                        flatMode={true}
                        
                        disabled={!isConfigEnabled}
                        headerRight={
                            <button 
                               onClick={(e) => { e.stopPropagation(); setIsConfigEnabled(!isConfigEnabled); }}
                               className={`w-8 h-4 rounded-full p-0.5 transition-colors ${isConfigEnabled ? 'bg-secondary' : 'bg-gray-700'}`}
                             >
                                <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${isConfigEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                             </button>
                        }
                    />
              </div>

              {/* 5. SCENE COUNT */}
              <div>
                  <label className="text-xs text-gray-400 font-medium block mb-2">{t.dir_count_label}</label>
                  <div className="flex items-center gap-4 bg-surface rounded-lg p-2 border border-white/10">
                      <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={directorCount} 
                      onChange={(e) => setDirectorCount(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary"
                      />
                      <span className="text-white font-bold w-8 text-center">{directorCount}</span>
                  </div>
              </div>

              {/* 6. ASPECT RATIO (Input Phase) */}
              <div>
                  <label className="text-xs text-gray-400 font-medium block mb-2">{t.gen_aspect_ratio}</label>
                  <select 
                    value={settings.aspectRatio}
                    onChange={(e) => setSettings({...settings, aspectRatio: e.target.value as any})}
                    className="w-full bg-surface border border-white/10 rounded-lg p-2 text-sm text-white focus:border-secondary outline-none appearance-none"
                  >
                    <option value="16:9">{t.gen_opt_landscape}</option>
                    <option value="9:16">{t.gen_opt_portrait}</option>
                  </select>
              </div>
          </div>

          {/* 6. GENERATE BUTTON */}
          <div className="mt-auto pt-4 border-t border-white/5">
              <button
              onClick={() => {
                  const activeKey = apiKeys.find(k => k.key && k.key.length > 10 && k.status !== 'error')?.key;
                  if (activeKey || geminiApiKey) {
                      handleDirectorPlan(activeKey || '');
                  } else {
                      addToast(t.gen_no_key, "error");
                  }
              }}
              disabled={!directorIdea.trim()}
              className="w-full py-4 bg-secondary hover:bg-cyan-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-secondary/20 flex items-center justify-center gap-2"
              >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              <div className="flex flex-col items-start leading-tight">
                  <span className="text-sm">{t.dir_btn_plan}</span>
              </div>
              </button>
          </div>
        </div>
      )}

      {/* Planning and Review States */}
      {directorState === 'planning' && (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
           <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-secondary/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
           </div>
           <p className="text-secondary font-medium animate-pulse">{t.dir_planning}</p>
        </div>
      )}

      {directorState === 'review' && !showConfirmation && (
          <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur p-2 z-10 border-b border-white/5 -mx-2">
               <div>
                  <h3 className="text-sm font-bold text-white">{t.dir_review_title}</h3>
                  <p className="text-xs text-gray-500">{t.dir_review_desc}</p>
               </div>
               <button 
                 onClick={() => setDirectorState('input')}
                 className="text-xs text-gray-400 hover:text-white"
               >
                 {t.dir_btn_back}
               </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {directorScenes.map((scene, idx) => (
                <div key={scene.id} className="bg-surface border border-white/10 rounded-xl p-4 relative group hover:border-white/20 transition-colors">
                   <div className="flex justify-between items-start mb-2">
                      <span className="bg-white/10 text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded">
                         {t.dir_scene} {scene.sceneNumber}
                      </span>
                      <button 
                        onClick={() => handleDeleteScene(scene.id)}
                        className="text-gray-600 hover:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                   </div>
                   
                   <p className="text-xs text-gray-500 mb-2 italic">"{scene.description}"</p>
                   
                   <textarea
                     value={scene.prompt}
                     onChange={(e) => handleUpdateScene(scene.id, e.target.value)}
                     className="w-full h-24 bg-black/20 border border-white/5 rounded-lg p-3 text-xs text-gray-300 focus:border-secondary outline-none resize-none"
                   />

                   {directorImage && (
                       <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                           <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded overflow-hidden border ${scene.imageUrl ? 'border-primary' : 'border-white/10 opacity-50'}`}>
                                   <img src={directorImage} alt="Ref" className="w-full h-full object-cover" />
                               </div>
                               <span className={`text-xs ${scene.imageUrl ? 'text-white' : 'text-gray-600 line-through'}`}>
                                   {t.dir_use_image}
                               </span>
                           </div>
                           
                           <button 
                              onClick={() => handleToggleSceneImage(scene.id)}
                              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${scene.imageUrl ? 'bg-primary' : 'bg-gray-700'}`}
                           >
                               <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${scene.imageUrl ? 'translate-x-5' : 'translate-x-0'}`}></div>
                           </button>
                       </div>
                   )}
                </div>
              ))}
            </div>
            
            {/* Production Settings Panel (Review Phase) */}
            <div className="bg-surface border border-white/10 rounded-xl p-4 shadow-lg">
                <h4 className="text-xs font-bold text-gray-300 mb-3 uppercase tracking-wider border-b border-white/5 pb-2">
                    {t.dir_prod_settings}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[10px] text-gray-500 block mb-1">{t.gen_aspect_ratio}</label>
                        <select 
                            value={settings.aspectRatio}
                            onChange={(e) => setSettings({...settings, aspectRatio: e.target.value as any})}
                            className="w-full bg-black/40 border border-white/10 rounded p-1.5 text-xs text-white focus:border-secondary outline-none"
                        >
                            <option value="16:9">{t.gen_opt_landscape}</option>
                            <option value="9:16">{t.gen_opt_portrait}</option>
                        </select>
                    </div>
                    
                    {isSora ? (
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">{t.gen_duration}</label>
                            <select 
                                value={settings.duration}
                                onChange={(e) => setSettings({...settings, duration: e.target.value as any})}
                                className="w-full bg-black/40 border border-white/10 rounded p-1.5 text-xs text-white focus:border-secondary outline-none"
                            >
                                <option value="10">{t.gen_opt_10s}</option>
                                <option value="15">{t.gen_opt_15s}</option>
                            </select>
                        </div>
                    ) : (
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">{t.gen_resolution}</label>
                            <select 
                                value={settings.resolution}
                                onChange={(e) => setSettings({...settings, resolution: e.target.value as any})}
                                className="w-full bg-black/40 border border-white/10 rounded p-1.5 text-xs text-white focus:border-secondary outline-none"
                            >
                                <option value="720p">{t.gen_opt_720p}</option>
                                <option value="1080p">{t.gen_opt_1080p}</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="pt-2">
               <button
                 onClick={() => setShowConfirmation(true)}
                 className="w-full py-3 bg-primary hover:bg-primaryHover text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
               >
                 {t.dir_conf_btn} ({directorScenes.length})
               </button>
            </div>
          </div>
      )}

      {showConfirmation && (
        <div className="space-y-6 animate-fade-in flex flex-col justify-center h-full">
            <div className="bg-surfaceHighlight/20 border border-white/10 rounded-xl p-6 text-center">
                <h3 className="text-xl font-bold text-white mb-2">{t.dir_conf_title}</h3>
                <p className="text-sm text-gray-400 mb-6">{t.dir_conf_desc}</p>

                <div className="grid grid-cols-2 gap-4 mb-6 text-left max-w-xs mx-auto">
                    <div className="text-gray-500 text-xs">{t.dir_conf_count}</div>
                    <div className="text-white font-mono text-right">{directorScenes.length}</div>
                    
                    <div className="text-gray-500 text-xs">{t.dir_conf_model}</div>
                    <div className="text-white font-mono text-right truncate pl-2">{settings.model}</div>

                    <div className="text-primary text-xs font-bold">{t.dir_conf_est}</div>
                    <div className="text-primary font-mono font-bold text-right">
                        {estCost} {t.dir_conf_credits}
                        <div className="text-[10px] opacity-75">(${estDollar.toFixed(2)})</div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowConfirmation(false)}
                        className="flex-1 py-3 rounded-xl font-medium text-gray-400 hover:bg-white/5 transition-colors"
                    >
                        {t.warn_btn_cancel}
                    </button>
                    <button 
                        onClick={() => {
                            setShowConfirmation(false);
                            onExecuteBatch(directorScenes);
                        }}
                        className="flex-1 py-3 bg-primary hover:bg-primaryHover text-black font-bold rounded-xl shadow-lg shadow-primary/20 transition-colors"
                    >
                        {t.dir_conf_btn}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};

export default DirectorPanel;
