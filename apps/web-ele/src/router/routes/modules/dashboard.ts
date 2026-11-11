import type { RouteRecordRaw } from 'vue-router';

// 报表首页,登录后默认落在这里。先放空占位,后续补图表。
// 不挂 authority:登录了就能看,作为所有人的落地页(菜单过滤见 generateRoutesByFrontend)。
const routes: RouteRecordRaw[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    component: () => import('#/views/dashboard/index.vue'),
    meta: {
      icon: 'lucide:layout-dashboard',
      order: 0, // 排在菜单最前
      title: '首页',
    },
  },
];

export default routes;
