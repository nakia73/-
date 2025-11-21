
import { VideoSettings } from "../types";

const BASE_URL = "https://api.kie.ai/api/v1";
const VEO_URL = `${BASE_URL}/veo`;
const JOB_URL = `${BASE_URL}/jobs`;

interface KieResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    status?: string; 
    state?: string; // Sora uses 'state'
    videoUrl?: string; 
    url?: string; 
    resultJson?: string; // Sora returns JSON string
    progress?: number;
    error?: string;
  };
}

const VEO_MODEL_MAP: Record<string, string> = {
  'veo-3.1-fast-generate-preview': 'veo3_fast',
  'veo-3.1-generate-preview': 'veo3', 
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
  
  const isSora = settings.model.startsWith('sora');
  
  let endpoint = "";
  let payload: any = {};

  if (isSora) {
     // --- SORA LOGIC ---
     endpoint = `${JOB_URL}/createTask`;
     
     // Determine actual model name based on input
     let soraModel = settings.model; // e.g. 'sora-2' or 'sora-2-pro'
     const hasImage = !!startImageUrl;
     
     if (hasImage) {
         soraModel = `${soraModel}-image-to-video`;
     } else {
         soraModel = `${soraModel}-text-to-video`;
     }
     
     // Construct Input
     const input: any = {
         prompt: prompt,
         aspect_ratio: settings.aspectRatio === '16:9' ? 'landscape' : 'portrait',
         n_frames: settings.duration || "10",
         remove_watermark: settings.removeWatermark ?? true
     };
     
     if (hasImage && startImageUrl) {
         input.image_urls = [startImageUrl];
     }
     
     if (settings.model.includes('pro')) {
         input.size = settings.size || 'standard';
     }

     payload = {
         model: soraModel,
         input: input,
         callBackUrl: ""
     };
     
  } else {
     // --- VEO LOGIC ---
     endpoint = `${VEO_URL}/generate`;
     const apiModel = VEO_MODEL_MAP[settings.model] || 'veo3_fast';
     
     payload = {
        prompt: prompt,
        model: apiModel,
        aspectRatio: settings.aspectRatio,
        enableTranslation: true, 
        callBackUrl: "" 
      };

      const imageUrls: string[] = [];
      if (startImageUrl) imageUrls.push(startImageUrl);
      if (endImageUrl) imageUrls.push(endImageUrl);

      if (imageUrls.length > 0) {
        payload.imageUrls = imageUrls;
        if (imageUrls.length === 2) {
          payload.generationType = "FIRST_AND_LAST_FRAMES_2_VIDEO";
        }
      } else {
        payload.generationType = "TEXT_2_VIDEO";
      }
  }

  try {
    onStatusUpdate(`Requesting ${isSora ? 'Sora' : 'Veo'} Generation...`);

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
      console.log("API Error Response:", response.status, errorData);
      
      if (response.status === 402) {
        throw new Error("Insufficient Credits (402). Please top up.");
      }
      if (response.status === 429) {
        throw new Error("Rate Limit Exceeded (429).");
      }
      throw new Error(`API Request Failed (${response.status}): ${errorData.msg || response.statusText}`);
    }

    const result: KieResponse = await response.json();
    
    if (result.code === 402) {
        throw new Error("Insufficient Credits (402).");
    }
    
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

      let statusResponse;
      try {
        // Polling endpoint differs for Sora vs Veo?
        // Veo: /veo/tasks/{id}
        // Sora: /jobs/recordInfo?taskId={id}
        
        const pollUrl = isSora 
            ? `${JOB_URL}/recordInfo?taskId=${taskId}`
            : `${VEO_URL}/tasks/${taskId}`;

        statusResponse = await fetch(pollUrl, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
      } catch (netError) {
        continue;
      }

      if (statusResponse.status === 400 && !isSora) {
         // Only Veo uses 400 for "processing" sometimes (deprecated but observed)
         // Sora 400 is an error.
         if (isSora) throw new Error("Bad Request (400) during polling.");
         onStatusUpdate(`Processing...`);
         continue;
      }
      
      if (statusResponse.ok) {
        let statusData;
        try {
             statusData = await statusResponse.json();
        } catch (e) { continue; }
        
        const data = statusData.data || {};
        // Unified status check
        const status = (data.status || data.state || '').toUpperCase();
        
        if (status === 'SUCCEEDED' || status === 'COMPLETED' || status === 'SUCCESS') {
          // Extraction Logic
          if (isSora && data.resultJson) {
              try {
                  const resObj = JSON.parse(data.resultJson);
                  videoUrl = resObj.resultUrls?.[0];
              } catch (e) {
                  console.error("Failed to parse Sora resultJson", e);
              }
          } else {
              videoUrl = data.videoUrl || data.url;
          }

          if (!videoUrl) {
             onStatusUpdate("Generation done, waiting for URL...");
             continue;
          }
          onStatusUpdate("Success. Fetching video...");
        } else if (status === 'FAILED' || status === 'FAIL') {
          throw new Error(`Task Failed: ${data.failMsg || data.error || 'Unknown error'}`);
        } else {
           onStatusUpdate(`Status: ${status}...`);
        }
      }
    }

    if (!videoUrl) {
      throw new Error(`Timed out waiting for video generation.`);
    }

    onStatusUpdate("Downloading video...");
    
    // Secure download URL
    // Sora URLs might be external (file.aiquickdraw.com), getDownloadUrl might fail or be unnecessary.
    // But let's try it, and fallback.
    let downloadUrl = videoUrl;
    if (!isSora) {
        downloadUrl = await getDownloadUrl(apiKey, videoUrl);
    }

    try {
        const videoRes = await fetch(downloadUrl);
        if (!videoRes.ok) {
            // Fallback for Sora if direct fetch fails (CORS?), usually they are public though.
            throw new Error(`Failed to download video`);
        }
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
