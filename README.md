vue-vben-admin/
│
├── apps/                                 ← 应用层(你的业务代码)
│   └── web-ele/
│       ├── src/
│       │   ├── api/
│       │   │   ├── core/                 框架约定的接口,名字和返回结构不能随便改
│       │   │   │   ├── auth.ts           验证码 + 登录 + 登出
│       │   │   │   ├── user.ts           查当前用户(GET /self),roles 里塞了权限码
│       │   │   │   └── menu.ts           动态菜单(当前用前端模式,没实际调用)
│       │   │   ├── system/               你加的:账号/角色/登录历史/个人中心
│       │   │   ├── deerflow/             遗留,路由已删,可清理
│       │   │   └── request.ts            axios 实例 + 拦截器(Envelope 的 401 处理在这)
│       │   ├── views/
│       │   │   ├── _core/                框架页面
│       │   │   │   ├── authentication/   登录页(你改过,加了验证码)
│       │   │   │   ├── fallback/         403/404/500
│       │   │   │   └── profile/          个人中心
│       │   │   ├── system/               账号管理 / 角色管理 / 登录历史
│       │   │   │   └── codes.ts          12 模块 88 个权限码的定义
│       │   │   ├── agents/  catalog/     vben demo 页面,可删
│       │   ├── router/
│       │   │   ├── routes/modules/       system.ts(系统管理的路由和菜单)
│       │   │   ├── routes/core.ts        登录/404 等基础路由
│       │   │   ├── access.ts             路由级权限过滤(读 userInfo.roles)
│       │   │   └── guard.ts              导航守卫:未登录跳登录页
│       │   ├── composables/use-perm.ts   你写的,超管绕过 hasAccessByCodes 的精确匹配
│       │   ├── adapter/                  把 Element Plus 组件接到 vben 的表单/表格协议上
│       │   ├── store/                    应用级 Pinia store
│       │   ├── layouts/                  basic(后台壳) / auth(登录页壳)
│       │   ├── locales/langs/            zh-CN / en-US 文案
│       │   └── config/books.json         demo 假数据 172K,可删
│       ├── .env.development              VITE_PORT=5777 在这
│       ├── vite.config.ts                第一行 import @vben/vite-config
│       ├── tsconfig.json                 extends @vben/tsconfig/web-app.json
│       └── index.html
│
├── packages/                             ← 运行时框架(62509 行,会打进 JS 产物)
│   │
│   ├── @core/                            最底层,不认识任何 UI 库
│   │   ├── base/
│   │   │   ├── design/                   CSS 变量、主题色算法
│   │   │   ├── icons/                    图标基础设施
│   │   │   ├── shared/                   纯函数工具
│   │   │   └── typings/                  基础类型
│   │   ├── ui-kit/                       无样式组件,基于 Radix Vue
│   │   │   ├── shadcn-ui/                按钮/输入框/下拉等原子组件
│   │   │   ├── form-ui/                  表单引擎
│   │   │   ├── layout-ui/                布局骨架
│   │   │   ├── menu-ui/                  菜单
│   │   │   ├── tabs-ui/                  标签页
│   │   │   └── popup-ui/                 弹窗/抽屉
│   │   ├── composables/                  通用组合式函数
│   │   └── preferences/                  偏好设置内核
│   │
│   ├── effects/                          中间层,有业务概念了
│   │   ├── layouts/        ★4 处         后台的壳:侧边栏/顶栏/标签页/面包屑
│   │   ├── common-ui/      ★21 处        业务组件:Modal/Drawer/Form/Table/认证页
│   │   ├── access/         ★3 处         权限:hasAccessByCodes 在这
│   │   ├── request/        ★2 处         HTTP 封装,你的 request.ts 基于它
│   │   ├── hooks/          ★3 处         usePagination 之类
│   │   └── plugins/        ★4 处         echarts / vxe-table / motion / tiptap
│   │
│   ├── types/  constants/  utils/        跨层公共
│   ├── icons/                            iconify + 自定义 svg
│   ├── locales/                          框架层文案
│   ├── preferences/                      主题、布局模式、动画开关
│   ├── stores/modules/                   Pinia:user / access / tabbar
│   └── styles/
│       ├── ele/                          ← 你用的这套
│       └── antd/ antdv-next/ naive/      其它 UI 库的适配样式
│
├── internal/                             ← 构建工具链(不进产物)
│   ├── vite-config/src/
│   │   ├── config/                       application / library 两种预设
│   │   ├── plugins/                      压缩、mock、打包分析、archiver
│   │   └── utils/
│   ├── tsconfig/                         base / library / node / web / web-app
│   ├── tailwind-config/                  Tailwind 预设,主题变量、暗色规则
│   ├── lint-configs/                     eslint / stylelint / commitlint / oxlint
│   └── node-utils/                       脚本自用工具
│
├── scripts/
│   ├── deploy/                           build-local-docker-image.sh
│   ├── turbo-run/                        pnpm dev 的交互式选择器
│   ├── vsh/                              自制 CLI:lint / check-dep / check-circular
│   └── clean.mjs
│
├── docker/openresty/nginx.conf           ← 你加的
├── Dockerfile                            ← 你加的:node 构建 → openresty
├── docker-compose.yml                    ← 你加的
│
├── pnpm-workspace.yaml                   声明 workspace 成员 + catalog(218 行统一版本)
├── turbo.json                            任务编排和缓存,决定构建顺序
├── package.json                          根脚本:dev:ele / build:ele / check
└── node_modules/                         1.4G,pnpm 硬链接到全局 store

★ 标的是 apps/web-ele/src 里实际 import 的次数，共 69 处。

三层的分界：@core 换掉 Element Plus 也不用动 → effects 依赖 store 和路由 → apps 是具体应用。官方原本有 web-antd、web-naive 两个同级应用共用前两层，这个仓库只留了 web-ele。

internal 和 packages 的区别：前者只在 pnpm dev / pnpm build 时跑，后者会被打进浏览器加载的 JS。
