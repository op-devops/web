import { defineConfig } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      plugins: [
        ElementPlus({
          format: 'esm',
        }),
      ],
      server: {
        proxy: {
          // 走 APISIX(:9080)而不是直连网关:网关现在是随机端口注册到 Nacos,
          // 由 APISIX 做服务发现,前端不需要知道它在哪。
          // 开发和生产走同一条链路,避免"本地好使上线出问题"。
          //
          // 路径映射:
          //   前端请求        /api/auth/login
          //   vite 改写成     /auth-api/auth/login   -> APISIX :9080
          //   APISIX 剥前缀   /auth/login            -> 网关
          //
          // 用 vite 代理而不是让浏览器直连 :9080,是为了同源——开发期不用在网关开 CORS。
          //
          // 多个后端项目共用 /api 前缀,再按第二段区分到各自网关:
          //   /api/cmdb/hosts  -> /cmdb-api/hosts      (cmdb 网关)
          //   /api/terminal/.. -> /terminal-api/..     (terminal 网关)
          //   /api/users 等    -> /auth-api/users      (auth 网关,显式列前缀)
          // auth 不再用 /api 兜底:未命中任何前缀的 /api 请求不转发,避免拼错/未迁移
          // 的路径默默进 auth 难以排查(和 docker/openresty/nginx.conf 一致,prod 那边直接 404)。
          // key 以 ^ 开头时 vite 当正则处理;它匹配带 query 的 req.url,故边界要带上 \?。
          // 新增 auth 顶级资源时,把名字加进下面的正则。
          '/api/terminal': {
            changeOrigin: true,
            ws: true,
            rewrite: (path: string) => path.replace(/^\/api\/terminal/, '/terminal-api'),
            target: 'http://127.0.0.1:9080',
          },
          '/api/cmdb': {
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api\/cmdb/, '/cmdb-api'),
            target: 'http://127.0.0.1:9080',
            ws: true,
          },
          '/api/cron': {
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api\/cron/, '/cron-api'),
            target: 'http://127.0.0.1:9080',
          },
          '^/api/(auth|users|roles|self|login-history)(/|\\?|$)': {
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/api/, '/auth-api'),
            target: 'http://127.0.0.1:9080',
            ws: true,
          },
        },
      },
    },
  };
});
