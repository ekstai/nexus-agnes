import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  PluginMarketResponse,
  PluginDto,
  PluginConfigResponse,
  SavePluginConfigRequest,
} from '@shared/api.interface';

export async function getMarket(): Promise<PluginMarketResponse> {
  try {
    const response = await axiosForBackend({
      url: '/api/plugins/market',
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error('获取插件市场列表失败', error);
    throw error;
  }
}

export async function install(pluginKey: string): Promise<PluginDto> {
  try {
    const response = await axiosForBackend({
      url: '/api/plugins/install',
      method: 'POST',
      data: { pluginKey },
    });
    return response.data;
  } catch (error) {
    logger.error(`安装插件失败: ${pluginKey}`, error);
    throw error;
  }
}

export async function uninstall(id: string): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend({
      url: `/api/plugins/${id}/uninstall`,
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    logger.error(`卸载插件失败: ${id}`, error);
    throw error;
  }
}

export async function setEnabled(
  id: string,
  enabled: boolean,
): Promise<PluginDto> {
  try {
    const response = await axiosForBackend({
      url: `/api/plugins/${id}/enable`,
      method: 'PATCH',
      data: { enabled },
    });
    return response.data;
  } catch (error) {
    logger.error(`设置插件启用状态失败: ${id}`, error);
    throw error;
  }
}

export async function getConfig(id: string): Promise<PluginConfigResponse> {
  try {
    const response = await axiosForBackend({
      url: `/api/plugins/${id}/config`,
      method: 'GET',
    });
    return response.data;
  } catch (error) {
    logger.error(`获取插件配置失败: ${id}`, error);
    throw error;
  }
}

export async function saveConfig(
  id: string,
  data: SavePluginConfigRequest,
): Promise<{ success: boolean; configValues: Record<string, any> }> {
  try {
    const response = await axiosForBackend({
      url: `/api/plugins/${id}/config`,
      method: 'PUT',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error(`保存插件配置失败: ${id}`, error);
    throw error;
  }
}
