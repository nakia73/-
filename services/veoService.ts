
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

// Function to fetch credits
export const fetchCredits = async (apiKey: string): Promise<number> => {
  try {
    // Note: Credit endpoint might vary. Keeping chat/credit as generic fallback 
    // or assuming it shares the same wallet.
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
  
  // 1. Determine Model Name
  let modelName = settings.model;
  
  // Specific logic for Sora naming conventions if needed
  if (isSora) {
     const hasImage = !!startImageUrl;
     // If model is just 'sora-2' or 'sora-2-pro', append type
     // If it already has it, leave it.
     if (!modelName.includes('text-to-video') && !modelName.includes('image-to-video')) {
         if (hasImage) {
             modelName = `${modelName}-image-to-video`;
         } else {
             modelName = `${modelName}-text-to-video`;
         }
     }
  }

  // 2. Construct Input Object (Unified for createTask)
  const input: any = {
      prompt: prompt,
      aspect_ratio: settings.aspectRatio === '16:9' ? 'landscape' : 'portrait',
  };

  // Add specific params based on model type
  if (isSora) {
      input.n_frames = settings.duration || "10";
      input.remove_watermark = settings.removeWatermark ?? true;
      if (settings.model.includes('pro')) {
          input.size = settings.size || 'standard';
      }
      // Sora Image Input
      if (startImageUrl) {
         // Some versions use image_urls (array), some image_url (string). 
         // Based on doc with resultJson having lists, array is safer or try both if undocumented.
         // We will use image_urls as array based on typical multi-input patterns.
         input.image_urls = [startImageUrl];
      }
  } else {
      // Veo Specifics (if any differ from standard)
      // Veo might use 'image_url' or 'image_urls'. 
      // We'll pass image_urls array to be consistent with modern Kie APIs.
      if (startImageUrl) input.image_urls = [startImageUrl];
      if (endImageUrl) {
          if (!input.image_urls) input.image_urls = [];
          input.image_urls.push(endImageUrl);
      }
      
      // Veo sometimes requires explicit generation type in input?
      // If we use the unified createTask, 'model' usually dictates logic.
  }

  const payload = {
      model: modelName,
      input: input,
      callBackUrl: "" 
  };

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
    
    if (result.code === 402) throw new Error("Insufficient Credits (402).");
    if (result.code !== 200 || !result.data?.taskId) {
      throw new Error(`Task Rejected: ${result.msg}`);
    }

    const taskId = result.data.taskId;
    onStatusUpdate(`Task Started (ID: ${taskId.slice(-6)})... Polling...`);

    let videoUrl: string | undefined;
    let attempts = 0;
    const maxAttempts = 240; // 20 minutes

    while (!videoUrl && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); 
      attempts++;

      try {
        // Unified Polling Endpoint
        const pollUrl = `${JOB_URL}/recordInfo?taskId=${taskId}`;
        
        const statusResponse = await fetch(pollUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        if (statusResponse.ok) {
            const statusJson = await statusResponse.json();
            const data = statusJson.data || {};
            
            // Normalize status string
            const status = (data.state || data.status || '').toUpperCase();
            console.log(`[VeoService] Poll ${taskId}: ${status}`);

            if (status === 'SUCCESS' || status === 'SUCCEEDED' || status === 'COMPLETED') {
                // Success! Extract URL.
                if (data.resultJson) {
                    try {
                        const resObj = JSON.parse(data.resultJson);
                        // Check common fields
                        videoUrl = resObj.resultUrls?.[0] || resObj.videoUrl || resObj.url;
                    } catch (e) {
                        console.error("Failed to parse resultJson", e);
                        // Fallback if resultJson is just the url string? Unlikely.
                    }
                }
                
                // Fallback to direct fields
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
