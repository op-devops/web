# 前端镜像:node 构建 -> OpenResty 托管静态文件并反代 /api 到 APISIX。
#
# 构建(上下文就是本仓库根目录):
#   docker build -t ops-web:latest .
#   # 国内网络可以换源:
#   docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com -t ops-web:latest .
#
# 运行:要和 APISIX 在同一个网络里,否则解析不到 apisix 这个名字
#   docker run -d --name ops-web --network devops-net -p 8080:80 ops-web:latest

ARG NODE_IMAGE=node:22-alpine
ARG OPENRESTY_IMAGE=openresty/openresty:1.27.1.2-0-alpine

# ---------- 构建 ----------
FROM ${NODE_IMAGE} AS builder
ARG NPM_REGISTRY

RUN corepack enable && corepack install -g pnpm@10.26.2
RUN if [ -n "${NPM_REGISTRY}" ]; then pnpm config set registry "${NPM_REGISTRY}"; fi

ENV CI=true
# 这个 monorepo 体积大,构建期内存吃紧,跟根 package.json 的 build 脚本保持一致
ENV NODE_OPTIONS=--max-old-space-size=8192
# 不生成 dist.zip:那是给人工下载用的,镜像里白占空间
ENV VITE_ARCHIVER=false

WORKDIR /app
# 先只拷依赖清单,命中缓存时改业务代码不会重装依赖
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps ./apps
COPY packages ./packages
COPY internal ./internal
COPY scripts ./scripts
COPY .browserslistrc .editorconfig turbo.json ./

RUN pnpm install --frozen-lockfile
# 只构建 web-ele 这一个 app,不构建整个 workspace
RUN pnpm build:ele

# ---------- 运行 ----------
FROM ${OPENRESTY_IMAGE} AS prod

COPY --from=builder /app/apps/web-ele/dist /usr/share/nginx/html
COPY docker/openresty/nginx.conf /usr/local/openresty/nginx/conf/nginx.conf

# 镜像里没有 curl,用 openresty 自带的 resty 探活
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/openresty/bin/resty -e 'local h=require("resty.http") or nil' 2>/dev/null \
        || wget -qO- http://127.0.0.1/index.html >/dev/null 2>&1 || exit 1

EXPOSE 80
