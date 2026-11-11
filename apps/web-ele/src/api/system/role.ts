import { requestClient } from '#/api/request';

/** 权限树：{ 模块: { 页面: [动作, ...] } } */
export type PagePerms = Record<string, Record<string, string[]>>;

export namespace SystemRoleApi {
  export interface Role {
    id: string;
    name: string;
    desc: string;
    page_perms: PagePerms;
    created_at: string;
    /** 有多少个未删除用户在用这个角色 */
    used: number;
    /** true=可管理全部主机分类(含未来新增) */
    host_category_all: boolean;
    /** 可管理的分类ID,含哨兵 "none"=未分类 */
    host_categories: string[];
  }
}

export function listRolesApi() {
  return requestClient.get<SystemRoleApi.Role[]>('/roles');
}

export function createRoleApi(data: { desc?: string; name: string; }) {
  return requestClient.post<SystemRoleApi.Role>('/roles', data);
}

export function updateRoleApi(id: string, data: { desc?: string; name: string; }) {
  return requestClient.put<SystemRoleApi.Role>(`/roles/${id}`, data);
}

export function deleteRoleApi(id: string) {
  return requestClient.delete(`/roles/${id}`);
}

/** 改功能权限:只影响下次登录,不会踢掉在线用户 */
export function updateRolePermsApi(id: string, page_perms: PagePerms) {
  return requestClient.put<SystemRoleApi.Role>(`/roles/${id}/perms`, {
    page_perms,
  });
}

/** 配主机分类数据权限:同样只影响下次登录 */
export function updateRoleHostCategoriesApi(
  id: string,
  data: { category_ids: string[]; host_category_all: boolean; },
) {
  return requestClient.put<SystemRoleApi.Role>(`/roles/${id}/host-categories`, data);
}
