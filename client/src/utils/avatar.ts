// 将图片文件压缩为方形 dataURL（用于头像本地存储）
export function fileToSquareDataUrl(file: File, maxSize = 128): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = maxSize;
          canvas.height = maxSize;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(reader.result as string);
            return;
          }
          const side = Math.min(img.width, img.height) || 1;
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, maxSize, maxSize);
          resolve(canvas.toDataURL('image/png'));
        } catch (error) {
          reject(error instanceof Error ? error : new Error('图片处理失败'));
        }
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}
