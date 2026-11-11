<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { CmdbCategoryApi, CmdbHostApi } from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Delete, Plus } from '@element-plus/icons-vue';
import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
} from 'element-plus';

import {
  createCategoryApi,
  createHostApi,
  deleteCategoryApi,
  deleteHostApi,
  listCategoriesApi,
  listHostsApi,
  updateHostApi,
  verifyHostApi,
} from '#/api';
import { usePerm } from '#/composables/use-perm';

defineOptions({ name: 'Host' });

const router = useRouter();
function openTerminal(row: CmdbHostApi.Host) {
  router.push({
    name: 'HostTerminal',
    params: { id: row.id },
    query: {
      pageKey: `host-terminal-${row.id}-${Date.now()}`, // 每次不同 -> 新页签
      name: row.name, // 给页签标题用
      addr: `${row.username}@${row.hostname}:${row.port}`, // 给水印用:正在访问的主机
    },
  });
}

const { can } = usePerm();

// ---------- 分类 ----------

const categories = ref<CmdbCategoryApi.Category[]>([]);

async function fetchCategories() {
  const res = await listCategoriesApi();
  categories.value = res.categories;
}

// 树节点:两个虚拟节点(全部 / 未分类)在前,真实分类在后
const categoryNodes = computed(() => [
  { id: '', label: '全部', count: null as null | number, deletable: false },
  { id: 'none', label: '未分类', count: null as null | number, deletable: false },
  ...categories.value.map((c) => ({
    id: c.id,
    label: c.name,
    count: c.host_count as null | number,
    deletable: true,
  })),
]);

function categoryName(id: string) {
  return categories.value.find((c) => c.id === id)?.name ?? '';
}

function selectCategory(id: string) {
  if (query.category_id === id) return;
  query.category_id = id;
  query.page = 1;
  fetchHosts();
}

async function openAddCategory() {
  let value: string;
  try {
    ({ value } = await ElMessageBox.prompt('输入分类名称（1~30 个字符）', '新建分类', {
      confirmButtonText: '创建',
      inputErrorMessage: '名称 1~30 个字符',
      inputPattern: /^.{1,30}$/,
    }));
  } catch {
    return; // 用户取消
  }
  await createCategoryApi({ name: value.trim() });
  ElMessage.success('已添加分类');
  await fetchCategories();
}

async function removeCategory(node: { id: string; label: string }) {
  await ElMessageBox.confirm(
    `确认删除分类【${node.label}】？该分类下的主机会变为“未分类”，主机本身不会被删除。`,
    '删除分类',
    { type: 'warning' },
  );
  await deleteCategoryApi(node.id);
  ElMessage.success('已删除分类');
  if (query.category_id === node.id) {
    query.category_id = ''; // 删的是当前选中的,回到“全部”
    query.page = 1;
  }
  await Promise.all([fetchCategories(), fetchHosts()]);
}

// ---------- 列表 ----------

const loading = ref(false);
const hosts = ref<CmdbHostApi.Host[]>([]);
const query = reactive({ keyword: '', category_id: '', page: 1, page_size: 20 });
const total = ref(0);

async function fetchHosts() {
  loading.value = true;
  try {
    const res = await listHostsApi(query);
    hosts.value = res.hosts;
    total.value = res.pagination.total;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchHosts();
  fetchCategories();
});

function search() {
  query.page = 1;
  fetchHosts();
}

// ---------- 新建 / 编辑 ----------

/**
 * 私钥不会从后端返回，编辑时表单里拿不到原值，所以要用户明确选：
 *   keep    不传 pkey，后端保持原样
 *   replace 传新私钥
 *   clear   传空串，清掉独立私钥，改用平台全局密钥
 */
type PkeyMode = 'clear' | 'keep' | 'replace';

const dialogVisible = ref(false);
const editing = ref<CmdbHostApi.Host | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const pkeyMode = ref<PkeyMode>('keep');
const form = reactive({
  name: '',
  hostname: '',
  port: 22,
  username: '',
  pkey: '',
  desc: '',
  category_id: '',
});

const isEdit = computed(() => !!editing.value);
// 新建时私钥输入框一直显示(可以不填);编辑时只有选了"替换"才显示
const showPkeyInput = computed(
  () => !isEdit.value || pkeyMode.value === 'replace',
);

// 长度跟 cmdb 网关 gateway/schemas/host.py 保持一致,前端先拦一道,少一次往返
const length = (min: number, max: number) => ({
  min,
  max,
  message: `长度 ${min}~${max} 个字符`,
  trigger: 'blur',
});
const rules: FormRules = {
  name: [
    { required: true, message: '请输入主机名称', trigger: 'blur' },
    length(3, 20),
  ],
  hostname: [
    { required: true, message: '请输入主机名或 IP', trigger: 'blur' },
    length(3, 50),
  ],
  username: [
    { required: true, message: '请输入登录用户名', trigger: 'blur' },
    length(3, 30),
  ],
  desc: [{ max: 255, message: '最多 255 个字符', trigger: 'blur' }],
  pkey: [
    {
      trigger: 'blur',
      validator: (_rule, value: string, callback) => {
        if (isEdit.value && pkeyMode.value === 'replace' && !value.trim()) {
          callback(new Error('请粘贴新的私钥，或改选“保持不变”'));
        } else {
          callback();
        }
      },
    },
  ],
};

function openCreate() {
  editing.value = null;
  pkeyMode.value = 'keep';
  Object.assign(form, {
    name: '',
    hostname: '',
    port: 22,
    username: 'root',
    pkey: '',
    desc: '',
    // 当前选中的是真实分类就带过去,方便在分类下直接加主机
    category_id: ['', 'none'].includes(query.category_id) ? '' : query.category_id,
  });
  dialogVisible.value = true;
  formRef.value?.clearValidate();
}

function openEdit(row: CmdbHostApi.Host) {
  editing.value = row;
  pkeyMode.value = 'keep';
  Object.assign(form, {
    name: row.name,
    hostname: row.hostname,
    port: row.port,
    username: row.username,
    pkey: '',
    desc: row.desc,
    category_id: row.category_id || '',
  });
  dialogVisible.value = true;
  formRef.value?.clearValidate();
}

async function submit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  submitting.value = true;
  try {
    const base = {
      name: form.name,
      hostname: form.hostname,
      port: form.port,
      username: form.username,
      desc: form.desc,
      category_id: form.category_id,
    };
    if (editing.value) {
      const data: CmdbHostApi.UpdateParams = { ...base };
      if (pkeyMode.value === 'replace') data.pkey = form.pkey;
      if (pkeyMode.value === 'clear') data.pkey = '';
      await updateHostApi(editing.value.id, data);
    } else {
      await createHostApi({ ...base, pkey: form.pkey });
    }
    ElMessage.success(isEdit.value ? '已保存' : '已添加');
    dialogVisible.value = false;
    // 分类归属可能变了,顺带刷新分类计数
    await Promise.all([fetchHosts(), fetchCategories()]);
  } finally {
    submitting.value = false;
  }
}

// ---------- 删除 ----------

async function remove(row: CmdbHostApi.Host) {
  await ElMessageBox.confirm(
    `确认删除主机【${row.name}】（${row.hostname}）？删除后不可恢复。`,
    '删除确认',
    { type: 'warning' },
  );
  await deleteHostApi(row.id);
  ElMessage.success('已删除');
  // 删掉的是当前页最后一条时退回上一页,免得停在空页上
  if (hosts.value.length === 1 && query.page > 1) query.page -= 1;
  await Promise.all([fetchHosts(), fetchCategories()]);
}

// ---------- 验证(仿老平台:首次验证没密钥就弹框输密码) ----------
async function verify(row: CmdbHostApi.Host, password = ''): Promise<void> {
  const loading = ElMessage({
    message: `正在验证 ${row.name}...`,
    type: 'info',
    duration: 0,
  });
  let res: CmdbHostApi.VerifyResult;
  try {
    res = await verifyHostApi(row.id, password);
  } finally {
    loading.close();
  }
  if (res.is_verified) {
    ElMessage.success('验证成功');
    await fetchHosts();
    return;
  }
  // 没配独立密钥、且这次没带密码 -> 首次验证:弹框输密码,带密码再验一次。
  // 配了独立密钥的,失败只可能是密钥不对,输密码没用,直接报错。
  if (!row.has_pkey && !password) {
    let value: string;
    try {
      ({ value } = await ElMessageBox.prompt(
        `首次验证需要 ${row.username} 的登录密码，用于把平台公钥装到主机上，不会保存。`,
        `验证主机 ${row.name}`,
        { inputType: 'password', inputPlaceholder: '登录密码', confirmButtonText: '验证' },
      ));
    } catch {
      return; // 用户取消
    }
    await verify(row, value);
    return;
  }
  ElMessage.error(res.message || '验证失败');
}
</script>

<template>
  <div class="flex items-start gap-3 p-4">
    <!-- 左侧:分类树 -->
    <div class="cat-panel">
      <div class="cat-head">
        <span>主机分类</span>
        <ElButton
          v-if="can('host.category.add')"
          link
          vue
          type="primary"
          @click="openAddCategory"
        >
          <ElIcon><Plus /></ElIcon>
        </ElButton>
      </div>
      <ul class="cat-list">
        <li
          v-for="node in categoryNodes"
          :key="node.id"
          :class="{ active: query.category_id === node.id }"
          @click="selectCategory(node.id)"
        >
          <span class="cat-name">{{ node.label }}</span>
          <span class="cat-right">
              <span v-if="node.count !== null" class="cat-count">
                {{ node.count }}
              </span>
              <ElIcon
                v-if="node.deletable && can('host.category.del')"
                class="cat-del"
                @click.stop="removeCategory(node)"
              >
                <Delete />
              </ElIcon>
            </span>
        </li>
      </ul>
    </div>

    <!-- 右侧:主机列表 -->
    <div class="min-w-0 flex-1">
      <div class="mb-3 flex items-center gap-2">
        <ElInput
          v-model="query.keyword"
          class="!w-64"
          clearable
          placeholder="搜索名称、地址或备注"
          @clear="search"
          @keyup.enter="search"
        />
        <ElButton type="primary" @click="search">查询</ElButton>
        <div class="flex-1"></div>
        <ElButton v-if="can('host.host.add')" type="primary" @click="openCreate">
          新建主机
        </ElButton>
      </div>

      <ElTable v-loading="loading" :data="hosts" border stripe>
        <ElTableColumn label="主机名称" prop="name" min-width="140" />
        <ElTableColumn label="连接地址" min-width="200">
          <template #default="{ row }">
              <span class="font-mono">
                {{ row.username }}@{{ row.hostname }}:{{ row.port }}
              </span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="分类" width="120">
          <template #default="{ row }">
            <ElTag v-if="row.category_id" effect="plain" size="small" type="info">
              {{ categoryName(row.category_id) || '已删除' }}
            </ElTag>
            <span v-else class="text-gray-400">未分类</span>
          </template>
        </ElTableColumn>
        <ElTableColumn label="认证方式" width="110">
          <template #default="{ row }">
            <ElTag v-if="row.has_pkey" type="warning">独立密钥</ElTag>
            <ElTag v-else type="info">全局密钥</ElTag>
          </template>
        </ElTableColumn>
        <ElTableColumn label="验证状态" width="100">
          <template #default="{ row }">
            <ElTooltip
              :disabled="row.is_verified"
              content="还没有通过 SSH 连通性验证"
              placement="top"
            >
              <ElTag :type="row.is_verified ? 'success' : 'danger'">
                {{ row.is_verified ? '已验证' : '未验证' }}
              </ElTag>
            </ElTooltip>
          </template>
        </ElTableColumn>
        <ElTableColumn
          label="备注"
          prop="desc"
          min-width="160"
          show-overflow-tooltip
        />
        <ElTableColumn label="创建时间" prop="created_at" width="170" />
        <ElTableColumn
          v-if="can('host.host.view') || can('host.host.del')"
          label="操作"
          width="200"
          fixed="right"
        >
          <template #default="{ row }">
            <ElButton
              v-if="can('host.host.add')"
              link
              type="success"
              @click="verify(row as CmdbHostApi.Host)"
            >
              验证
            </ElButton>
            <ElButton
              v-if="can('host.host.edit')"
              link
              type="primary"
              @click="openEdit(row as CmdbHostApi.Host)"
            >
              编辑
            </ElButton>
            <ElButton
              v-if="can('host.host.del')"
              link
              type="danger"
              @click="remove(row as CmdbHostApi.Host)"
            >
              删除
            </ElButton>
            <ElButton
              v-if="can('host.terminal.view')"
              link
              type="primary"
              @click="openTerminal(row as CmdbHostApi.Host)"
              vue
            >
              终端
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
        @current-change="fetchHosts"
        @size-change="search"
      />
    </div>

    <ElDialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑主机' : '新建主机'"
      width="560px"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
        <ElFormItem label="主机名称" prop="name">
          <ElInput v-model="form.name" placeholder="全局唯一，如 web-01" />
        </ElFormItem>
        <ElFormItem label="分类" prop="category_id">
          <ElSelect
            v-model="form.category_id"
            class="w-full"
            clearable
            placeholder="未分类"
          >
            <ElOption
              v-for="c in categories"
              :key="c.id"
              :label="c.name"
              :value="c.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="连接地址" required>
          <div class="flex w-full gap-2">
            <ElFormItem class="!mb-0 flex-1" prop="username">
              <ElInput v-model="form.username" placeholder="用户名">
                <template #prepend>ssh</template>
              </ElInput>
            </ElFormItem>
            <ElFormItem class="!mb-0 flex-[2]" prop="hostname">
              <ElInput v-model="form.hostname" placeholder="主机名或 IP">
                <template #prepend>@</template>
              </ElInput>
            </ElFormItem>
          </div>
        </ElFormItem>
        <ElFormItem label="SSH 端口" prop="port">
          <ElInputNumber
            v-model="form.port"
            :max="65535"
            :min="1"
            controls-position="right"
          />
        </ElFormItem>

        <ElFormItem v-if="isEdit" label="独立密钥">
          <ElRadioGroup v-model="pkeyMode">
            <ElRadio value="keep">保持不变</ElRadio>
            <ElRadio value="replace">
              {{ editing?.has_pkey ? '替换' : '设置' }}
            </ElRadio>
            <ElRadio v-if="editing?.has_pkey" value="clear">
              清除，改用全局密钥
            </ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem
          v-if="showPkeyInput"
          :label="isEdit ? '' : '独立密钥'"
          prop="pkey"
        >
          <ElInput
            v-model="form.pkey"
            :rows="4"
            class="font-mono"
            placeholder="一般不用填，留空则使用平台全局密钥。只有这台主机必须用特定私钥登录时才粘贴 PEM 格式私钥"
            type="textarea"
          />
          <div class="mt-1 text-xs text-gray-400">
            私钥只会保存，不会再显示出来
          </div>
        </ElFormItem>

        <ElFormItem label="备注" prop="desc">
          <ElInput
            v-model="form.desc"
            :rows="2"
            maxlength="255"
            show-word-limit
            type="textarea"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton :loading="submitting" type="primary" @click="submit">
          确定
        </ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<style scoped>
.cat-panel {
  width: 200px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
}
.cat-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-weight: 600;
  border-bottom: 1px solid var(--el-border-color-light);
}
.cat-list {
  padding: 4px;
  margin: 0;
  list-style: none;
}
.cat-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
}
.cat-list li:hover {
  background: var(--el-fill-color-light);
}
.cat-list li.active {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.cat-name {

}
.cat-right {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
}
.cat-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.cat-del {
  color: var(--el-color-danger);
  opacity: 0;
}
.cat-list li:hover .cat-del {
  opacity: 1;
}
</style>
