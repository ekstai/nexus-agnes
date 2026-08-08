import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  UserPreferenceDto,
  UpdatePreferenceRequest,
} from '@shared/api.interface';

export async function getPreference(): Promise<UserPreferenceDto> {
  try {
    logger.info('Fetching user preferences');
    const response = await axiosForBackend({
      url: '/api/preferences',
      method: 'GET',
    });
    return response.data as UserPreferenceDto;
  } catch (error: unknown) {
    logger.error('获取用户偏好失败', error);
    throw error;
  }
}

export async function updatePreference(
  data: UpdatePreferenceRequest,
): Promise<UserPreferenceDto> {
  try {
    logger.info('Updating user preferences');
    const response = await axiosForBackend({
      url: '/api/preferences',
      method: 'PUT',
      data,
    });
    return response.data as UserPreferenceDto;
  } catch (error: unknown) {
    logger.error('更新用户偏好失败', error);
    throw error;
  }
}
