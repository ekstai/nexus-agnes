import { logger } from '@lark-apaas/client-toolkit/logger';
import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';

export * as chat from './chat';
export * as modelConfig from './model-config';
export * as plugin from './plugin';
export * as preference from './preference';
export * as data from './data';
export * as memory from './memory';
export * as update from './update';


// Add more API functions here, use axios instance (`axiosForBackend`) to make requests.
// 
// 使用示例：
// export async function getUserData(userId: string) {
//   try {
//     const response = await axiosForBackend({
//       url: `/api/users/${userId}`,
//       method: 'GET'
//     });
//     return response.data;
//   } catch (error) {
//     logger.error('获取用户数据失败', error);
//     throw error;
//   }
// }
