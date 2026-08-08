import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  ModelConfigDto,
  ModelConfigListResponse,
  CreateModelConfigRequest,
  UpdateModelConfigRequest,
  ModelTestResponse,
  FetchModelsRequest,
  FetchModelsResponse,
} from '@shared/api.interface';

export async function list(): Promise<ModelConfigListResponse> {
  logger.info('Fetching model config list');
  const response = await axiosForBackend({
    url: '/api/model-configs',
    method: 'GET',
  });
  return response.data as ModelConfigListResponse;
}

export async function create(data: CreateModelConfigRequest): Promise<ModelConfigDto> {
  logger.info('Creating model config');
  const response = await axiosForBackend({
    url: '/api/model-configs',
    method: 'POST',
    data,
  });
  return response.data as ModelConfigDto;
}

export async function update(id: string, data: UpdateModelConfigRequest): Promise<ModelConfigDto> {
  logger.info(`Updating model config: ${id}`);
  const response = await axiosForBackend({
    url: `/api/model-configs/${id}`,
    method: 'PUT',
    data,
  });
  return response.data as ModelConfigDto;
}

export async function remove(id: string): Promise<{ success: boolean }> {
  logger.info(`Deleting model config: ${id}`);
  const response = await axiosForBackend({
    url: `/api/model-configs/${id}`,
    method: 'DELETE',
  });
  return response.data as { success: boolean };
}

export async function test(id: string): Promise<ModelTestResponse> {
  logger.info(`Testing model config: ${id}`);
  const response = await axiosForBackend({
    url: `/api/model-configs/${id}/test`,
    method: 'POST',
  });
  return response.data as ModelTestResponse;
}

export async function fetchModels(
  data: FetchModelsRequest
): Promise<FetchModelsResponse> {
  logger.info('Fetching models from API URL');
  const response = await axiosForBackend({
    url: '/api/model-configs/fetch-models',
    method: 'POST',
    data,
  });
  return response.data as FetchModelsResponse;
}
