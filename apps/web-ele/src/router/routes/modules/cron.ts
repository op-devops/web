import type { RouteRecordRaw } from 'vue-router';

import { anyOf, withChildrenAuthority } from '../authority';

// 任务计划,对接 goat/cron 网关。
const routes: RouteRecordRaw[] = [
  withChildrenAuthority({
    meta: {
      icon: 'lucide:alarm-clock',
      order: 2,
      title: '任务计划',
    },
    name: 'Cron',
    path: '/cron',
    redirect: '/cron/task',
    children: [
      {
        name: 'CronTask',
        path: 'task', // /cron/task
        component: () => import('#/views/cron/index.vue'),
        meta: {
          icon: 'lucide:list-checks',
          title: '任务管理',
          authority: anyOf('cron.task.view'),
        },
      },
    ],
  }),
];

export default routes;
