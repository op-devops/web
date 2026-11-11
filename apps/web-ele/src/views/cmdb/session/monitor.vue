<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useTabs } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';

import '@xterm/xterm/css/xterm.css';

defineOptions({ name: 'SessionMonitor' });

const route = useRoute();
const el = ref<HTMLDivElement>();
const fit = new FitAddon();
let term: Terminal;
let socket: null | WebSocket = null;
let ro: null | ResizeObserver = null;

function connect() {
  const id = route.params.id as string;
  const token = useAccessStore().accessToken ?? '';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(
    `${proto}://${location.host}/api/terminal/ws/monitor/${id}?token=${encodeURIComponent(token)}`,
  );
  socket.onmessage = (e) => term.write(e.data);
  socket.onclose = (e) =>
    term.write(`\r\n\x1B[33m${e.reason || '监控结束'}\x1B[0m\r\n`);
}

onMounted(() => {
  const name = (route.query.name as string) || (route.params.id as string);
  useTabs().setTabTitle(`监控: ${name}`);
  // disableStdin:只读,屏蔽键盘输入(监控者不能操作对方会话)
  term = new Terminal({ cursorBlink: false, disableStdin: true, fontSize: 14 });
  term.loadAddon(fit);
  term.open(el.value!);
  fit.fit();
  connect();
  ro = new ResizeObserver(() => fit.fit());
  ro.observe(el.value!);
});

onBeforeUnmount(() => {
  ro?.disconnect();
  socket?.close();
  term?.dispose();
});
</script>

<template>
  <!-- 外层铺满父容器,纵向排列 -->
  <div style="position: absolute; inset: 0; display: flex; flex-direction: column">
    <!-- 黑色内边距盒:padding 放这层,不要放在被 FitAddon 测量的 el 上 -->
    <div
      style="flex: 1; min-height: 0; background: #000; padding: 6px 8px; box-sizing: border-box; display: flex"
    >
      <!-- 终端本体:无 padding => FitAddon 精确 fit => .xterm 不会比容器大 -->
      <div
        ref="el"
        style="flex: 1; min-width: 0; min-height: 0; overflow: auto"
      ></div>
    </div>
    <!-- 底部保留的白边 -->
    <div style="flex: 0 0 20px"></div>
  </div>
</template>
