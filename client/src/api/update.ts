import { logger } from '@lark-apaas/client-toolkit/logger';

const UPDATE_REPO_OWNER = 'ekstai';
const UPDATE_REPO_NAME = 'nexus-agnes';
const RELEASES_API_URL = `https://api.github.com/repos/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}/releases/latest`;

export const APP_VERSION = '2.2.0';

export interface UpdateCheckInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  downloadUrl: string | null;
  releaseUrl: string;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const va = pa[i] || 0;
    const vb = pb[i] || 0;
    if (va !== vb) return va > vb ? 1 : -1;
  }
  return 0;
}

/**
 * 检查 GitHub Releases 最新版本，对比当前 APP_VERSION
 */
export async function checkForUpdate(): Promise<UpdateCheckInfo | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(RELEASES_API_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    });
    clearTimeout(timer);
    if (!response.ok) {
      logger.error('检查更新失败', response.status);
      return null;
    }
    const release = await response.json();
    const latestTag = String(release.tag_name || '').replace(/^v/i, '');
    const latestVersion = latestTag || String(release.name || '');
    const asset = Array.isArray(release.assets)
      ? release.assets.filter(
          (a: { name?: string }) => a.name && /\.exe$/i.test(a.name),
        )[0] || null
      : null;
    const downloadUrl = asset
      ? asset.browser_download_url || null
      : null;

    return {
      currentVersion: APP_VERSION,
      latestVersion,
      hasUpdate: latestVersion !== '' && compareVersions(latestVersion, APP_VERSION) > 0,
      releaseName: String(release.name || release.tag_name || ''),
      releaseNotes: String(release.body || ''),
      publishedAt: String(release.published_at || ''),
      downloadUrl,
      releaseUrl: release.html_url || '',
    };
  } catch (error) {
    logger.error('检查更新失败(网络异常)', error);
    return null;
  }
}