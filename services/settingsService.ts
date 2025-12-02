
import { supabase } from '../lib/supabase';
import { AppSettings, ApiKeyData, DirectorTemplate, PromptTemplate } from '../types';
import { encrypt, decrypt } from '../lib/encryption';
import { DEFAULT_BASE_SYSTEM_PROMPT } from './promptService';

// Removed Keys for API/Templates to prevent local storage conflicts
// const LOCAL_STORAGE_KEYS_KEY = 'veo_api_keys';
// const LOCAL_STORAGE_GEMINI_KEY = 'veo_gemini_key';
// const LOCAL_STORAGE_TEMPLATES_KEY = 'veo_director_templates';
// const LOCAL_STORAGE_ACTIVE_TMPL_KEY = 'veo_active_template';
// const LOCAL_STORAGE_PROMPT_TEMPLATES_KEY = 'veo_prompt_templates';
// const LOCAL_STORAGE_ACTIVE_PROMPT_TMPL_KEY = 'veo_active_prompt_template';

// Keep UI preferences local as they are device specific
const LOCAL_STORAGE_WARN_KEY = 'veo_suppress_warn';
const LOCAL_STORAGE_HISTORY_KEY = 'veo_local_history';

const ENCRYPTION_SECRET = 'kie-studio-secure-storage'; 

const DEFAULT_DIRECTOR_TEMPLATES: DirectorTemplate[] = [
  {
    id: 'tmpl_sora_expert',
    name: 'Sora2エキスパート', 
    systemPrompt: DEFAULT_BASE_SYSTEM_PROMPT, 
    isDefault: true
  },
  {
    id: 'tmpl_music_video',
    name: 'Music Video Director',
    systemPrompt: `You are a visionary Music Video Director.
Break down the user's concept into rhythmic, fast-paced, and visually striking scenes suitable for a music video.
Focus on:
- Dynamic camera movements (whip pans, zooms).
- Stylized lighting and color palettes.
- Sync potential with beat/audio (visual rhythm).
- Abstract or symbolic imagery where appropriate.`,
    isDefault: true
  }
];

const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'pt_sora_expert',
    name: 'Sora2エキスパート', 
    template: DEFAULT_BASE_SYSTEM_PROMPT,
    isDefault: true
  },
  {
    id: 'pt_simple',
    name: 'Simple Enhancer',
    template: `You are a helpful assistant. Expand the user's draft idea into a clear, descriptive prompt suitable for video generation. Keep it under 3 sentences.`,
    isDefault: true
  }
];

// Helper to get local data (Restricted to UI prefs only)
const getLocalSettings = async (): Promise<AppSettings> => {
  const suppressWarning = localStorage.getItem(LOCAL_STORAGE_WARN_KEY) === 'true';
  const enableLocalHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY) === 'true';
  
  // Do NOT load keys from local storage anymore
  const apiKeys: ApiKeyData[] = Array.from({ length: 3 }).map((_, i) => ({
    id: `key-${i}`,
    key: '',
    activeRequests: 0,
    status: 'idle',
    totalGenerated: 0
  }));

  // Do NOT load templates from local storage anymore
  const directorTemplates: DirectorTemplate[] = DEFAULT_DIRECTOR_TEMPLATES;
  const activeTemplateId = 'tmpl_sora_expert';
  
  const promptTemplates: PromptTemplate[] = DEFAULT_PROMPT_TEMPLATES;
  const activePromptTemplateId = 'pt_sora_expert';
  
  return {
    apiKeys,
    geminiApiKey: '', // Start empty
    suppressQualityWarning: suppressWarning,
    enableLocalHistory,
    directorTemplates,
    activeTemplateId,
    promptTemplates,
    activePromptTemplateId,
    updatedAt: Date.now()
  };
};

export const saveLocalSettings = async (settings: AppSettings) => {
  // We ONLY save UI preferences to local storage now.
  // API Keys and Templates are no longer persisted locally to avoid user conflicts.
  
  localStorage.setItem(LOCAL_STORAGE_WARN_KEY, String(settings.suppressQualityWarning));
  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, String(settings.enableLocalHistory));
  
  // Explicitly removed:
  // - API Keys
  // - Gemini Key
  // - Templates
};

export const loadSettings = async (userId?: string): Promise<AppSettings> => {
  if (!userId) {
    return await getLocalSettings();
  }

  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    if (error) return await getLocalSettings();

    if (data && data.settings) {
      const cloudSettings = data.settings as AppSettings;
      
      // Decrypt Kie API Keys (Cloud)
      const decryptedKeys = await Promise.all(cloudSettings.apiKeys.map(async (k) => ({
          ...k,
          key: k.key ? await decrypt(k.key, ENCRYPTION_SECRET) : ''
      })));

      // Decrypt Gemini Key (Cloud)
      const decryptedGeminiKey = cloudSettings.geminiApiKey 
          ? await decrypt(cloudSettings.geminiApiKey, ENCRYPTION_SECRET) 
          : '';

      const decryptedSettings = {
          ...cloudSettings,
          apiKeys: decryptedKeys,
          geminiApiKey: decryptedGeminiKey,
          directorTemplates: cloudSettings.directorTemplates || DEFAULT_DIRECTOR_TEMPLATES,
          activeTemplateId: cloudSettings.activeTemplateId || 'tmpl_sora_expert',
          promptTemplates: cloudSettings.promptTemplates || DEFAULT_PROMPT_TEMPLATES,
          activePromptTemplateId: cloudSettings.activePromptTemplateId || 'pt_sora_expert'
      };

      // Update local UI prefs based on cloud settings (optional but good for consistency)
      await saveLocalSettings(decryptedSettings);
      return decryptedSettings;
    }
  } catch (e) {
    console.error("Unexpected error loading settings", e);
  }

  return await getLocalSettings();
};

export const saveCloudSettings = async (userId: string, settings: AppSettings) => {
  // Save UI preferences locally
  await saveLocalSettings(settings);

  // If no user, we do not persist keys/templates anywhere (Session only)
  if (!userId || userId === 'local-fallback') {
    return;
  }

  try {
    // Encrypt Kie Keys for Cloud
    const encryptedKeys = await Promise.all(settings.apiKeys.map(async (k) => ({
        ...k,
        key: k.key ? await encrypt(k.key, ENCRYPTION_SECRET) : ''
    })));

    // Encrypt Gemini Key for Cloud
    const encryptedGeminiKey = settings.geminiApiKey 
        ? await encrypt(settings.geminiApiKey, ENCRYPTION_SECRET) 
        : '';

    const secureSettings = {
        ...settings,
        apiKeys: encryptedKeys,
        geminiApiKey: encryptedGeminiKey
    };

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        settings: secureSettings,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
  } catch (e) {
    console.error("Failed to save to cloud", e);
    throw e;
  }
};
