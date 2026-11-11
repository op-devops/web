<script lang="ts" setup>
// 部门管理 — ported from frontend-vue/src/views/AdminView.vue (departments
// tab). Departments live in the same Gateway catalog document as books.
import type { Catalog } from '#/api/deerflow/catalog';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { fetchCatalog, saveCatalog } from '#/api/deerflow/catalog';

defineOptions({ name: 'CatalogDepartments' });

const catalog = ref<Catalog>({ version: 1, departments: [], books: [] });
const loading = ref(false);
const newDepartment = ref('');

const rows = computed(() =>
  catalog.value.departments.map((d) => ({ name: d })),
);

onMounted(async () => {
  loading.value = true;
  try {
    const cat = await fetchCatalog();
    if (cat) catalog.value = cat;
  } finally {
    loading.value = false;
  }
});

async function persist() {
  try {
    catalog.value = await saveCatalog(catalog.value);
    ElMessage.success('已保存');
    return true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
    return false;
  }
}

async function addDepartment() {
  let name = newDepartment.value.trim();
  // Empty inline input → fall back to a prompt dialog so the button always
  // responds.
  if (!name) {
    try {
      const { value } = await ElMessageBox.prompt('输入部门名称', '添加部门', {
        confirmButtonText: '添加',
        cancelButtonText: '取消',
        inputValidator: (v: string) => (v.trim() ? true : '名称不能为空'),
      });
      name = value.trim();
    } catch {
      return; // cancelled
    }
  }
  if (catalog.value.departments.includes(name)) {
    ElMessage.warning('部门已存在');
    return;
  }
  catalog.value.departments.push(name);
  if (await persist()) {
    newDepartment.value = '';
  } else {
    // Roll back the optimistic add so the table matches the server.
    catalog.value.departments = catalog.value.departments.filter(
      (d) => d !== name,
    );
  }
}

async function removeDepartment(name: string) {
  try {
    await ElMessageBox.confirm(`确定删除部门「${name}」吗？`, '删除部门', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  const before = [...catalog.value.departments];
  catalog.value.departments = catalog.value.departments.filter(
    (d) => d !== name,
  );
  if (!(await persist())) catalog.value.departments = before;
}
</script>

<template>
  <Page title="部门管理" description="书籍按部门归类展示">
    <div v-loading="loading">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <ElInput
          v-model="newDepartment"
          placeholder="新部门名称…"
          style="width: 260px"
          @keydown.enter="addDepartment"
        />
        <ElButton type="primary" @click="addDepartment">添加部门</ElButton>
      </div>
      <ElTable :data="rows" size="small" class="w-full">
        <ElTableColumn prop="name" label="部门名称" min-width="240" />
        <ElTableColumn label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <ElButton link type="danger" @click="removeDepartment(row.name)">
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>
  </Page>
</template>
