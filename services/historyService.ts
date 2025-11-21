
import { supabase } from '../lib/supabase';
import { GeneratedVideo } from '../types';
import { saveVideoBlob, getAllVideoBlobs } from '../lib/indexedDb';

export const saveHistoryItem = async (video: GeneratedVideo, enableLocalHistory: boolean) => {
  // 1. Save Blob to IndexedDB if enabled
  if (enableLocalHistory && video.blob) {
    try {
      await saveVideoBlob(video.id, video.blob);
      console.log(`Video ${video.id} saved to IndexedDB`);
    } catch (e) {
      console.error("Failed to save to IndexedDB", e);
    }
  }

  // 2. Save Metadata to Supabase
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const { error: dbError } = await supabase
    .from('generated_videos')
    .insert({
      id: video.id,
      user_id: userId,
      prompt: video.prompt,
      video_url: video.remoteUrl || video.url,
      thumbnail_url: '', 
      settings: {
        ...video.settings,
        original_kie_url: video.remoteUrl || video.originalKieUrl
      },
      created_at: new Date().toISOString()
    });

  if (dbError) {
    // Handle "Relation does not exist" error specifically
    if (dbError.code === '42P01' || dbError.message.includes('does not exist') || dbError.message.includes('Could not find the table')) {
        console.warn("⚠️ History skipped: 'generated_videos' table missing. Run SQL in Supabase Dashboard.");
    } else {
        console.error('DB Save failed:', dbError.message);
    }
  }
};

export const fetchUserHistory = async (userId: string, enableLocalHistory: boolean): Promise<GeneratedVideo[]> => {
  // 1. Fetch Metadata from Supabase
  const { data, error } = await supabase
    .from('generated_videos')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('Could not find the table')) {
       console.warn("⚠️ Cannot fetch history: 'generated_videos' table missing. Please run setup SQL.");
       return [];
    }
    console.error('Fetch history failed:', error.message);
    return [];
  }

  if (!data) return [];

  // 2. Fetch all local blobs if enabled
  let localBlobs: Record<string, Blob> = {};
  if (enableLocalHistory) {
    try {
      localBlobs = await getAllVideoBlobs();
    } catch (e) {
      console.warn("Failed to load local blobs", e);
    }
  }

  // 3. Merge
  return data.map((row: any) => {
    const localBlob = localBlobs[row.id];
    const originalKieUrl = row.settings?.original_kie_url || row.video_url;

    const url = localBlob ? URL.createObjectURL(localBlob) : originalKieUrl;

    return {
      id: row.id,
      url: url,
      remoteUrl: originalKieUrl,
      originalKieUrl: originalKieUrl,
      prompt: row.prompt,
      timestamp: new Date(row.created_at).getTime(),
      settings: row.settings,
      thumbnailUrl: row.thumbnail_url,
      blob: localBlob,
      isLocal: !!localBlob
    };
  });
};
