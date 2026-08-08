import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import { logger } from '@lark-apaas/client-toolkit/logger';
import type {
  UserStatsResponse,
  DataExportResponse,
  DataImportRequest,
  DataImportResponse,
} from '@shared/api.interface';

export async function getStats(): Promise<UserStatsResponse> {
  logger.info('Fetching user stats');
  const response = await axiosForBackend({
    url: '/api/data/stats',
    method: 'GET',
  });
  return response.data as UserStatsResponse;
}

export async function exportData(): Promise<DataExportResponse> {
  logger.info('Exporting user data');
  const response = await axiosForBackend({
    url: '/api/data/export',
    method: 'GET',
  });
  return response.data as DataExportResponse;
}

export async function importData(
  data: DataImportRequest,
): Promise<DataImportResponse> {
  logger.info('Importing user data');
  const response = await axiosForBackend({
    url: '/api/data/import',
    method: 'POST',
    data,
  });
  return response.data as DataImportResponse;
}

export async function clearData(): Promise<{ success: boolean }> {
  logger.info('Clearing user data');
  const response = await axiosForBackend({
    url: '/api/data/clear',
    method: 'DELETE',
  });
  return response.data as { success: boolean };
}
