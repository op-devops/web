#!/usr/bin/env bash
# 前端构建 + 启动脚本。构建产物由 OpenResty 托管,/api 反代到 APISIX。
#
#   ./deploy.sh          构建镜像并(重新)起容器
#   ./deploy.sh build    只构建镜像,不动容器
#   ./deploy.sh up       只起容器,不构建(用已有镜像)
#   ./deploy.sh down     停并删除容器
#   ./deploy.sh logs     跟随查看日志
#   ./deploy.sh restart  重启容器
#
# 前置:APISIX 所在的 devops-net 网络要先起来(cd ../middreware && docker compose up -d),
# 否则容器加不进网络、nginx.conf 里的 apisix 解析不到。

set -euo pipefail
cd "$(dirname "$0")"

IMAGE="ops-web:latest"
CONTAINER="ops-web"
URL="http://127.0.0.1:8080"

need_docker() {
  command -v docker >/dev/null || { echo "✗ 没装 docker"; exit 1; }
}

check_network() {
  local net="${INFRA_NETWORK:-devops-net}"
  if ! docker network inspect "$net" >/dev/null 2>&1; then
    echo "✗ 网络 $net 不存在。先起中间件栈:cd ../middreware && docker compose up -d"
    exit 1
  fi
}

case "${1:-deploy}" in
  build)
    need_docker
    echo "▶ 构建镜像 $IMAGE …"
    docker compose build
    echo "✓ 构建完成"
    ;;
  up)
    need_docker; check_network
    docker compose up -d
    echo "✓ 已启动 -> $URL"
    ;;
  deploy)
    need_docker; check_network
    echo "▶ 构建并启动 …"
    docker compose up -d --build
    echo "✓ 已部署 -> $URL"
    ;;
  down)
    need_docker
    docker compose down
    echo "✓ 已停止并移除容器"
    ;;
  restart)
    need_docker
    docker compose restart
    echo "✓ 已重启 -> $URL"
    ;;
  logs)
    need_docker
    docker compose logs -f
    ;;
  *)
    echo "用法: $0 [build|up|deploy|down|restart|logs]"
    exit 1
    ;;
esac
