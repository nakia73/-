import { supabase } from '../lib/supabase';
import { AppSettings, ApiKeyData, DirectorTemplate, PromptTemplate } from '../types';
import { encrypt, decrypt } from '../lib/encryption';
import { DEFAULT_BASE_SYSTEM_PROMPT } from './promptService';

// UI preferences
const LOCAL_STORAGE_WARN_KEY = 'veo_suppress_warn';
const LOCAL_STORAGE_HISTORY_KEY = 'veo_local_history';

const ENCRYPTION_SECRET = 'kie-studio-secure-storage'; 
const DEFAULT_API_KEY_COUNT = 10; // Increased from 3 to 10

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
  
  // Default 10 empty keys
  const apiKeys: ApiKeyData[] = Array.from({ length: DEFAULT_API_KEY_COUNT }).map((_, i) => ({
    id: `key-${i}`,
    key: '',
    activeRequests: 0,
    status: 'idle',
    totalGenerated: 0
  }));

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
  localStorage.setItem(LOCAL_STORAGE_WARN_KEY, String(settings.suppressQualityWarning));
  localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, String(settings.enableLocalHistory));
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
      
      // Ensure we have 10 keys even if cloud data has fewer (legacy support)
      let loadedKeys = cloudSettings.apiKeys || [];
      if (loadedKeys.length < DEFAULT_API_KEY_COUNT) {
          const currentCount = loadedKeys.length;
          const padding: ApiKeyData[] = Array.from({ length: DEFAULT_API_KEY_COUNT - currentCount }).map((_, i) => ({
            id: `key-${currentCount + i}`,
            key: '',
            activeRequests: 0,
            status: 'idle',
            totalGenerated: 0
          }));
          loadedKeys = [...loadedKeys, ...padding];
      }

      // Decrypt Kie API Keys (Cloud)
      const decryptedKeys = await Promise.all(loadedKeys.map(async (k) => ({
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

      // Update local UI prefs
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