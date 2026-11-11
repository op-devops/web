<script lang="ts" setup>
// 书籍管理 — ported from frontend-vue/src/views/AdminView.vue (books tab).
// Books persist through the Gateway catalog API (.deer-flow/catalog.json,
// admin-only writes).
import type { Catalog, CatalogBook } from '#/api/deerflow/catalog';

import { computed, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { fetchAgents } from '#/api/deerflow/agents';
import { fetchCatalog, saveCatalog } from '#/api/deerflow/catalog';
import booksSeed from '#/config/books.json';

defineOptions({ name: 'CatalogBooks' });

const catalog = ref<Catalog>({ version: 1, departments: [], books: [] });
const agentNames = ref<string[]>([]);
const loading = ref(false);
const bookSearch = ref('');

onMounted(async () => {
  loading.value = true;
  try {
    const [cat, agents] = await Promise.all([fetchCatalog(), fetchAgents()]);
    if (cat) catalog.value = cat;
    agentNames.value = agents.map((a) => a.name);
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

const filteredBooks = computed(() => {
  const q = bookSearch.value.trim().toLowerCase();
  if (!q) return catalog.value.books;
  return catalog.value.books.filter((b) => b.name.toLowerCase().includes(q));
});

const bookDialog = ref(false);
const editingIndex = ref<number>(-1);
const bookForm = reactive<CatalogBook>({
  name: '',
  description: '',
  img: '',
  department: '',
  agents: [],
});

function openBookDialog(index = -1) {
  editingIndex.value = index;
  const src = index >= 0 ? catalog.value.books[index] : null;
  bookForm.name = src?.name ?? '';
  bookForm.description = src?.description ?? '';
  bookForm.img = src?.img ?? '';
  bookForm.department = src?.department ?? '';
  bookForm.agents = src ? src.agents.map((a) => ({ ...a })) : [];
  bookDialog.value = true;
}

function addAgentRow() {
  bookForm.agents.push({ label: '', slug: null });
}

function removeAgentRow(i: number) {
  bookForm.agents.splice(i, 1);
}

async function saveBook() {
  if (!bookForm.name.trim()) {
    ElMessage.warning('请填写书名');
    return;
  }
  const cleaned: CatalogBook = {
    name: bookForm.name.trim(),
    description: bookForm.description.trim(),
    img: bookForm.img.trim(),
    department: bookForm.department.trim(),
    agents: bookForm.agents
      .filter((a) => a.label.trim())
      .map((a) => ({ label: a.label.trim(), slug: a.slug?.trim() || null })),
  };
  if (editingIndex.value >= 0) {
    catalog.value.books[editingIndex.value] = cleaned;
  } else {
    catalog.value.books.unshift(cleaned);
  }
  if (await persist()) bookDialog.value = false;
}

async function removeBook(index: number) {
  const book = catalog.value.books[index];
  if (!book) return;
  try {
    await ElMessageBox.confirm(`确定删除书籍「${book.name}」吗？`, '删除书籍', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    });
  } catch {
    return;
  }
  catalog.value.books.splice(index, 1);
  await persist();
}

async function importSeed() {
  try {
    await ElMessageBox.confirm(
      `将从 1.0 数据导入 ${booksSeed.length} 本书（覆盖当前书籍列表），继续？`,
      '从 1.0 导入',
      { type: 'warning' },
    );
  } catch {
    return;
  }
  catalog.value.books = (
    booksSeed as {
      agents: { label: string; slug?: string }[];
      description: string;
      img: string;
      name: string;
    }[]
  ).map((b) => ({
    name: b.name,
    description: b.description ?? '',
    img: b.img ?? '',
    department: '',
    agents: (b.agents ?? []).map((a) => ({ label: a.label, slug: a.slug ?? null })),
  }));
  await persist();
}
</script>

<template>
  <Page title="书籍管理" description="书籍合集的展示目录，链接到各书的智能体">
    <div v-loading="loading">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ElInput
          v-model="bookSearch"
          placeholder="搜索书籍…"
          clearable
          style="width: 260px"
        />
        <div class="flex gap-2">
          <ElButton @click="importSeed">从 1.0 导入</ElButton>
          <ElButton type="primary" @click="openBookDialog()">
            新建书籍
          </ElButton>
        </div>
      </div>
      <ElTable :data="filteredBooks" size="small" class="w-full">
        <ElTableColumn label="封面" width="72">
          <template #default="{ row }">
            <img
              v-if="row.img"
              :src="row.img"
              class="h-[52px] w-10 rounded bg-gray-100 object-contain"
            />
          </template>
        </ElTableColumn>
        <ElTableColumn
          prop="name"
          label="书名"
          min-width="220"
          show-overflow-tooltip
        />
        <ElTableColumn prop="department" label="部门" width="130" />
        <ElTableColumn label="智能体" width="90">
          <template #default="{ row }">{{ row.agents.length }}</template>
        </ElTableColumn>
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ $index }">
            <ElButton
              link
              type="primary"
              @click="
                openBookDialog(catalog.books.indexOf(filteredBooks[$index]!))
              "
            >
              编辑
            </ElButton>
            <ElButton
              link
              type="danger"
              @click="removeBook(catalog.books.indexOf(filteredBooks[$index]!))"
            >
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <!-- 书籍编辑弹窗 -->
    <ElDialog
      v-model="bookDialog"
      :title="editingIndex >= 0 ? '编辑书籍' : '新建书籍'"
      width="60%"
    >
      <ElForm label-width="72px" label-position="left">
        <ElFormItem label="书名">
          <ElInput v-model="bookForm.name" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput
            v-model="bookForm.description"
            type="textarea"
            :rows="2"
            resize="vertical"
          />
        </ElFormItem>
        <ElFormItem label="封面 URL">
          <ElInput v-model="bookForm.img" placeholder="https://…" />
        </ElFormItem>
        <ElFormItem label="部门">
          <ElSelect
            v-model="bookForm.department"
            clearable
            placeholder="选择部门"
            style="width: 100%"
          >
            <ElOption
              v-for="d in catalog.departments"
              :key="d"
              :label="d"
              :value="d"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="智能体">
          <div class="flex w-full flex-col gap-2">
            <div
              v-for="(a, i) in bookForm.agents"
              :key="i"
              class="flex items-center gap-2"
            >
              <ElInput v-model="a.label" placeholder="显示名称" class="flex-1" />
              <ElSelect
                v-model="a.slug"
                clearable
                filterable
                placeholder="关联 2.0 智能体（可空）"
                class="flex-1"
              >
                <ElOption
                  v-for="name in agentNames"
                  :key="name"
                  :label="name"
                  :value="name"
                />
              </ElSelect>
              <ElButton link type="danger" @click="removeAgentRow(i)">
                移除
              </ElButton>
            </div>
            <ElButton size="small" @click="addAgentRow">
              + 添加智能体链接
            </ElButton>
          </div>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="bookDialog = false">取消</ElButton>
        <ElButton type="primary" @click="saveBook">保存</ElButton>
      </template>
    </ElDialog>
  </Page>
</template>
