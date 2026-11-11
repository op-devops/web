<script lang="ts" setup>
import type { SystemRoleApi, SystemUserApi } from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import {
  createUserApi,
  deleteUserApi,
  kickUserApi,
  listRolesApi,
  listUsersApi,
  resetPasswordApi,
  setUserActiveApi,
  updateUserApi,
} from '#/api';
import { usePerm } from '#/composables/use-perm';

defineOptions({ name: 'SystemAccount' });

const { can } = usePerm();

const loading = ref(false);
const users = ref<SystemUserApi.User[]>([]);
const roles = ref<SystemRoleApi.Role[]>([]);
const query = reactive({ keyword: '', page: 1, page_size: 20 });
const total = ref(0);
const onlineIds = ref<Set<string>>(new Set());

const roleName = (id: string) =>
  roles.value.find((r) => r.id === id)?.name ?? id;

async function fetchUsers() {
  loading.value = true;
  try {
    const res = await listUsersApi(query);
    users.value = res.users;
    total.value = res.pagination.total;
    onlineIds.value = new Set(res.online_ids ?? []);
  } finally {
    loading.value = false;
  }
}

async function fetchRoles() {
  roles.value = await listRolesApi();
}

onMounted(async () => {
  await Promise.all([fetchUsers(), fetchRoles()]);
});

function search() {
  query.page = 1;
  fetchUsers();
}

// ---------- 新建 / 编辑 ----------

const dialogVisible = ref(false);
const editingId = ref('');
const submitting = ref(false);
const form = reactive({
  username: '',
  password: '',
  nickname: '',
  email: '',
  is_supper: false,
  role_ids: [] as string[],
});

const isEdit = computed(() => !!editingId.value);

function openCreate() {
  editingId.value = '';
  Object.assign(form, {
    username: '',
    password: '',
    nickname: '',
    email: '',
    is_supper: false,
    role_ids: [],
  });
  dialogVisible.value = true;
}

function openEdit(row: SystemUserApi.User) {
  editingId.value = row.id;
  Object.assign(form, {
    username: row.username,
    password: '',
    nickname: row.nickname,
    email: row.email,
    is_supper: row.is_supper,
    role_ids: [...row.role_ids],
  });
  dialogVisible.value = true;
}

async function submit() {
  submitting.value = true;
  try {
    await (isEdit.value
      ? updateUserApi(editingId.value, {
          nickname: form.nickname,
          email: form.email,
          is_supper: form.is_supper,
          role_ids: form.role_ids,
        })
      : createUserApi({
          username: form.username,
          password: form.password,
          nickname: form.nickname,
          email: form.email,
          is_supper: form.is_supper,
          role_ids: form.role_ids,
        }));
    ElMessage.success(isEdit.value ? '已保存' : '已创建');
    dialogVisible.value = false;
    await fetchUsers();
  } finally {
    submitting.value = false;
  }
}

// ---------- 行操作 ----------

async function toggleActive(row: SystemUserApi.User) {
  const next = !row.is_active;
  await ElMessageBox.confirm(
    next
      ? `确认启用【${row.username}】？`
      : `确认禁用【${row.username}】？该用户当前的登录态会立即失效。`,
    '操作确认',
    { type: 'warning' },
  );
  await setUserActiveApi(row.id, next);
  ElMessage.success(next ? '已启用' : '已禁用');
  await fetchUsers();
}

async function resetPassword(row: SystemUserApi.User) {
  const { value } = await ElMessageBox.prompt(
    `为【${row.username}】设置新密码（至少 8 位，含数字、大小写字母）。该用户所有登录态会立即失效。`,
    '重置登录密码',
    { inputType: 'password', inputPlaceholder: '新密码' },
  );
  await resetPasswordApi(row.id, value);
  ElMessage.success('密码已重置');
}

async function remove(row: SystemUserApi.User) {
  await ElMessageBox.confirm(
    `确认删除【${row.username}】？删除即禁用，账号和角色都保留，之后点“启用”即可恢复。`,
    '删除确认',
    { type: 'warning' },
  );
  await deleteUserApi(row.id);
  ElMessage.success('已删除');
  await fetchUsers();
}

async function kick(row: SystemUserApi.User) {
  await ElMessageBox.confirm(
    `确认强制【${row.username}】下线？该用户当前所有登录态立即失效，需重新登录。`,
    '强制下线',
    { type: 'warning' },
  );
  const res = await kickUserApi(row.id);
  ElMessage.success(`已强制下线（${res.killed} 个会话）`);
}

</script>

<template>
  <div class="p-4">
    <div class="mb-3 flex items-center gap-2">
      <ElInput
        v-model="query.keyword"
        class="!w-64"
        clearable
        placeholder="搜索登录名或姓名"
        @clear="search"
        @keyup.enter="search"
      />
      <ElButton type="primary" @click="search">查询</ElButton>
      <div class="flex-1"></div>
      <ElButton v-if="can('system.account.add')" type="primary" @click="openCreate">
        新建账户
      </ElButton>
    </div>

    <ElTable v-loading="loading" :data="users" border stripe>
      <ElTableColumn label="登录名" prop="username" min-width="120" />
      <ElTableColumn label="姓名" prop="nickname" min-width="100" />
      <ElTableColumn label="角色" min-width="180">
        <template #default="{ row }">
          <ElTag v-if="row.is_supper" type="danger" class="mr-1">超管</ElTag>
          <ElTag
            v-for="rid in row.role_ids"
            :key="rid"
            class="mr-1"
            type="info"
          >
            {{ roleName(rid) }}
          </ElTag>
          <span v-if="!row.is_supper && row.role_ids.length === 0">—</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="状态" width="90">
        <template #default="{ row }">
          <ElTag :type="row.is_active ? 'success' : 'info'">
            {{ row.is_active ? '正常' : '已禁用' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="在线" width="80">
        <template #default="{ row }">
          <ElTag :type="onlineIds.has(row.id) ? 'success' : 'info'" effect="plain">
            {{ onlineIds.has(row.id) ? '在线' : '离线' }}
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="最近登录" min-width="230">
        <template #default="{ row }">
          <span v-if="row.last_login">
            {{ row.last_login }}
            <span class="text-gray-400">（{{ row.last_ip }}）</span>
          </span>
          <span v-else class="text-gray-400">从未登录</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <div class="op-grid">
          <ElButton
            v-if="can('system.account.edit')"
            link
            type="primary"
            @click="openEdit(row as SystemUserApi.User)"
          >
            编辑
          </ElButton>
          <ElButton
            v-if="can('system.account.edit')"
            link
            type="primary"
            @click="resetPassword(row as SystemUserApi.User)"
          >
            重置密码
          </ElButton>
          <ElButton
            v-if="can('system.account.edit')"
            link
            :type="row.is_active ? 'warning' : 'success'"
            @click="toggleActive(row as SystemUserApi.User)"
          >
            {{ row.is_active ? '禁用' : '启用' }}
          </ElButton>
          <ElButton
            v-if="can('system.account.kick')"
            link
            type="warning"
            @click="kick(row as SystemUserApi.User)"
          >
            强制下线
          </ElButton>
          <ElButton
            v-if="can('system.account.del')"
            link
            type="danger"
            @click="remove(row as SystemUserApi.User)"
          >
            删除
          </ElButton>
          </div>
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
      @current-change="fetchUsers"
      @size-change="search"
    />

    <ElDialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑账户' : '新建账户'"
      width="480px"
    >
      <ElForm label-width="90px">
        <ElFormItem label="登录名" required>
          <!-- 登录名是身份标识,建好之后不给改:改了等于换了个人,审计链路会断 -->
          <ElInput v-model="form.username" :disabled="isEdit" />
        </ElFormItem>
        <ElFormItem v-if="!isEdit" label="密码" required>
          <ElInput
            v-model="form.password"
            type="password"
            show-password
            placeholder="至少 8 位，含数字、大小写字母"
          />
        </ElFormItem>
        <ElFormItem label="姓名">
          <ElInput v-model="form.nickname" />
        </ElFormItem>
        <ElFormItem label="邮箱">
          <ElInput v-model="form.email" />
        </ElFormItem>
        <ElFormItem label="角色">
          <ElSelect v-model="form.role_ids" class="w-full" multiple clearable>
            <ElOption
              v-for="r in roles"
              :key="r.id"
              :label="r.name"
              :value="r.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="超级管理员">
          <ElSwitch v-model="form.is_supper" />
          <span class="ml-2 text-xs text-gray-400">
            绕过所有权限检查，谨慎授予
          </span>
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
.op-grid {
  display: grid;
  grid-template-columns: repeat(2, auto); /* 每行 2 个 */
  gap: 2px 12px;
  justify-content: start; /* 按钮靠左,不拉伸 */
}

/* Element Plus 给相邻按钮加了 margin-left,网格里会错位,清掉 */
.op-grid :deep(.el-button + .el-button) {
  margin-left: 0;
}
</style>
