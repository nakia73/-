
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { ApiKeyData, DirectorTemplate, PromptTemplate, AppSettings } from '../types';
import { loadSettings, saveCloudSettings } from '../services/settingsService';
import { useToast } from '../components/ToastContext';

interface UseAppSettingsProps {
  user: User | null;
  apiKeys: ApiKeyData[];
  importKeys: (keys: ApiKeyData[]) => void;
}

export const useAppSettings = ({ user, apiKeys, importKeys }: UseAppSettingsProps) => {
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [suppressQualityWarning, setSuppressQualityWarning] = useState(false);
  const [enableLocalHistory, setEnableLocalHistory] = useState(false);
  
  // Director Mode
  const [directorTemplates, setDirectorTemplates] = useState<DirectorTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('tmpl_sora_expert');
  
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
        setGeminiApiKey(settings.geminiApiKey || '');
        setSuppressQualityWarning(settings.suppressQualityWarning || false);
        setEnableLocalHistory(settings.enableLocalHistory || false);
        
        setDirectorTemplates(settings.directorTemplates || []);
        setActiveTemplateId(settings.activeTemplateId || 'tmpl_sora_expert');
        
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

  // Allow passing overrides to ensure latest state is saved immediately (avoiding stale closures)
  const handleSaveSettings = async (overrides?: Partial<AppSettings>) => {
    setIsSaving(true);
    try {
      // Construct settings object using current state OR provided overrides
      const settings: AppSettings = {
        apiKeys: overrides?.apiKeys ?? apiKeys,
        geminiApiKey: overrides?.geminiApiKey ?? geminiApiKey,
        suppressQualityWarning: overrides?.suppressQualityWarning ?? suppressQualityWarning,
        enableLocalHistory: overrides?.enableLocalHistory ?? enableLocalHistory,
        
        directorTemplates: overrides?.directorTemplates ?? directorTemplates,
        activeTemplateId: overrides?.activeTemplateId ?? activeTemplateId,
        
        promptTemplates: overrides?.promptTemplates ?? promptTemplates,
        activePromptTemplateId: overrides?.activePromptTemplateId ?? activePromptTemplateId,
        
        updatedAt: Date.now()
      };
      
      if (user) {
        await saveCloudSettings(user.id, settings);
        // addToast("Settings saved to Veo Cloud", 'success'); // Optional: reduce noise
      } else {
        await saveCloudSettings('local-fallback', settings); 
      }
    } catch (e: any) {
      console.warn("Save error", e);
      addToast(`Save failed: ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
      setKeyManagerOpen(false);
    }
  };

  // --- Template Handlers (Director Mode) ---

  const addTemplate = (name: string, prompt: string) => {
      const newTmpl: DirectorTemplate = { id: crypto.randomUUID(), name, systemPrompt: prompt };
      const newTemplates = [...directorTemplates, newTmpl];
      
      setDirectorTemplates(newTemplates);
      setActiveTemplateId(newTmpl.id);
      
      // Save immediately with the calculated new state
      handleSaveSettings({ 
          directorTemplates: newTemplates, 
          activeTemplateId: newTmpl.id 
      });
  };

  const updateTemplate = (id: string, name: string, prompt: string) => {
      const newTemplates = directorTemplates.map(t => t.id === id ? { ...t, name, systemPrompt: prompt } : t);
      
      setDirectorTemplates(newTemplates);
      
      // Save immediately
      handleSaveSettings({ directorTemplates: newTemplates });
  };

  const deleteTemplate = (id: string) => {
      const newTemplates = directorTemplates.filter(t => t.id !== id);
      let newActiveId = activeTemplateId;
      
      if (activeTemplateId === id) {
          newActiveId = 'tmpl_sora_expert'; // Default fallback
          setActiveTemplateId(newActiveId);
      }
      
      setDirectorTemplates(newTemplates);
      
      // Save immediately
      handleSaveSettings({ 
          directorTemplates: newTemplates,
          activeTemplateId: newActiveId
      });
  };

  // --- Template Handlers (Prompt Generator) ---

  const addPromptTemplate = (name: string, template: string) => {
      const newTmpl: PromptTemplate = { id: crypto.randomUUID(), name, template };
      const newTemplates = [...promptTemplates, newTmpl];
      
      setPromptTemplates(newTemplates);
      setActivePromptTemplateId(newTmpl.id);
      
      handleSaveSettings({
          promptTemplates: newTemplates,
          activePromptTemplateId: newTmpl.id
      });
  };

  const updatePromptTemplate = (id: string, name: string, template: string) => {
      const newTemplates = promptTemplates.map(t => t.id === id ? { ...t, name, template } : t);
      
      setPromptTemplates(newTemplates);
      
      handleSaveSettings({ promptTemplates: newTemplates });
  };

  const deletePromptTemplate = (id: string) => {
      const newTemplates = promptTemplates.filter(t => t.id !== id);
      let newActiveId = activePromptTemplateId;

      if (activePromptTemplateId === id) {
          newActiveId = 'pt_sora_expert';
          setActivePromptTemplateId(newActiveId);
      }
      
      setPromptTemplates(newTemplates);
      
      handleSaveSettings({ 
          promptTemplates: newTemplates,
          activePromptTemplateId: newActiveId
      });
  };

  return {
    geminiApiKey, setGeminiApiKey,
    suppressQualityWarning, setSuppressQualityWarning,
    enableLocalHistory, setEnableLocalHistory,
    
    directorTemplates, activeTemplateId, setActiveTemplateId,
    addTemplate, updateTemplate, deleteTemplate,
    
    promptTemplates, activePromptTemplateId, setActivePromptTemplateId,
    addPromptTemplate, updatePromptTemplate, deletePromptTemplate,

    isSaving, isKeyManagerOpen, setKeyManagerOpen, handleSaveSettings
  };
};
