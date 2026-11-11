<script lang="ts" setup>
import type { NotificationItem } from '@vben/layouts';

import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { AuthenticationLoginExpiredModal } from '@vben/common-ui';
import { useWatermark } from '@vben/hooks';
import {
  BasicLayout,
  LockScreen,
  Notification,
  UserDropdown,
} from '@vben/layouts';
import { preferences, usePreferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';

import { getHostApi } from '#/api';
import { $t } from '#/locales';
import { useAuthStore } from '#/store';
import LoginForm from '#/views/_core/authentication/login.vue';

const notifications = ref<NotificationItem[]>([]);

// 终端水印要显示"正在访问的主机"(账号@主机:端口)。按 host id 缓存,避免每次切换都查接口。
const addrCache = new Map<string, string>();

const router = useRouter();
const userStore = useUserStore();
const authStore = useAuthStore();
const accessStore = useAccessStore();
const { destroyWatermark, updateWatermark } = useWatermark();
const { isDark } = usePreferences();
const showDot = computed(() =>
  notifications.value.some((item) => !item.isRead),
);

const menus = computed(() => [
  {
    handler: () => {
      router.push({ name: 'Profile' });
    },
    icon: 'lucide:user',
    text: $t('page.auth.profile'),
  },
]);

const avatar = computed(() => {
  return userStore.userInfo?.avatar ?? preferences.app.defaultAvatar;
});

async function handleLogout() {
  await authStore.logout(false);
}

function handleNoticeClear() {
  notifications.value = [];
}

function markRead(id: number | string) {
  const item = notifications.value.find((item) => item.id === id);
  if (item) {
    item.isRead = true;
  }
}

function remove(id: number | string) {
  notifications.value = notifications.value.filter((item) => item.id !== id);
}

function handleMakeAll() {
  notifications.value.forEach((item) => (item.isRead = true));
}

const viewAll = () => {};

const handleClick = (item: NotificationItem) => {
  // 如果通知项有链接，点击时跳转
  if (item.link) {
    navigateTo(item.link, item.query, item.state);
  }
};

function navigateTo(
  link: string,
  query?: Record<string, any>,
  state?: Record<string, any>,
) {
  if (link.startsWith('http://') || link.startsWith('https://')) {
    // 外部链接，在新标签页打开
    window.open(link, '_blank');
  } else {
    // 内部路由链接，支持 query 参数和 state
    router.push({
      path: link,
      query: query || {},
      state,
    });
  }
}

watch(
  () => ({
    enable: preferences.app.watermark,
    content: preferences.app.watermarkContent,
    isDark: isDark.value,
    // 终端页:按 host id 解析"正在访问的主机"。query.addr 作快速路径(新开的终端有),
    // 复制窗口/刷新等 query 丢失时按 id 查接口兜底。currentRoute 响应式,切页签自动重算。
    routeName: router.currentRoute.value.name as string | undefined,
    hostId: router.currentRoute.value.params.id as string | undefined,
    addrQuery: router.currentRoute.value.query.addr as string | undefined,
  }),
  async ({ enable, content, isDark: isDarkValue, routeName, hostId, addrQuery }) => {
    if (enable) {
      // 解析正在访问的主机地址(账号@主机:端口),只在终端页
      let addr = '';
      if (routeName === 'HostTerminal' && hostId) {
        addr = addrQuery || addrCache.get(hostId) || '';
        if (!addr) {
          try {
            const h = await getHostApi(hostId);
            addr = `${h.username}@${h.hostname}:${h.port}`;
          } catch {
            addr = '';
          }
        }
        if (addr) addrCache.set(hostId, addr);
      }

      // 终端/监控页是纯黑底(addr 存在即在这类页):深灰水印会"黑叠黑"看不见,
      // 所以这类页用浅色;其它页按主题(亮色深灰、暗色浅灰)。
      const onDarkBg = isDarkValue || !!addr;
      const watermarkColor = onDarkBg
        ? 'rgb(220, 220, 220)'
        : 'rgb(110, 110, 110)';

      // 先销毁再重建:路由切换时走 updateWatermark 的 changeOptions 分支不能可靠重绘
      // (页面 DOM 正在替换/过渡),导致水印消失、要刷新才回来。销毁后 updateWatermark
      // 会走 init 全新创建(和刷新同一条路径),在导航后也能稳定出现。
      destroyWatermark();
      await nextTick();
      await updateWatermark({
        advancedStyle: {
          colorStops: [
            {
              color: watermarkColor,
              offset: 0,
            },
            {
              color: watermarkColor,
              offset: 1,
            },
          ],
          type: 'linear',
        },
        // globalAlpha 才是水印整体不透明度的总开关(use-watermark.ts 默认 0.25,会把
        // colorStops 里的 alpha 再乘一道压暗)。这里显式调大,配合字号让它清楚些。
        // 黑底页(终端/监控)不透明度调高些才显眼
        globalAlpha: onDarkBg ? 0.3 : 0.3,
        fontSize: '22px',
        // 单格宽度放大(默认 160 太窄),避免 ren@192.168.11.10:22 这类长地址被折行
        width: 320,
        // 基础内容 = 操作人;终端页再补一行正在访问的主机(多行水印,\n 分行)
        content: (() => {
          const base =
            content ||
            `${userStore.userInfo?.username} - ${userStore.userInfo?.realName}`;
          return addr ? `${base}\n${addr}` : base;
        })(),
      });
    } else {
      destroyWatermark();
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <BasicLayout @clear-preferences-and-logout="handleLogout">
    <template #user-dropdown>
      <UserDropdown
        :avatar
        :menus
        :text="userStore.userInfo?.realName"
        description="ann.vben@gmail.com"
        tag-text="Pro"
        @logout="handleLogout"
        @clear-preferences-and-logout="handleLogout"
      />
    </template>
    <template #notification>
      <Notification
        :dot="showDot"
        :notifications="notifications"
        @clear="handleNoticeClear"
        @read="(item) => item.id && markRead(item.id)"
        @remove="(item) => item.id && remove(item.id)"
        @make-all="handleMakeAll"
        @on-click="handleClick"
        @view-all="viewAll"
      />
    </template>
    <template #extra>
      <AuthenticationLoginExpiredModal
        v-model:open="accessStore.loginExpired"
        :avatar
      >
        <LoginForm />
      </AuthenticationLoginExpiredModal>
    </template>
    <template #lock-screen>
      <LockScreen :avatar @to-login="handleLogout" />
    </template>
  </BasicLayout>
</template>
