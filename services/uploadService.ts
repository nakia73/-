
const KIE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-stream-upload';

export const uploadFileToKie = async (file: File, apiKey: string): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploadPath', 'veo-studio-uploads');
  // Optional: Add fileName
  formData.append('fileName', `${Date.now()}-${file.name}`);

  try {
    const response = await fetch(KIE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
        // Note: Do NOT set Content-Type header when using FormData, browser does it automatically with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Upload API Error (${response.status}): ${errText.substring(0, 100)}`);
    }

    const result = await response.json();

    // Fix: API might return downloadUrl OR fileUrl. Check both.
    const finalUrl = result.data?.downloadUrl || result.data?.fileUrl;

    if (!result.success || !finalUrl) {
      // Sometimes success is false but msg has details
      throw new Error(result.msg || 'Failed to upload file to Kie.ai');
    }

    return finalUrl;

  } catch (error: any) {
    console.error("Kie Upload Error:", error);
    throw new Error(error.message || 'Image upload failed');
  }
};
