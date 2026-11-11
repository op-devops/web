<script lang="ts" setup>
import type { TerminalCommandApi } from '#/api';

import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import {
  ElButton,
  ElDatePicker,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { listCommandsApi } from '#/api';

defineOptions({ name: 'CommandAudit' });

const route = useRoute();
const loading = ref(false);
const rows = ref<TerminalCommandApi.Command[]>([]);
// session_id 可从路由 query 带进来(从某会话跳过来只看它的命令),否则全量
const query = reactive({
  session_id: (route.query.session_id as string) ?? '',
  username: '',
  target: '',
  keyword: '',
  date_from: '',
  date_to: '',
  page: 1,
  page_size: 20,
});
const dateRange = ref<[string, string] | null>(null);
const total = ref(0);

async function fetchData() {
  loading.value = true;
  try {
    const res = await listCommandsApi(query);
    rows.value = res.commands;
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
</script>

<template>
  <div class="p-4">
    <div class="mb-3 flex items-center gap-2">
      <ElInput
        v-model="query.username"
        class="!w-48"
        clearable
        placeholder="执行人"
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
      <ElInput
        v-model="query.keyword"
        class="!w-56"
        clearable
        placeholder="命令内容"
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
      <ElTableColumn label="执行人" prop="username" width="120" />
      <ElTableColumn label="目标" min-width="200">
        <template #default="{ row }">
          <span class="font-mono">{{ row.account }}@{{ row.hostname }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="命令" min-width="300">
        <template #default="{ row }">
          <span class="font-mono break-all">{{ row.input }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="执行时间" prop="timestamp" width="170" />
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
