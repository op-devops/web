<script lang="ts" setup>
import type { LoginHistoryApi } from '#/api';

import { onMounted, reactive, ref } from 'vue';

import {
  ElButton,
  ElInput,
  ElPagination,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { listLoginHistoryApi } from '#/api';

defineOptions({ name: 'SystemLoginHistory' });

const loading = ref(false);
const items = ref<LoginHistoryApi.Item[]>([]);
const total = ref(0);
const query = reactive({ username: '', page: 1, page_size: 20 });

async function fetchItems() {
  loading.value = true;
  try {
    const res = await listLoginHistoryApi(query);
    items.value = res.items;
    total.value = res.pagination.total;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchItems);

function search() {
  query.page = 1;
  fetchItems();
}
</script>

<template>
  <div class="p-4">
    <div class="mb-3 flex items-center gap-2">
      <ElInput
        v-model="query.username"
        class="!w-64"
        clearable
        placeholder="按登录名过滤"
        @clear="search"
        @keyup.enter="search"
      />
      <ElButton type="primary" @click="search">查询</ElButton>
    </div>

    <ElTable v-loading="loading" :data="items" border stripe>
      <ElTableColumn label="时间" prop="created_at" width="180" />
      <ElTableColumn label="登录名" prop="username" min-width="120" />
      <ElTableColumn label="结果" width="90">
        <template #default="{ row }">
          <ElTag :type="row.is_success ? 'success' : 'danger'">
            {{ row.is_success ? '成功' : '失败' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="原因" prop="message" min-width="150">
        <template #default="{ row }">
          <span v-if="row.message">{{ row.message }}</span>
          <span v-else class="text-gray-400">—</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="IP" prop="ip" width="140" />
      <ElTableColumn
        label="User-Agent"
        prop="user_agent"
        min-width="240"
        show-overflow-tooltip
      />
    </ElTable>

    <ElPagination
      v-model:current-page="query.page"
      v-model:page-size="query.page_size"
      class="mt-3 justify-end"
      layout="total, sizes, prev, pager, next"
      :page-sizes="[20, 50, 100]"
      :total="total"
      @current-change="fetchItems"
      @size-change="search"
    />
  </div>
</template>
