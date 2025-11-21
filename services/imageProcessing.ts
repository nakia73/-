
export const fitImageToAspectRatio = (
  file: File,
  aspectRatio: '16:9' | '9:16' | 'portrait' | 'landscape'
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      // Determine target dimensions based on ratio
      // Use a standard HD base size
      let targetWidth = 1920;
      let targetHeight = 1080;

      if (aspectRatio === '9:16' || aspectRatio === 'portrait') {
        targetWidth = 1080;
        targetHeight = 1920;
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Fill with black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Calculate containment dimensions
      const scale = Math.min(targetWidth / img.width, targetHeight / img.height);
      const drawWidth = img.width * scale;
      const drawHeight = img.height * scale;
      const offsetX = (targetWidth - drawWidth) / 2;
      const offsetY = (targetHeight - drawHeight) / 2;

      // Draw image centered
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Export as file
      canvas.toBlob((blob) => {
        if (blob) {
          const newFile = new File([blob], file.name, { type: 'image/jpeg' });
          resolve(newFile);
        } else {
          reject(new Error("Canvas to Blob failed"));
        }
      }, 'image/jpeg', 0.95);
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
};
