
import { translations } from './utils/translations';

export interface VideoSettings {
  aspectRatio: '16:9' | '9:16' | 'portrait' | 'landscape';
  resolution: '720p' | '1080p';
  model: string;
  duration?: '10' | '15'; // Sora specific
  size?: 'standard' | 'high'; // Sora Pro specific
  removeWatermark?: boolean; // Sora specific
}

export interface PromptConfig {
  language: 'ja' | 'en';
  enableText: boolean;
  audioMode: 'dialogue' | 'narration' | 'off';
  enableJsonTiming: boolean;
  imageReferenceMode?: 'animate' | 'subject'; // Added for Image-to-Video control
}

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VideoTask {
  id: string;
  prompt: string;
  startImage: string | null;
  endImage: string | null;
  settings: VideoSettings;
  promptConfig?: PromptConfig; // Added optional config
  status: TaskStatus;
  progress: string;
  createdAt: number;
  assignedKey?: string;
  resultVideo?: GeneratedVideo;
  error?: string;
  retryCount: number;
}

export interface ApiKeyData {
  id: string;
  key: string;
  accountLabel?: string; // User-defined label to group accounts
  activeRequests: number;
  status: 'idle' | 'busy' | 'error' | 'cooldown';
  errorMessage?: string;
  totalGenerated: number;
  remainingCredits?: number;
}

export interface GeneratedVideo {
  id: string;
  url: string; // ObjectURL (local) or Remote URL
  remoteUrl?: string; // The original Kie.ai URL (temp)
  originalKieUrl?: string; // Backup of the Kie URL
  prompt: string;
  timestamp: number;
  settings: VideoSettings;
  blob?: Blob;
  thumbnailUrl?: string;
  isLocal?: boolean; // Flag to indicate if blob is present in IndexedDB
}

export type Language = 'en' | 'ja';
export type Translation = typeof translations.en; // Infer type from English translation

export interface DirectorScene {
  id: string;
  sceneNumber: number;
  description: string; 
  prompt: string;      
  imageUrl?: string; // Optional reference image for Image-to-Video
}

// For Director Mode (Multi-scene)
export interface DirectorTemplate {
  id: string;
  name: string;
  systemPrompt: string;
  isDefault?: boolean;
}

// For Single Prompt Generator (Draft -> Prompt)
export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  isDefault?: boolean;
}

export interface AppSettings {
  apiKeys: ApiKeyData[];
  suppressQualityWarning: boolean;
  enableLocalHistory: boolean; // New setting for IndexedDB
  
  // Director Mode Templates
  directorTemplates: DirectorTemplate[];
  activeTemplateId?: string;

  // Single Prompt Generator Templates
  promptTemplates: PromptTemplate[];
  activePromptTemplateId?: string;
  
  updatedAt: number;
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
  }
}
