import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

interface SelfResult {
  id: string;
  username: string;
  nickname: string;
  email: string;
  is_active: boolean;
  is_supper: boolean;
  last_login: string;
  last_ip: string;
  roles: string[];
  /** 扁平权限码 "模块.页面.动作"；is_supper 为 true 时后端返回空数组但应视为全部权限 */
  perms: string[];
}

/** 超管在后端绕过权限码检查；前端用这个通配符让菜单/按钮也全部放行 */
export const SUPER_CODE = '*';

// authStore 会用 Promise.all 并发调 getUserInfoApi 和 getAccessCodesApi,
// 两者都要 /self 的数据。共享同一个在途 Promise:既避免"后者读到前者还没写入的
// 缓存"这种顺序依赖,也不会真的请求两次。
let inflight: null | Promise<SelfResult> = null;

function fetchSelf(): Promise<SelfResult> {
  if (!inflight) {
    inflight = requestClient
      .get<SelfResult>('/self')
      .finally(() => {
        // 请求结束就释放,下次(重新登录/刷新)拿到的是新数据而不是旧快照
        inflight = null;
      });
  }
  return inflight;
}

/** 获取当前登录用户（auth 网关 GET /self） */
export async function getUserInfoApi(): Promise<UserInfo> {
  const self = await fetchSelf();
  return {
    avatar: '',
    desc: self.email ?? '',
    homePath: '',
    realName: self.nickname || self.username,
    // roles 里同时放角色名和权限码。
    // vben 的路由过滤(generateRoutesByFrontend)拿的是 userInfo.roles 去比
    // route.meta.authority,不是 accessCodes——只放角色名的话,meta.authority 里
    // 写权限码就永远匹配不上,路由会被整个过滤掉变成 404。
    // accessCodes 仍然只放权限码,供页面里的 hasAccessByCodes 做按钮级控制。
    roles: [...(self.roles ?? []), ...accessCodesOf(self)],
    token: '',
    userId: self.id,
    username: self.username,
  };
}

/** 超管映射成通配符，与后端 is_supper 绕过检查的语义对齐 */
function accessCodesOf(self: SelfResult): string[] {
  return self.is_supper ? [SUPER_CODE] : (self.perms ?? []);
}

/** 获取权限码（按钮级控制用） */
export async function getAccessCodesApi(): Promise<string[]> {
  return accessCodesOf(await fetchSelf());
}
