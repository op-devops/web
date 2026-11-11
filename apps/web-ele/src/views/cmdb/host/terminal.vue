<script lang="ts" setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { useTabs } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import { TrzszFilter } from 'trzsz';

import '@xterm/xterm/css/xterm.css';

defineOptions({ name: 'HostTerminal' });

const route = useRoute();
const el = ref<HTMLDivElement>();
const fit = new FitAddon();
let term: Terminal;
let socket: null | WebSocket = null;
let ro: null | ResizeObserver = null;
let trzsz: null | TrzszFilter = null;

function connect() {
  const id = route.params.id as string;
  const token = useAccessStore().accessToken ?? '';
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  socket = new WebSocket(
    `${proto}://${location.host}/api/terminal/ws/ssh/${id}?token=${encodeURIComponent(token)}`,
  );
  socket.binaryType = 'arraybuffer';

  trzsz = new TrzszFilter({
    // trzsz 要写到终端的数据(普通输出 + 传输进度条)
    writeToTerminal: (data) =>
      term.write(
        typeof data === 'string' ? data : new Uint8Array(data as ArrayBuffer),
      ),
    // trzsz 要发给服务端的数据(键盘 + trzsz 协议应答):一律二进制帧,
    // 和控制帧(JSON 文本)区分开,后端按帧类型路由
    sendToServer: (data) => {
      if (socket?.readyState !== WebSocket.OPEN) return;
      const bytes =
        typeof data === 'string' ? new TextEncoder().encode(data) : data;
      // 统一成 ArrayBuffer 背衬的 Uint8Array(TS5.7 TypedArray 泛型收紧,
      // encode() 的 ArrayBufferLike 不满足 send 的 ArrayBufferView<ArrayBuffer>)
      socket.send(new Uint8Array(bytes));
    },
    terminalColumns: term.cols,
  });

  socket.onopen = () => refit();
  socket.onmessage = (e) => {
    const data = typeof e.data === 'string' ? e.data : new Uint8Array(e.data);
    const before = isTransferring();
    trzsz?.processServerOutput(data);
    const now = isTransferring();
    // 传输态翻转 => 通知后端暂停/恢复录像与命令解析
    if (now !== before && socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ trzsz: now }));
    }
  };
  socket.onclose = (e) =>
    term.write(`\r\n\x1B[31m${e.reason || '连接已关闭'}\x1B[0m\r\n`);

  term.onData((data) => trzsz?.processTerminalInput(data));
  term.onBinary((data) => trzsz?.processBinaryInput(data));
}

function setupDnd() {
  const node = el.value;
  if (!node) return;
  node.addEventListener('dragover', (e) => e.preventDefault());
  node.addEventListener('drop', (e) => {
    e.preventDefault();
    if (!e.dataTransfer) return;
    // 需要远端此刻正在跑 trz(在等接收);把拖进来的文件交给 trzsz 上传
    trzsz?.uploadFiles(e.dataTransfer.items).catch((err: any) => {
      term.write(`\r\n\x1B[31m上传失败: ${err?.message ?? err}\x1B[0m\r\n`);
    });
  });
}


function isTransferring(): boolean {
  try {
    return trzsz?.isTransferringFiles?.() ?? false;
  } catch {
    return false;
  }
}

function refit() {
  if (!el.value) return;
  fit.fit();
  trzsz?.setTerminalColumns(term.cols);
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ resize: [term.cols, term.rows] }));
  }
}

onMounted(() => {
  const name = (route.query.name as string) || (route.params.id as string);
  useTabs().setTabTitle(`终端: ${name}`);   // 页签显示 “终端: kali”

  term = new Terminal({ cursorBlink: true, fontSize: 14 });
  term.loadAddon(fit);
  term.open(el.value!);
  setupDnd();
  connect();
  ro = new ResizeObserver(() => refit());
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
    <!-- 黑色内边距盒:padding(黑色边距)放这一层,不要放在被 FitAddon 测量的 el 上 -->
    <div
      style="flex: 1; min-height: 0; background: #000; padding: 6px 8px; box-sizing: border-box; display: flex"
    >
      <!-- 终端本体:无 padding => FitAddon 精确 fit => .xterm 不会比容器大 =>
           overflow:hidden 也不会裁到数据(历史回滚由 xterm 自己的缓冲管) -->
      <div
        ref="el"
        style="flex: 1; min-width: 0; min-height: 0; overflow: auto"
      ></div>
    </div>
    <!-- 底部保留的白边(露出父级白底),固定高度不收缩 -->
    <div style="flex: 0 0 20px"></div>
  </div>
</template>



