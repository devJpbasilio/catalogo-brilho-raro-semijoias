/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Compresses and resizes an uploaded image file to ensure optimized database storage.
 * Resizes the image to fit within maxDim while maintaining aspect ratio,
 * and compresses it using JPEG format at the specified quality.
 *
 * @param file The uploaded File from the user's device.
 * @param maxDim Maximum width or height of the compressed image (default 600px).
 * @param quality Compression quality from 0 to 1 (default 0.7).
 * @returns A Promise resolving to a base64 Data URL.
 */
export function compressAndResizeImage(file: File, maxDim: number = 600, quality: number = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check if the file is an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Resize logic keeping aspect ratio
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          // Fallback to original base64 if canvas context is not supported
          resolve(event.target?.result as string);
          return;
        }

        // Fill background white for PNG transparency translation to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as optimized JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('Erro ao carregar a imagem para compressão.'));
      };
    };
    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo de imagem.'));
    };
  });
}
