# web

[op-devops](https://github.com/op-devops) 运维平台的前端，基于 [Vben Admin](https://github.com/vbenjs/vue-vben-admin) 的 Element Plus 版本（`apps/web-ele`）二次开发。

## 功能

| 菜单 | 页面 | 对接的后端 |
|---|---|---|
| 主机管理 | 主机与分类管理、SSH 连通性验证、Web 终端（xterm.js + trzsz 文件传输） | cmdb、terminal |
| 任务计划 | 计划任务的增删改查、启用停用；间隔 / 一次性 / Cron 三种触发方式 | cron |
| 会话审计 | 录像回放（asciinema-player）、命令审计、在线会话实时监控 | terminal |
| 系统管理 | 账户管理、角色管理（分配权限码、主机可见范围）、登录日志 | auth |

另外：登录页带图形验证码；页面水印显示当前操作人，终端页还会标注目标主机。

## 技术栈

Vue 3 · TypeScript · Vite · Element Plus · Pinia · Vue Router · Tailwind CSS · pnpm workspace + Turborepo

## 本地开发

环境要求：Node.js `^22.18.0 || ^24`，pnpm `>= 11`。

```bash
pnpm install
pnpm dev:ele        # http://localhost:5777
```

开发服务器会把 `/api` 请求代理到本机的 APISIX（`127.0.0.1:9080`），所以要先把 [infra](https://github.com/op-devops/infra) 和用到的后端模块跑起来。代理规则在 `apps/web-ele/vite.config.ts`：

| 前端请求 | 转发到 APISIX | 后端模块 |
|---|---|---|
| `/api/auth/*`、`/api/users/*`、`/api/roles/*`、`/api/self/*`、`/api/login-history/*` | `/auth-api/*` | auth |
| `/api/cmdb/*` | `/cmdb-api/*` | cmdb |
| `/api/terminal/*`（含 WebSocket） | `/terminal-api/*` | terminal |
| `/api/cron/*` | `/cron-api/*` | cron |

没匹配到上面任何前缀的 `/api` 请求不会转发，避免拼错的路径悄悄落到某个模块上。

VS Code / Cursor 用户可以直接用 `.vscode/launch.json` 里的「web-ele: 断点调试」：先起开发服务器，再打开一个可在编辑器里打断点的 Chrome。

## 构建与部署

```bash
pnpm build:ele      # 产物在 apps/web-ele/dist
./deploy.sh         # 构建 Docker 镜像并启动容器，http://127.0.0.1:8080
```

镜像分两阶段：Node 构建静态资源，再交给 OpenResty 托管。`docker/openresty/nginx.conf` 负责把 `/api/*` 按上表的规则反代到 APISIX，生产和开发走同一条链路。

容器要加入中间件栈创建的 `devops-net` 网络，才能解析到 `apisix`，所以部署前要先启动 infra。`deploy.sh` 还支持 `build` / `up` / `down` / `restart` / `logs` 子命令。

## 权限

后端下发扁平的权限码，格式是 `模块.页面.动作`，例如 `host.host.view`、`cron.task.edit`。同一个权限码要在三处保持一致：

1. 后端网关接口上的 `RequirePerm(...)`
2. `apps/web-ele/src/views/system/codes.ts`：角色授权页里能勾选的权限码清单
3. 路由的 `meta.authority`，以及页面按钮上的 `can(...)` 判断

超级管理员在前端映射为通配符 `*`。vben 自带的 `hasAccessByCodes` 是精确匹配、不认通配符，所以按钮权限统一用 `composables/use-perm.ts` 里的 `can()` 判断。

## 新增一个页面

以「任务计划」为例：

1. **API**：在 `src/api/cron/` 写接口函数和类型，再从 `src/api/index.ts` 导出。
2. **路由**：在 `src/router/routes/modules/` 新建 `cron.ts`。这个目录下的文件会被自动加载，权限写 `authority: anyOf('cron.task.view')`。
3. **页面**：新建 `src/views/cron/index.vue`。`defineOptions({ name })` 要和路由的 `name` 一致，否则 keepAlive 不生效。
4. **权限码**：在 `codes.ts` 里加上对应的模块、页面和动作。
5. **代理**：如果是新的后端模块，要在 `vite.config.ts`、`docker/openresty/nginx.conf` 和 APISIX 路由里各加一条规则。

## 目录

```
├── apps/web-ele/                  应用本体（业务代码基本都在这里）
│   ├── src/
│   │   ├── api/
│   │   │   ├── core/              框架约定的接口：验证码、登录、登出、当前用户
│   │   │   ├── system/            账号、角色、登录日志、个人中心
│   │   │   ├── cmdb/              主机、分类
│   │   │   ├── terminal/          会话、命令记录
│   │   │   ├── cron/              计划任务
│   │   │   └── request.ts         axios 实例与拦截器（统一响应解包、401 处理）
│   │   ├── views/
│   │   │   ├── _core/             登录页、403/404、个人中心
│   │   │   ├── system/            账户 / 角色 / 登录日志；codes.ts 是权限码清单
│   │   │   ├── cmdb/host/         主机管理、Web 终端
│   │   │   ├── cmdb/session/      录像回放、命令审计、实时监控
│   │   │   └── cron/              任务计划
│   │   ├── router/
│   │   │   ├── routes/modules/    各模块的路由和菜单（自动加载）
│   │   │   ├── routes/authority.ts  anyOf / withChildrenAuthority 权限写法
│   │   │   ├── access.ts          路由级权限过滤
│   │   │   └── guard.ts           导航守卫：未登录跳转登录页
│   │   ├── composables/use-perm.ts  按钮级权限判断，兼容超管通配符
│   │   ├── layouts/               后台框架、登录页框架
│   │   └── locales/               zh-CN / en-US 文案
│   ├── .env*                      端口、接口前缀等环境变量
│   └── vite.config.ts             开发代理
│
├── packages/                      Vben 运行时框架，会打进产物
│   ├── @core/                     最底层：设计变量、无样式组件、表单引擎、布局骨架
│   ├── effects/                   带业务概念的一层：布局、通用组件、权限、请求封装、hooks
│   └── stores/ locales/ styles/ … 跨层公共模块
│
├── internal/                      构建工具链，不进产物：vite / tsconfig / tailwind / lint 预设
├── scripts/                       仓库脚本：lint、依赖检查、清理
│
├── docker/openresty/nginx.conf    生产环境的静态托管与 /api 反代
├── Dockerfile                     Node 构建 → OpenResty
├── docker-compose.yml
└── deploy.sh                      构建与启停脚本
```

`packages/` 分三层：`@core` 不依赖任何 UI 库，换掉 Element Plus 也不用动；`effects` 依赖 store 和路由；`apps` 是具体应用。官方仓库里还有 web-antd、web-naive 等同级应用，这里只保留了 web-ele。

## 致谢与许可

前端框架来自 [Vben Admin](https://github.com/vbenjs/vue-vben-admin)，遵循 [MIT](./LICENSE) 协议。
