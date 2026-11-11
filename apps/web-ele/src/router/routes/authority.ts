import type { RouteRecordRaw } from 'vue-router';

import { SUPER_CODE } from '#/api/core/user';

// 路由上 meta.authority 的写法约定。
//
// authority 里写的是后端下发的扁平权限码(模块.页面.动作),必须跟三处一致:
//   1. 网关接口上的 RequirePerm(...)
//   2. views/system/codes.ts(角色授权页能勾选的码)
//   3. 路由表
// 没权限的菜单直接不显示(vben 的 generateRoutesByFrontend 会把整条路由过滤掉),
// 跟老前端 ops_web/src/layout/Sider.js 的 hasPermission(item.auth) 一个效果。

/** 只要有其中任意一个权限码(或是超管)就放行 */
export function anyOf(...codes: string[]): string[] {
  return [...codes, SUPER_CODE];
}

/**
 * 父菜单的权限 = 子菜单权限的并集。
 * 老前端是手写 'a|b|c',漏写一个就会出现"有子页面权限却看不到父菜单"。
 * 这里自动汇总,加子菜单时不用再回来改父级。
 */
export function withChildrenAuthority(route: RouteRecordRaw): RouteRecordRaw {
  const codes = new Set<string>();
  for (const child of route.children ?? []) {
    for (const code of child.meta?.authority ?? []) codes.add(code);
  }
  return {
    ...route,
    meta: { ...route.meta, authority: [...codes] },
  } as RouteRecordRaw;
}
