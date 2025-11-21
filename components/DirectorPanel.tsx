
import React, { useState, useRef } from 'react';
import { VideoSettings, DirectorScene, Translation, ApiKeyData, DirectorTemplate } from '../types';
import { generateScenePlan } from '../services/planningService';
import { uploadFileToKie } from '../services/uploadService';
import { useToast } from './ToastContext';

interface DirectorPanelProps {
  apiKeys: ApiKeyData[];
  settings: VideoSettings;
  onExecuteBatch: (scenes: DirectorScene[]) => void;
  
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
  apiKeys, settings, onExecuteBatch, 
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

  // Template Editing State
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [editTmplName, setEditTmplName] = useState('');
  const [editTmplPrompt, setEditTmplPrompt] = useState('');
  const [editTmplId, setEditTmplId] = useState<string | null>(null); // null = create

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
      addToast("Reference image uploaded", "success");
    } catch (error: any) {
      addToast(`Upload failed: ${error.message}`, "error");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDirectorPlan = async () => {
    const activeKey = apiKeys.find(k => k.key.length > 0 && k.status !== 'error');
    if (!activeKey) {
      addToast(t.gen_no_key, "error");
      return;
    }

    setDirectorState('planning');
    try {
      const selectedTemplate = directorTemplates.find(tmpl => tmpl.id === activeTemplateId);
      const systemPrompt = selectedTemplate?.systemPrompt;

      const scenes = await generateScenePlan(directorIdea, directorCount, systemPrompt);
      
      const scenesWithImage = scenes.map(s => ({
          ...s,
          imageUrl: directorImage || undefined
      }));
      
      setDirectorScenes(scenesWithImage);
      setDirectorState('review');
      addToast("Production plan generated!", "success");
    } catch (e: any) {
      console.error(e);
      addToast(`Planning failed: ${e.message}`, "error");
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

  const getEstimatedCost = () => {
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
  };

  const openTemplateEditor = (template?: DirectorTemplate) => {
      if (template) {
          setEditTmplId(template.id);
          setEditTmplName(template.name);
          setEditTmplPrompt(template.systemPrompt);
      } else {
          setEditTmplId(null);
          setEditTmplName('New Director Style');
          setEditTmplPrompt('You are a...');
      }
      setIsEditingTemplate(true);
  };

  const saveTemplate = () => {
      if (editTmplId) {
          updateTemplate(editTmplId, editTmplName, editTmplPrompt);
      } else {
          addTemplate(editTmplName, editTmplPrompt);
      }
      setIsEditingTemplate(false);
  };

  const { cost: estCost, dollar: estDollar } = getEstimatedCost();

  if (isEditingTemplate) {
      return (
          <div className="space-y-4 animate-fade-in">
              <h3 className="text-sm font-bold text-white">{editTmplId ? 'Edit Template' : 'New Template'}</h3>
              
              <div>
                  <label className="text-xs text-gray-400 block mb-1">{t.dir_tmpl_name}</label>
                  <input 
                    type="text" 
                    value={editTmplName}
                    onChange={(e) => setEditTmplName(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:border-secondary outline-none"
                  />
              </div>
              
              <div>
                  <label className="text-xs text-gray-400 block mb-1">{t.dir_tmpl_prompt}</label>
                  <textarea
                    value={editTmplPrompt}
                    onChange={(e) => setEditTmplPrompt(e.target.value)}
                    className="w-full h-48 bg-black/20 border border-white/10 rounded px-2 py-2 text-xs text-gray-300 focus:border-secondary outline-none resize-none"
                  />
              </div>

              <div className="flex gap-2 pt-2">
                  <button onClick={() => setIsEditingTemplate(false)} className="flex-1 py-2 text-xs text-gray-400 hover:text-white">Cancel</button>
                  <button onClick={saveTemplate} className="flex-1 py-2 bg-secondary text-black text-xs font-bold rounded">{t.dir_tmpl_save}</button>
              </div>
          </div>
      );
  }

  if (directorState === 'input') {
    return (
      <div className="space-y-6">
        <div>
            <div className="flex justify-between items-center mb-2">
               <label className="text-xs text-gray-400 font-medium">{t.dir_persona_label}</label>
               <button 
                 onClick={() => {
                     const tmpl = directorTemplates.find(t => t.id === activeTemplateId);
                     if (tmpl && !tmpl.isDefault) openTemplateEditor(tmpl);
                     else openTemplateEditor();
                 }}
                 className="text-[10px] text-secondary hover:underline flex items-center gap-1"
               >
                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                   {directorTemplates.find(t => t.id === activeTemplateId)?.isDefault ? t.dir_tmpl_edit.split('/')[1] : t.dir_tmpl_edit}
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

        <div>
          <label className="text-xs text-gray-400 font-medium block mb-2">{t.gen_prompt_label}</label>
          <textarea
            value={directorIdea}
            onChange={(e) => setDirectorIdea(e.target.value)}
            placeholder={t.dir_idea_placeholder}
            className="w-full h-24 bg-surface border border-white/10 rounded-xl p-4 text-white placeholder-gray-600 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none"
          />
        </div>

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
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
        </div>

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

        <button
          onClick={handleDirectorPlan}
          disabled={!directorIdea.trim()}
          className="w-full py-3 bg-secondary hover:bg-cyan-400 text-black font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-secondary/20 flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
          {t.dir_btn_plan}
        </button>
      </div>
    );
  }

  if (directorState === 'planning') {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
         <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-secondary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
         </div>
         <p className="text-secondary font-medium animate-pulse">{t.dir_planning}</p>
      </div>
    );
  }

  if (showConfirmation) {
      return (
        <div className="space-y-6 animate-fade-in">
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
      );
  }

  return (
    <div className="space-y-4">
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

      <div className="space-y-4">
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

      <div className="pt-4 sticky bottom-0 bg-background/80 backdrop-blur pb-2">
         <button
           onClick={() => setShowConfirmation(true)}
           className="w-full py-3 bg-primary hover:bg-primaryHover text-black font-bold rounded-xl shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
         >
           {t.dir_conf_btn} ({directorScenes.length})
         </button>
      </div>
    </div>
  );
};

export default DirectorPanel;
