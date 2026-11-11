<script lang="ts" setup>
import type { TerminalSessionApi } from '#/api';

import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { listSessionsApi } from '#/api';

defineOptions({ name: 'SessionReplayList' });

const router = useRouter();
const loading = ref(false);
const rows = ref<TerminalSessionApi.Session[]>([]);
const query = reactive({
  username: '', target: '', date_from: '', date_to: '', page: 1, page_size: 20,
});
// 时间区间单独用一个 ref,查询时再拆进 query(datetimerange 返回 [开始, 结束])
const dateRange = ref<[string, string] | null>(null);
const total = ref(0);

async function fetchData() {
  loading.value = true;
  try {
    const res = await listSessionsApi(query);
    rows.value = res.sessions;
    total.value = res.pagination.total;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);

function search() {
  query.page = 1;
  query.date_from = dateRange.value?.[0] ?? '';
  query.date_to = dateRange.value?.[1] ?? '';
  fetchData();
}

// 字符串时间带 '-',Safari 解析不了,替换成 '/' 再算
function duration(r: TerminalSessionApi.Session) {
  if (!r.is_finished || !r.date_end) return '进行中';
  const ms =
    new Date(r.date_end.replace(/-/g, '/')).getTime() -
    new Date(r.date_start.replace(/-/g, '/')).getTime();
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} 秒`;
  return `${Math.floor(s / 60)} 分 ${s % 60} 秒`;
}
function fmtSize(v: number | string) {
  const n = Number(v) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function play(r: TerminalSessionApi.Session) {
  router.push({
    name: 'SessionReplay',
    params: { id: r.id },
    query: { pageKey: `session-replay-${r.id}`, name: `${r.username}@${r.hostname}` },
  });
}

function monitor(r: TerminalSessionApi.Session) {
  router.push({
    name: 'SessionMonitor',
    params: { id: r.id },
    query: {
      pageKey: `session-monitor-${r.id}}`,
      name: `${r.username}@${r.hostname}`,
    },
  });
}

</script>

<template>
  <div class="p-4">
    <div class="mb-3 flex items-center gap-2">
      <ElInput
        v-model="query.username"
        class="!w-64"
        clearable
        placeholder="用户名"
        @clear="search"
        @keyup.enter="search"
      />
      <ElInput
        v-model="query.target"
        class="!w-56"
        clearable
        placeholder="目标:主机地址或账号"
        @clear="search"
        @keyup.enter="search"
      />
      <ElDatePicker
        v-model="dateRange"
        style="width: 300px; flex: 0 0 auto"
        clearable
        end-placeholder="结束时间"
        start-placeholder="开始时间"
        type="datetimerange"
        value-format="YYYY-MM-DD HH:mm:ss"
        @change="search"
      />
      <ElButton type="primary" @click="search">查询</ElButton>
    </div>

    <ElTable v-loading="loading" :data="rows" border stripe>
      <ElTableColumn label="用户" prop="username" min-width="120" />
      <ElTableColumn label="目标" min-width="220">
        <template #default="{ row }">
          <span class="font-mono">{{ row.account }}@{{ row.hostname }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="来源 IP" prop="remote_addr" width="140" />
      <ElTableColumn label="开始时间" prop="date_start" width="170" />
      <ElTableColumn label="时长" width="110">
        <template #default="{ row }">
          {{ duration(row as TerminalSessionApi.Session) }}
        </template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="90">
        <template #default="{ row }">
          <ElTag :type="row.is_finished ? 'info' : 'success'">
            {{ row.is_finished ? '已结束' : '进行中' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="录像" width="100">
        <template #default="{ row }">
            <span v-if="row.has_replay" class="text-xs text-gray-500">
              {{ fmtSize(row.replay_size) }}
            </span>
          <span v-else class="text-xs text-gray-400">无</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="90" fixed="right">
        <template #default="{ row }">
          <ElButton
            v-if="!row.is_finished"
            link
            type="warning"
            @click="monitor(row as TerminalSessionApi.Session)"
          >
            监控
          </ElButton>
          <ElButton
            v-if="row.has_replay"
            link
            type="primary"
            @click="play(row as TerminalSessionApi.Session)"
          >
            回放
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <ElPagination
      v-model:current-page="query.page"
      v-model:page-size="query.page_size"
      class="mt-3 justify-end"
      layout="total, sizes, prev, pager, next"
      :page-sizes="[10, 20, 50, 100]"
      :total="total"
      @current-change="fetchData"
      @size-change="search"
    />
  </div>
</template>
