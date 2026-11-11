<script lang="ts" setup>
import type { TerminalSessionApi } from '#/api';

import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { create as createPlayer } from 'asciinema-player';
import { ElAlert } from 'element-plus';

import { fetchReplayText, getSessionApi } from '#/api';

import 'asciinema-player/dist/bundle/asciinema-player.css';

defineOptions({ name: 'SessionReplay' });

const route = useRoute();
const el = ref<HTMLDivElement>();
const info = ref<null | TerminalSessionApi.Session>(null);
const error = ref('');
let player: any = null;

onMounted(async () => {
  const id = route.params.id as string;
  try {
    info.value = await getSessionApi(id);
    if (!info.value.has_replay) {
      error.value = '该会话没有录像';
      return;
    }
    const cast = await fetchReplayText(id);
    player = createPlayer({ data: cast, parser: 'asciicast' }, el.value!, {
      fit: 'both',
      terminalFontSize: '14px',
      idleTimeLimit: 2, // 长时间无输出的空档压缩到 2 秒,审计看着不困
    });
  } catch (error_: any) {
    error.value = error_?.message || '加载回放失败';
  }
});

onBeforeUnmount(() => {
  player?.dispose?.();
});
</script>

<template>
  <!-- 铺满内容区,纵向:信息行固定高 + 播放器占剩余高 -->
  <div
    style="position: absolute; inset: 0; display: flex; flex-direction: column; padding: 12px; box-sizing: border-box"
  >
    <div v-if="info" class="mb-2 text-sm text-gray-500" style="flex: 0 0 auto">
      {{ info.username }} → {{ info.account }}@{{ info.hostname }} ·
      {{ info.date_start }} ~ {{ info.date_end || '—' }}
    </div>
    <ElAlert
      v-if="error"
      :closable="false"
      :title="error"
      style="flex: 0 0 auto"
      type="error"
    />
    <!-- flex:1 + min-height:0 让播放器吃掉剩余高度,fit:'both' 据此缩放 -->
    <div
      v-show="!error"
      ref="el"
      class="overflow-hidden rounded border"
      style="flex: 1; min-height: 0; overflow: auto"
    ></div>
  </div>
</template>
