
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { ApiKeyData, DirectorTemplate, PromptTemplate } from '../types';
import { loadSettings, saveCloudSettings } from '../services/settingsService';
import { DEFAULT_BASE_SYSTEM_PROMPT } from '../services/promptService';
import { useToast } from '../components/ToastContext';

interface UseAppSettingsProps {
  user: User | null;
  apiKeys: ApiKeyData[];
  importKeys: (keys: ApiKeyData[]) => void;
}

export const useAppSettings = ({ user, apiKeys, importKeys }: UseAppSettingsProps) => {
  const [suppressQualityWarning, setSuppressQualityWarning] = useState(false);
  const [enableLocalHistory, setEnableLocalHistory] = useState(false);
  
  // Director Mode
  const [directorTemplates, setDirectorTemplates] = useState<DirectorTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('tmpl_cinematic');
  
  // Prompt Generator
  const [promptTemplates, setPromptTemplates] = useState<PromptTemplate[]>([]);
  const [activePromptTemplateId, setActivePromptTemplateId] = useState<string>('pt_sora_expert');

  const [isSaving, setIsSaving] = useState(false);
  const [isKeyManagerOpen, setKeyManagerOpen] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await loadSettings(user?.id);
        setSuppressQualityWarning(settings.suppressQualityWarning || false);
        setEnableLocalHistory(settings.enableLocalHistory || false);
        
        setDirectorTemplates(settings.directorTemplates || []);
        setActiveTemplateId(settings.activeTemplateId || 'tmpl_cinematic');
        
        setPromptTemplates(settings.promptTemplates || []);
        setActivePromptTemplateId(settings.activePromptTemplateId || 'pt_sora_expert');
        
        importKeys(settings.apiKeys);
        
        const hasKeys = settings.apiKeys.some(k => k.key.length > 0);
        if (!hasKeys) {
          setTimeout(() => setKeyManagerOpen(true), 500);
        }
        if (user) addToast("Settings synced from cloud", 'info');
      } catch (e) {
        addToast("Failed to load settings", 'error');
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const settings = {
        apiKeys,
        suppressQualityWarning,
        enableLocalHistory,
        directorTemplates,
        activeTemplateId,
        promptTemplates,
        activePromptTemplateId,
        updatedAt: Date.now()
      };
      
      if (user) {
        await saveCloudSettings(user.id, settings);
        addToast("Settings saved to Veo Cloud", 'success');
      } else {
        await saveCloudSettings('local-fallback', settings); 
        addToast("Settings saved locally", 'success');
      }
    } catch (e: any) {
      console.warn("Save error", e);
      addToast(`Save failed: ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
      setKeyManagerOpen(false);
    }
  };

  // --- Template Handlers ---

  // Director Mode
  const addTemplate = (name: string, prompt: string) => {
      const newTmpl: DirectorTemplate = { id: crypto.randomUUID(), name, systemPrompt: prompt };
      setDirectorTemplates(prev => [...prev, newTmpl]);
      setActiveTemplateId(newTmpl.id);
      setTimeout(handleSaveSettings, 100);
  };
  const updateTemplate = (id: string, name: string, prompt: string) => {
      setDirectorTemplates(prev => prev.map(t => t.id === id ? { ...t, name, systemPrompt: prompt } : t));
      setTimeout(handleSaveSettings, 100);
  };
  const deleteTemplate = (id: string) => {
      setDirectorTemplates(prev => prev.filter(t => t.id !== id));
      if (activeTemplateId === id) setActiveTemplateId('tmpl_cinematic');
      setTimeout(handleSaveSettings, 100);
  };

  // Prompt Generator
  const addPromptTemplate = (name: string, template: string) => {
      const newTmpl: PromptTemplate = { id: crypto.randomUUID(), name, template };
      setPromptTemplates(prev => [...prev, newTmpl]);
      setActivePromptTemplateId(newTmpl.id);
      setTimeout(handleSaveSettings, 100);
  };
  const updatePromptTemplate = (id: string, name: string, template: string) => {
      setPromptTemplates(prev => prev.map(t => t.id === id ? { ...t, name, template } : t));
      setTimeout(handleSaveSettings, 100);
  };
  const deletePromptTemplate = (id: string) => {
      setPromptTemplates(prev => prev.filter(t => t.id !== id));
      if (activePromptTemplateId === id) setActivePromptTemplateId('pt_sora_expert');
      setTimeout(handleSaveSettings, 100);
  };

  return {
    suppressQualityWarning, setSuppressQualityWarning,
    enableLocalHistory, setEnableLocalHistory,
    
    directorTemplates, activeTemplateId, setActiveTemplateId,
    addTemplate, updateTemplate, deleteTemplate,
    
    promptTemplates, activePromptTemplateId, setActivePromptTemplateId,
    addPromptTemplate, updatePromptTemplate, deletePromptTemplate,

    isSaving, isKeyManagerOpen, setKeyManagerOpen, handleSaveSettings
  };
};
