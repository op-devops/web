import type { RouteRecordRaw } from 'vue-router';

import { anyOf, withChildrenAuthority } from '../authority';

// 会话审计,对接 goat/terminal 网关。
const routes: RouteRecordRaw[] = [
  withChildrenAuthority({
    meta: {
      icon: 'lucide:history',
      order: 11,
      title: '会话审计',
    },
    name: 'SessionAudit',
    path: '/session',
    children: [
      {
        name: 'SessionReplayList',
        path: 'replay', // /session/replay
        component: () => import('#/views/cmdb/session/index.vue'),
        meta: {
          icon: 'lucide:play',
          title: '录像回放',
          authority: anyOf('host.terminal.audit'),
        },
      },
      {
        name: 'CommandAudit',
        path: 'command', // /session/command
        component: () => import('#/views/cmdb/session/command.vue'),
        meta: {
          icon: 'lucide:terminal',
          title: '命令审计',
          authority: anyOf('host.terminal.cmd'),
        },
      },
    ],
  }),
  {
    name: 'SessionReplay',
    path: '/session/replay/:id',
    component: () => import('#/views/cmdb/session/replay.vue'),
    meta: {
      hideInMenu: true,
      title: '会话回放',
      authority: anyOf('host.terminal.audit'),
    },
  },
  {
    name: 'SessionMonitor',
    path: '/session/monitor/:id',
    component: () => import('#/views/cmdb/session/monitor.vue'),
    meta: {
      hideInMenu: true,
      keepAlive: true,        // ← 和终端一致:切页签不重连,缓存实例
      title: '会话监控',
      authority: anyOf('host.terminal.audit'),
    },
  },
];

export default routes;
