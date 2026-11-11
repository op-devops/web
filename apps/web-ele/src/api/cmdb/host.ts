import { requestClient } from '#/api/request';

// cmdb 网关的接口统一加 /cmdb 前缀,由代理改写到 APISIX 的 /cmdb-api
// (开发:vite.config.ts;生产:docker/openresty/nginx.conf)
const BASE = '/cmdb/hosts';

export namespace CmdbHostApi {
  export interface Host {
    id: string;
    name: string;
    hostname: string;
    port: number;
    username: string;
    desc: string;
    /** SSH 连通性验证是否通过。验证功能还没迁移，新建的都是 false */
    is_verified: boolean;
    /** 是否配置了独立私钥。私钥本身不会返回 */
    has_pkey: boolean;
    category_id: string;
    created_at: string;
    created_by: string;
  }

  export interface ListParams {
    keyword?: string;
    category_id?: string;
    page?: number;
    page_size?: number;
  }

  export interface ListResult {
    hosts: Host[];
    pagination: { page: number; page_size: number; total: number };
  }

  export interface CreateParams {
    name: string;
    hostname: string;
    port: number;
    username: string;
    /** 留空 = 使用平台全局密钥 */
    pkey?: string;
    desc?: string;
    category_id?: string;
  }

  export interface UpdateParams {
    name: string;
    hostname: string;
    port: number;
    username: string;
    /** 不传 = 不修改；空串 = 清除，改用全局密钥；非空 = 替换 */
    pkey?: string;
    desc?: string;
    category_id?: string;
  }

  export interface VerifyResult {
    is_verified: boolean;
    /** 验证失败时的原因;成功时为空 */
    message: string;
  }
}



export function listHostsApi(params: CmdbHostApi.ListParams) {
  return requestClient.get<CmdbHostApi.ListResult>(BASE, { params });
}

export function getHostApi(id: string) {
  return requestClient.get<CmdbHostApi.Host>(`${BASE}/${id}`);
}

export function createHostApi(data: CmdbHostApi.CreateParams) {
  return requestClient.post<CmdbHostApi.Host>(BASE, data);
}

export function updateHostApi(id: string, data: CmdbHostApi.UpdateParams) {
  return requestClient.put<CmdbHostApi.Host>(`${BASE}/${id}`, data);
}

export function deleteHostApi(id: string) {
  return requestClient.delete(`${BASE}/${id}`);
}

/** 验证主机 SSH 连通性。password 只在首次验证时传,用完即丢、不保存 */
export function verifyHostApi(id:string,password = '') {
  return requestClient.post<CmdbHostApi.VerifyResult>(`${BASE}/${id}/verify`, { password })
}
