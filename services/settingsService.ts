
import { supabase } from '../lib/supabase';
import { AppSettings, ApiKeyData, DirectorTemplate, PromptTemplate } from '../types';
import { encrypt, decrypt } from '../lib/encryption';
import { DEFAULT_BASE_SYSTEM_PROMPT } from './promptService';

const LOCAL_STORAGE_KEYS_KEY = 'veo_api_keys';
const LOCAL_STORAGE_GEMINI_KEY = 'veo_gemini_key'; // New storage key
const LOCAL_STORAGE_WARN_KEY = 'veo_suppress_warn';
const LOCAL_STORAGE_HISTORY_KEY = 'veo_local_history';
const LOCAL_STORAGE_TEMPLATES_KEY = 'veo_director_templates';
const LOCAL_STORAGE_ACTIVE_TMPL_KEY = 'veo_active_template';

// New Keys for Prompt Generator Templates
const LOCAL_STORAGE_PROMPT_TEMPLATES_KEY = 'veo_prompt_templates';
const LOCAL_STORAGE_ACTIVE_PROMPT_TMPL_KEY = 'veo_active_prompt_template';

const ENCRYPTION_SECRET = 'kie-studio-secure-storage'; 

const DEFAULT_DIRECTOR_TEMPLATES: DirectorTemplate[] = [
  {
    id: 'tmpl_sora_expert',
    name: 'Sora2エキスパート', // Updated name per request
    systemPrompt: DEFAULT_BASE_SYSTEM_PROMPT, // Use the standardized prompt
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
    name: 'Sora2エキスパート', // Consistency for single mode too
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

// Helper to get local data
const getLocalSettings = async (): Promise<AppSettings> => {
  const suppressWarning = localStorage.getItem(LOCAL_STORAGE_WARN_KEY) === 'true';
  const enableLocalHistory = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY) === 'true';
  
  // Decrypt Gemini Key from Local Storage
  const encryptedGeminiKey = localStorage.getItem(LOCAL_STORAGE_GEMINI_KEY) || '';
  let geminiApiKey = '';
  if (encryptedGeminiKey) {
      geminiApiKey = await decrypt(encryptedGeminiKey, ENCRYPTION_SECRET);
  }
  
  const keysJson = localStorage.getItem(LOCAL_STORAGE_KEYS_KEY);
  const dirTemplatesJson = localStorage.getItem(LOCAL_STORAGE_TEMPLATES_KEY);
  const activeTemplateId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_TMPL_KEY) || 'tmpl_sora_expert';
  
  const promptTemplatesJson = localStorage.getItem(LOCAL_STORAGE_PROMPT_TEMPLATES_KEY);
  const activePromptTemplateId = localStorage.getItem(LOCAL_STORAGE_ACTIVE_PROMPT_TMPL_KEY) || 'pt_sora_expert';
  
  let apiKeys: ApiKeyData[] = [];
  if (keysJson) {
    try {
      const parsedKeys = JSON.parse(keysJson);
      // Decrypt Local Keys
      apiKeys = await Promise.all(parsedKeys.map(async (k: any) => ({
          ...k,
          key: k.key ? await decrypt(k.key, ENCRYPTION_SECRET) : ''
      })));
    } catch (e) {
      console.error("Failed to parse/decrypt local keys", e);
    }
  }

  if (apiKeys.length === 0) {
    apiKeys = Array.from({ length: 3 }).map((_, i) => ({
      id: `key-${i}`,
      key: '',
      activeRequests: 0,
      status: 'idle',
      totalGenerated: 0
    }));
  }

  let directorTemplates: DirectorTemplate[] = DEFAULT_DIRECTOR_TEMPLATES;
  if (dirTemplatesJson) {
      try {
          const saved = JSON.parse(dirTemplatesJson);
          if (Array.isArray(saved) && saved.length > 0) {
              directorTemplates = saved;
          }
      } catch (e) { console.error(e); }
  }

  let promptTemplates: PromptTemplate[] = DEFAULT_PROMPT_TEMPLATES;
  if (promptTemplatesJson) {
      try {
          const saved = JSON.parse(promptTemplatesJson);
          if (Array.isArray(saved) && saved.length > 0) {
              promptTemplates = saved;
          }
      } catch (e) { console.error(e); }
  }

  return {
    apiKeys,
    geminiApiKey,
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
  // Encrypt Keys before saving to Local Storage
  const encryptedKeys = await Promise.all(settings.apiKeys.map(async (k) => ({
      ...k,
      key: k.key ? await encrypt(k.key, ENCRYPTION_SECRET) : ''
  })));
  localStorage.setItem(LOCAL_STORAGE_KEYS_KEY, JSON.stringify(encryptedKeys));

  if (settings.geminiApiKey !== undefined) {
      const encryptedGemini = await encrypt(settings.geminiApiKey, ENCRYPTION_SECRET);
      localStorage.setItem(LOCAL_STORAGE_GEMINI_KEY, encryptedGemini);
  }

  localStorage.setItem(LOCAL_STORAGE_WARN_KEY, String(settings.suppressQualityWarning));
  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, String(settings.enableLocalHistory));
  
  localStorage.setItem(LOCAL_STORAGE_TEMPLATES_KEY, JSON.stringify(settings.directorTemplates));
  if (settings.activeTemplateId) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_TMPL_KEY, settings.activeTemplateId);
  }

  localStorage.setItem(LOCAL_STORAGE_PROMPT_TEMPLATES_KEY, JSON.stringify(settings.promptTemplates));
  if (settings.activePromptTemplateId) {
      localStorage.setItem(LOCAL_STORAGE_ACTIVE_PROMPT_TMPL_KEY, settings.activePromptTemplateId);
  }
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

      // Save to local storage (now encrypted by saveLocalSettings)
      await saveLocalSettings(decryptedSettings);
      return decryptedSettings;
    }
  } catch (e) {
    console.error("Unexpected error loading settings", e);
  }

  return await getLocalSettings();
};

export const saveCloudSettings = async (userId: string, settings: AppSettings) => {
  // Save locally first (Encrypts automatically)
  await saveLocalSettings(settings);

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
