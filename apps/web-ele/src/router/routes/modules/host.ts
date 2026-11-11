import type { RouteRecordRaw } from 'vue-router';

import { anyOf } from '../authority';

// 主机管理,对接 goat/cmdb 网关。老前端里是一级菜单(ops_web/src/routes.js 的 /host),这里保持一致。
const routes: RouteRecordRaw[] = [
  {
    name: 'Host',
    path: '/host',
    component: () => import('#/views/cmdb/host/index.vue'),
    meta: {
      icon: 'lucide:server',
      order: 1,
      title: '主机管理',
      authority: anyOf('host.host.view'),
    },
  },
  {
    name: 'HostTerminal',
    path: '/host/terminal/:id',
    component: () => import('#/views/cmdb/host/terminal.vue'),
    meta: {
      hideInMenu: true,
      keepAlive: true,        // 切到别的页签再切回来,终端和连接不断
      title: '主机终端',
      authority: anyOf('host.terminal.view'),
    },
  },
];

export default routes;
