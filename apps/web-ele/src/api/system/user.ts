import { requestClient } from '#/api/request';

export namespace SystemUserApi {
  export interface User {
    id: string;
    username: string;
    nickname: string;
    email: string;
    is_active: boolean;
    is_supper: boolean;
    last_login: string;
    last_ip: string;
    created_at: string;
    role_ids: string[];
  }

  export interface ListParams {
    keyword?: string;
    page?: number;
    page_size?: number;
  }

  export interface ListResult {
    users: User[];
    pagination: { page: number; page_size: number; total: number };
    online_ids: string[];
  }

  export interface CreateParams {
    username: string;
    password: string;
    nickname?: string;
    email?: string;
    is_supper?: boolean;
    role_ids?: string[];
  }

  export interface UpdateParams {
    nickname?: string;
    email?: string;
    is_supper?: boolean;
    role_ids?: string[];
  }
}

export function listUsersApi(params: SystemUserApi.ListParams) {
  return requestClient.get<SystemUserApi.ListResult>('/users', { params });
}

export function createUserApi(data: SystemUserApi.CreateParams) {
  return requestClient.post<SystemUserApi.User>('/users', data);
}

export function updateUserApi(id: string, data: SystemUserApi.UpdateParams) {
  return requestClient.put<SystemUserApi.User>(`/users/${id}`, data);
}

export function deleteUserApi(id: string) {
  return requestClient.delete(`/users/${id}`);
}

/** 管理员重置他人密码（会踢掉该用户所有登录态） */
export function resetPasswordApi(id: string, password: string) {
  return requestClient.put(`/users/${id}/password`, { password });
}

/** 启用/禁用（禁用会立即踢掉该用户所有登录态） */
export function setUserActiveApi(id: string, is_active: boolean) {
  return requestClient.put(`/users/${id}/active`, { is_active });
}

/** 强制下线：踢掉该用户所有登录态（收回权限后手动调用立即生效） */
export function kickUserApi(id: string) {
  return requestClient.post<{ killed: number }>(`/users/${id}/kick`);
}
