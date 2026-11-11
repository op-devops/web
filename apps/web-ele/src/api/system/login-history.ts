import { requestClient } from '#/api/request';

export namespace LoginHistoryApi {
  export interface Item {
    id: string;
    username: string;
    ip: string;
    user_agent: string;
    message: string;
    is_success: boolean;
    created_at: string;
  }

  export interface ListResult {
    items: Item[];
    pagination: { page: number; page_size: number; total: number };
  }
}

export function listLoginHistoryApi(params: {
  username?: string;
  page?: number;
  page_size?: number;
}) {
  return requestClient.get<LoginHistoryApi.ListResult>('/login-history', {
    params,
  });
}
