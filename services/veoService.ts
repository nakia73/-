
import { VideoSettings } from "../types";

const BASE_URL = "https://api.kie.ai/api/v1";
const JOB_URL = `${BASE_URL}/jobs`;

interface KieResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status?: string; 
    state?: string; 
    videoUrl?: string; 
    url?: string; 
    resultJson?: string; 
    progress?: number;
    error?: string;
  };
}

// Helper to calculate cost before request
export const getEstimatedCost = (model: string, duration?: string): number => {
  // Sora 2 Pro: 250 credits (10s) / 375 credits (15s)
  if (model.includes('sora-2-pro')) {
      return (duration === '15') ? 375 : 250; 
  }
  // Sora 2: 30 credits (10s) / 45 credits (15s)
  if (model.includes('sora-2')) {
      return (duration === '15') ? 45 : 30;
  }
  // Veo HQ: 250 credits
  if (model.includes('generate-preview') && !model.includes('fast')) {
      return 250;
  }
  // Veo Fast: 60 credits
  if (model.includes('fast')) {
      return 60;
  }
  
  // Default fallback (safe high estimate)
  return 250;
};

// Function to fetch credits
export const fetchCredits = async (apiKey: string): Promise<number> => {
  try {
    const response = await fetch(`${BASE_URL}/chat/credit`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!response.ok) return 0;
    const result = await response.json();
    return result.data || 0;
  } catch {
    return 0;
  }
};

// Helper to get download URL for any file
export const getDownloadUrl = async (apiKey: string, fileUrl: string): Promise<string> => {
    try {
        const response = await fetch(`${BASE_URL}/common/download-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ url: fileUrl })
        });
        
        const result = await response.json();
        if (result.code === 200 && result.data) {
            return result.data;
        }
        return fileUrl; // Fallback
    } catch (e) {
        console.warn("Failed to get secure download URL", e);
        return fileUrl;
    }
};

export const generateVeoVideo = async (
  apiKey: string,
  prompt: string,
  startImageUrl: string | null,
  endImageUrl: string | null,
  settings: VideoSettings,
  onStatusUpdate: (status: string) => void
): Promise<{blob: Blob, remoteUrl: string}> => {
  
  const endpoint = `${JOB_URL}/createTask`;
  const isSora = settings.model.startsWith('sora');
  
  // 1. Determine Model Name based on Input Type
  // Specification: "sora-2-image-to-video" vs "sora-2-text-to-video"
  let modelName = settings.model;
  
  if (isSora) {
     const hasImage = !!startImageUrl;
     
     // Normalize base name (remove existing suffixes if any)
     let baseModel = modelName.replace('-text-to-video', '').replace('-image-to-video', '');
     
     // Append correct suffix
     if (hasImage) {
         modelName = `${baseModel}-image-to-video`;
     } else {
         modelName = `${baseModel}-text-to-video`;
     }
  }

  // 2. Construct Input Object
  const input: any = {
      prompt: prompt,
  };

  // Aspect Ratio Logic: Sora uses 'landscape'/'portrait', Veo uses '16:9'/'9:16'
  if (isSora) {
      input.aspect_ratio = settings.aspectRatio === '16:9' ? 'landscape' : 'portrait';
  } else {
      input.aspect_ratio = settings.aspectRatio;
  }

  // Add specific params based on model type
  if (isSora) {
      input.n_frames = settings.duration || "10";
      input.remove_watermark = settings.removeWatermark ?? true;
      
      if (settings.model.includes('pro')) {
          input.size = settings.size || 'standard';
      }

      // Sora Image Input (Required Array format)
      if (startImageUrl) {
         input.image_urls = [startImageUrl];
      }
  } else {
      // Veo Specifics
      if (startImageUrl) input.image_urls = [startImageUrl];
      if (endImageUrl) {
          if (!input.image_urls) input.image_urls = [];
          input.image_urls.push(endImageUrl);
      }
  }

  const payload: any = {
      model: modelName,
      input: input
  };
  
  // Only add callBackUrl if needed/configured (avoid sending empty string)
  // payload.callBackUrl = ""; 

  try {
    onStatusUpdate(`Requesting ${modelName}...`);
    console.log("[VeoService] Request:", endpoint, JSON.stringify(payload, null, 2));

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("API Error Response:", response.status, errorData);
      
      if (response.status === 402) throw new Error("Insufficient Credits (402).");
      if (response.status === 429) throw new Error("Rate Limit Exceeded (429).");
      throw new Error(`API Request Failed: ${errorData.msg || errorData.message || response.statusText}`);
    }

    const result: KieResponse = await response.json();
    
    // Check logical codes
    if (result.code === 402) throw new Error("Insufficient Credits (402).");
    if (result.code !== 200 || !result.data?.taskId) {
      throw new Error(`Task Rejected: ${result.msg}`);
    }

    const taskId = result.data.taskId;
    onStatusUpdate(`Task Started (ID: ${taskId.slice(-6)})... Polling...`);

    let videoUrl: string | undefined;
    let attempts = 0;
    const maxAttempts = 240; // 20 minutes timeout

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); 
      attempts++;

      try {
        // GET /api/v1/jobs/recordInfo?taskId=...
        const pollUrl = `${JOB_URL}/recordInfo?taskId=${taskId}`;
        
        const statusResponse = await fetch(pollUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (statusResponse.ok) {
            const statusJson = await statusResponse.json();
            const data = statusJson.data || {};
            
            // Normalize status string (API returns 'state': 'success' | 'fail' | 'generating' | 'queuing')
            const status = (data.state || data.status || '').toUpperCase();
            console.log(`[VeoService] Poll ${taskId}: ${status}`);

            if (status === 'SUCCESS' || status === 'SUCCEEDED' || status === 'COMPLETED') {
                // Success! Extract URL from resultJson
                if (data.resultJson) {
                    try {
                        const resObj = JSON.parse(data.resultJson);
                        // Extract resultUrls[0]
                        if (resObj.resultUrls && Array.isArray(resObj.resultUrls) && resObj.resultUrls.length > 0) {
                             videoUrl = resObj.resultUrls[0];
                        } else {
                             videoUrl = resObj.videoUrl || resObj.url;
                        }
                    } catch (e) {
                        console.error("Failed to parse resultJson", e);
                    }
                }
                
                // Fallback to direct fields if resultJson parsing failed or was empty
                if (!videoUrl) videoUrl = data.videoUrl || data.url;

                if (!videoUrl) {
                     onStatusUpdate("Generation marked success, but no URL found yet...");
                } else {
                     onStatusUpdate("Success. Fetching video...");
                }
            } else if (status === 'FAIL' || status === 'FAILED') {
                throw new Error(`Task Failed: ${data.failMsg || data.error || 'Unknown error'}`);
            } else {
                onStatusUpdate(`Status: ${status}...`);
            }
        }
      } catch (pollError: any) {
         if (pollError.message.includes("Task Failed")) throw pollError;
         console.warn("Polling transient error:", pollError);
      }
    }

    if (!videoUrl) {
      throw new Error(`Timed out waiting for video generation.`);
    }

    onStatusUpdate("Downloading video...");
    
    // Attempt secure download URL resolution (mostly for Veo)
    let downloadUrl = videoUrl;
    if (!isSora) {
        // Only try this for Veo or internal storage URLs. 
        // Sora often returns external expiring links directly.
        downloadUrl = await getDownloadUrl(apiKey, videoUrl);
    }

    try {
        const videoRes = await fetch(downloadUrl);
        if (!videoRes.ok) throw new Error(`Failed to download video bytes (${videoRes.status})`);
        const videoBlob = await videoRes.blob();
        return { blob: videoBlob, remoteUrl: videoUrl };
    } catch (downloadError: any) {
        throw new Error(`Download failed: ${downloadError.message}`);
    }

  } catch (error: any) {
    console.error("Service Error:", error);
    throw error; 
  }
};
