// 本地系统能力(桌面 Electron / 手机浏览器双适配)
// 用于内置插件: system-file-tools(电脑自动化) 与 system-camera(相机助手)

function pickFile(
  accept: string,
  capture?: string,
): Promise<{ name: string; size: number; mimeType: string; file: File }> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) {
      input.setAttribute('capture', capture);
    }
    input.style.display = 'none';
    input.addEventListener(
      'change',
      () => {
        const file = input.files && input.files[0];
        if (!file) {
          reject(new Error('未选择文件'));
          return;
        }
        resolve({
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          file,
        });
      },
      { once: true },
    );
    input.addEventListener(
      'cancel',
      () => reject(new Error('已取消选择')),
      { once: true },
    );
    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 60000);
  });
}

export function isDesktop(): boolean {
  return !!(window.nexusDesktop && window.nexusDesktop.isDesktop);
}

export function getWorkspaceDir(): Promise<string> {
  if (window.nexusDesktop?.getWorkspaceDir) {
    return window.nexusDesktop.getWorkspaceDir();
  }
  return Promise.resolve('浏览器环境(不可用)');
}

/** 创建文件: 桌面写盘; 手机/浏览器触发下载 */
export async function createFile(args: {
  fileName?: string;
  content?: string;
  dir?: string;
}): Promise<{ success: boolean; path?: string; error?: string; downloaded?: boolean }> {
  const fileName = String(args.fileName || 'agnès-notes.txt').replace(/[\\/:*?"<>|]/g, '_');
  const content = String(args.content ?? '');
  if (window.nexusDesktop?.createFile) {
    const res = await window.nexusDesktop.createFile({ fileName, content, dir: args.dir });
    return {
      ok: res.success,
      filePath: res.path,
      error: res.error,
    };
  }
  // 手机/浏览器: 通过下载创建文件
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return { ok: true, downloaded: true };
}

/** 读取照片: 桌面弹窗(IPC), 手机文件选择 */
export async function readPhoto(): Promise<{
  ok: boolean;
  name?: string;
  size?: number;
  dataUrl?: string;
  error?: string;
}> {
  if (window.nexusDesktop?.readPhoto) {
    const res = await window.nexusDesktop.readPhoto();
    if (res.canceled) return { ok: false, error: '已取消选择' };
    if (!res.success) return { ok: false, error: res.error };
    return { ok: true, name: res.name, size: res.size, dataUrl: res.dataUrl };
  }
  try {
    const picked = await pickDesktop('image/*');
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsDataURL(picked.file);
    });
    return { ok: true, name: picked.name, size: picked.size, dataUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** 读取文本文件: 桌面弹窗, 手机文件选择 */
export async function readTextFile(): Promise<{
  ok: boolean;
  name?: string;
  content?: string;
  error?: string;
}> {
  if (window.nexusDesktop?.readTextFile) {
    const res = await window.nexusDesktop.readTextFile();
    if (res.canceled) return { ok: false, error: '已取消选择' };
    if (!res.success) return { ok: false, error: res.error };
    return { ok: true, name: res.name, content: res.content };
  }
  try {
    const { file } = await pickDesktop(
      '.txt,.md,.json,.js,.ts,.py,.html,.css,.log,.csv,.xml,.yml,.yaml',
    );
    const content = await file.text();
    return { ok: true, name: file.name, content };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** 打开文件夹: 仅桌面 */
export async function openFolder(folderPath?: string): Promise<{ ok: boolean; error?: string }> {
  if (window.nexusDesktop?.openFolder) {
    const res = await window.nexusDesktop.openFolder(folderPath);
    return { ok: res.success, error: res.shellError ? `打开失败: ${res.shellError}` : undefined };
  }
  return { ok: false, error: '手机端不支持打开系统目录' };
}

/** 相机拍照(桌面+手机均使用 getUserMedia; 不可用时回退为文件选择) */
export async function capturePhoto(maxBytes = 1.5 * 1024 * 1024): Promise<{
  ok: boolean;
  dataUrl?: string;
  source?: string;
  error?: string;
}> {
  const preferFile = !navigator.mediaDevices?.getUserMedia;
  if (!preferFile) {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' },
        audio: false,
      });
      const video = document.createElement('video');
      video.srcObject = mediaStream;
      video.setAttribute('playsinline', 'true');
      video.style.display = 'none';
      document.body.appendChild(video);
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(resolve).catch(resolve);
        };
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 600));
      const canvas = document.createElement('canvas');
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('画布初始化失败');
      ctx.drawImage(video, 0, 0, width, height);
      mediaStream.getTracks().forEach((t) => t.stop());
      video.remove();
      let quality = 0.92;
      let dataUrl = canvas.toDataURL('image/jpeg', quality);
      while (dataUrl.length > maxBytes && quality > 0.5) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }
      return { ok: true, dataUrl, source: 'camera' };
    } catch (err) {
      // 摄像头不可用时回退选择文件
      const fallback = await readPhoto();
      return fallback.ok
        ? { ok: true, dataUrl: fallback.dataUrl, source: 'file-fallback' }
        : { ok: false, error: `摄像头不可用: ${err instanceof Error ? err.message : String(err)}` };
    }
  }
  const fallback = await readPhoto();
  return fallback.ok
    ? { ok: true, dataUrl: fallback.dataUrl, source: 'file' }
    : { ok: false, error: fallback.error };
}