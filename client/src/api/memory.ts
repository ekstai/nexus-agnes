import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  MemoryDto,
  MemoryListResponse,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  MemoryFlashbackResponse,
} from '@shared/api.interface';

const PREFIX = '/api/memories';

export async function list(category?: string): Promise<MemoryListResponse> {
  try {
    const response = await axiosForBackend({
      url: PREFIX,
      method: 'GET',
      params: category ? { category } : undefined,
    });
    return response.data;
  } catch (error) {
    logger.error('获取记忆库失败', error);
    throw error;
  }
}

export async function flashback(query: string): Promise<MemoryFlashbackResponse> {
  try {
    const response = await axiosForBackend({
      url: `${PREFIX}/flashback`,
      method: 'GET',
      params: { q: query },
    });
    return response.data;
  } catch (error) {
    logger.error('记忆闪回失败', error);
    throw error;
  }
}

export async function create(data: CreateMemoryRequest): Promise<MemoryDto> {
  try {
    const response = await axiosForBackend({
      url: PREFIX,
      method: 'POST',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('创建记忆失败', error);
    throw error;
  }
}

export async function update(id: string, data: UpdateMemoryRequest): Promise<MemoryDto> {
  try {
    const response = await axiosForBackend({
      url: `${PREFIX}/${id}`,
      method: 'PATCH',
      data,
    });
    return response.data;
  } catch (error) {
    logger.error('更新记忆失败', error);
    throw error;
  }
}

export async function toggleStar(id: string): Promise<MemoryDto> {
  try {
    const response = await axiosForBackend({
      url: `${PREFIX}/${id}/star`,
      method: 'POST',
    });
    return response.data;
  } catch (error) {
    logger.error('标记记忆失败', error);
    throw error;
  }
}

export async function remove(id: string): Promise<{ success: boolean }> {
  try {
    const response = await axiosForBackend({
      url: `${PREFIX}/${id}`,
      method: 'DELETE',
    });
    return response.data;
  } catch (error) {
    logger.error('删除记忆失败', error);
    throw error;
  }
}