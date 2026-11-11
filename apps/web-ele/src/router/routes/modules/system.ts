import type { RouteRecordRaw } from 'vue-router';

import { anyOf, withChildrenAuthority } from '../authority';

// 系统管理:账户/角色/登录日志,对接 goat/auth 网关。
// 权限码写法见 ../authority.ts

const routes: RouteRecordRaw[] = [
  withChildrenAuthority({
    meta: {
      icon: 'lucide:settings',
      order: 100,
      title: '系统管理',
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'SystemAccount',
        path: 'account',
        component: () => import('#/views/system/account/index.vue'),
        meta: {
          icon: 'lucide:users',
          title: '账户管理',
          authority: anyOf('system.account.view'),
        },
      },
      {
        name: 'SystemRole',
        path: 'role',
        component: () => import('#/views/system/role/index.vue'),
        meta: {
          icon: 'lucide:shield-check',
          title: '角色管理',
          authority: anyOf('system.role.view'),
        },
      },
      {
        name: 'SystemLoginHistory',
        path: 'login-history',
        component: () => import('#/views/system/login-history/index.vue'),
        meta: {
          icon: 'lucide:history',
          title: '登录日志',
          authority: anyOf('system.history.view'),
        },
      },
    ],
  }),
  {
    // 个人中心:登录了就能进,不需要权限码,所以不挂在系统管理菜单下
    name: 'Profile',
    path: '/profile',
    component: () => import('#/views/_core/profile/index.vue'),
    meta: {
      hideInMenu: true,
      icon: 'lucide:user',
      title: '个人中心',
    },
  },
];

export default routes;
