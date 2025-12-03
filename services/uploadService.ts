
const KIE_UPLOAD_URL = 'https://kieai.redpandaai.co/api/file-base64-upload';

// Helper to convert File to Base64 Data URL
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

export const uploadFileToKie = async (file: File, apiKey: string): Promise<string> => {
  try {
    // 1. Convert file to Base64
    const base64Data = await fileToBase64(file);

    // 2. Prepare JSON Payload
    const payload = {
      base64Data: base64Data,
      uploadPath: 'veo-studio-uploads',
      fileName: `${Date.now()}-${file.name}`
    };

    // 3. Send Request
    const response = await fetch(KIE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Upload API Error (${response.status}): ${errText.substring(0, 100)}`);
    }

    const result = await response.json();

    // 4. Extract URL
    const finalUrl = result.data?.downloadUrl;

    if (!result.success || !finalUrl) {
      throw new Error(result.msg || 'Failed to upload file to Kie.ai');
    }

    return finalUrl;

  } catch (error: any) {
    console.error("Kie Upload Error:", error);
    throw new Error(error.message || 'Image upload failed');
  }
};
