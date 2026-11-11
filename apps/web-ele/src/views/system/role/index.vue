<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import {
  ElButton,
  ElCheckbox,
  ElDialog,
  ElDrawer,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import {type CmdbCategoryApi, listCategoriesApi, type PagePerms, type SystemRoleApi} from '#/api';
import {
  createRoleApi,
  deleteRoleApi,
  listRolesApi,
  updateRoleApi,
  updateRoleHostCategoriesApi,
  updateRolePermsApi,
} from '#/api';
import { usePerm } from '#/composables/use-perm';
import { PERM_TREE } from '#/views/system/codes';

defineOptions({ name: 'SystemRole' });

const { can } = usePerm();

const loading = ref(false);
const roles = ref<SystemRoleApi.Role[]>([]);

async function fetchRoles() {
  loading.value = true;
  try {
    roles.value = await listRolesApi();
  } finally {
    loading.value = false;
  }
}

onMounted(fetchRoles);

// ---------- 新建 / 编辑 ----------

const dialogVisible = ref(false);
const editingId = ref('');
const submitting = ref(false);
const form = reactive({ name: '', desc: '' });
const isEdit = computed(() => !!editingId.value);

function openCreate() {
  editingId.value = '';
  Object.assign(form, { name: '', desc: '' });
  dialogVisible.value = true;
}

function openEdit(row: SystemRoleApi.Role) {
  editingId.value = row.id;
  Object.assign(form, { name: row.name, desc: row.desc });
  dialogVisible.value = true;
}

async function submit() {
  submitting.value = true;
  try {
    await (isEdit.value
      ? updateRoleApi(editingId.value, form)
      : createRoleApi(form));
    ElMessage.success(isEdit.value ? '已保存' : '已创建');
    dialogVisible.value = false;
    await fetchRoles();
  } finally {
    submitting.value = false;
  }
}

async function remove(row: SystemRoleApi.Role) {
  await ElMessageBox.confirm(`确认删除角色【${row.name}】？`, '删除确认', {
    type: 'warning',
  });
  await deleteRoleApi(row.id);
  ElMessage.success('已删除');
  await fetchRoles();
}

// ---------- 权限分配 ----------

const permDrawer = ref(false);
const permSaving = ref(false);
const permRole = ref<null | SystemRoleApi.Role>(null);
// 编辑中的权限树：{ 模块: { 页面: [动作] } }
const perms = ref<PagePerms>({});

function openPerms(row: SystemRoleApi.Role) {
  permRole.value = row;
  // 深拷贝，取消时不影响列表里的数据
  perms.value = JSON.parse(JSON.stringify(row.page_perms ?? {}));
  permDrawer.value = true;
}

function selected(mod: string, page: string): string[] {
  return perms.value[mod]?.[page] ?? [];
}

function toggle(mod: string, page: string, perm: string, checked: boolean) {
  if (!perms.value[mod]) perms.value[mod] = {};
  const cur = new Set(perms.value[mod][page] ?? []);
  checked ? cur.add(perm) : cur.delete(perm);
  perms.value[mod][page] = [...cur];
}

/** 整页全选/全不选 */
function togglePage(mod: string, page: string, all: string[], checked: boolean) {
  if (!perms.value[mod]) perms.value[mod] = {};
  perms.value[mod][page] = checked ? [...all] : [];
}

function pageState(mod: string, page: string, all: string[]) {
  const cur = selected(mod, page).length;
  return { checked: cur > 0 && cur === all.length, indeterminate: cur > 0 && cur < all.length };
}

const permCount = computed(() =>
  Object.values(perms.value).reduce(
    (n, pages) => n + Object.values(pages).reduce((m, list) => m + list.length, 0),
    0,
  ),
);

async function savePerms() {
  if (!permRole.value) return;
  await ElMessageBox.confirm(
    `保存后，【${permRole.value.name}】下已登录的用户不受影响，下次登录才拿到新权限。如需立即生效，请到账户管理手动强制下线。`,
    '确认保存权限',
    { type: 'warning' },
  );
  permSaving.value = true;
  try {
    await updateRolePermsApi(permRole.value.id, perms.value);
    ElMessage.success('权限已保存');
    permDrawer.value = false;
    await fetchRoles();
  } finally {
    permSaving.value = false;
  }
}

// ---------- 主机分类数据权限 ----------

const scopeDrawer = ref(false);
const scopeSaving = ref(false);
const scopeRole = ref<null | SystemRoleApi.Role>(null);
const scopeAll = ref(false);
const scopeIds = ref<string[]>([]);
const categories = ref<CmdbCategoryApi.Category[]>([]);

async function openScope(row: SystemRoleApi.Role) {
  scopeRole.value = row;
  scopeAll.value = row.host_category_all;
  scopeIds.value = [...(row.host_categories ?? [])];
  scopeDrawer.value = true;
  // 分类列表只有打开时才有必要拉,拉一次就够
  if (categories.value.length === 0) {
    categories.value = (await listCategoriesApi()).categories;
  }
}

async function saveScope() {
  if (!scopeRole.value) return;
  scopeSaving.value = true;
  try {
    await updateRoleHostCategoriesApi(scopeRole.value.id, {
      host_category_all: scopeAll.value,
      // 勾了"全部分类"后具体列表被忽略,清空免得把旧选择带回去
      category_ids: scopeAll.value ? [] : scopeIds.value,
    });
    ElMessage.success('主机范围已保存，目标用户下次登录生效');
    scopeDrawer.value = false;
    await fetchRoles();
  } finally {
    scopeSaving.value = false;
  }
}


</script>

<template>
  <div class="p-4">
    <div class="mb-3 flex items-center">
      <div class="flex-1"></div>
      <ElButton v-if="can('system.role.add')" type="primary" @click="openCreate">
        新建角色
      </ElButton>
    </div>

    <ElTable v-loading="loading" :data="roles" border stripe>
      <ElTableColumn label="角色名称" prop="name" min-width="140" />
      <ElTableColumn label="描述" prop="desc" min-width="220" />
      <ElTableColumn label="使用中" width="100">
        <template #default="{ row }">
          <ElTag :type="row.used > 0 ? 'warning' : 'info'">
            {{ row.used }} 人
          </ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="创建时间" prop="created_at" min-width="170" />
      <ElTableColumn label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <ElButton
            v-if="can('system.role.edit')"
            link
            type="primary"
            @click="openPerms(row as SystemRoleApi.Role)"
          >
            分配权限
          </ElButton>
          <ElButton
            v-if="can('system.role.edit')"
            link
            type="primary"
            @click="openScope(row as SystemRoleApi.Role)"
          >
            主机范围
          </ElButton>
          <ElButton
            v-if="can('system.role.edit')"
            link
            type="primary"
            @click="openEdit(row as SystemRoleApi.Role)"
          >
            编辑
          </ElButton>
          <ElButton
            v-if="can('system.role.del')"
            link
            type="danger"
            @click="remove(row as SystemRoleApi.Role)"
          >
            删除
          </ElButton>
        </template>
      </ElTableColumn>
    </ElTable>

    <!-- 新建/编辑 -->
    <ElDialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑角色' : '新建角色'"
      width="440px"
    >
      <ElForm label-width="80px">
        <ElFormItem label="名称" required>
          <ElInput v-model="form.name" placeholder="如：运维、只读" />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput v-model="form.desc" type="textarea" :rows="3" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton :loading="submitting" type="primary" @click="submit">
          确定
        </ElButton>
      </template>
    </ElDialog>

    <!-- 权限分配 -->
    <ElDrawer
      v-model="permDrawer"
      :title="`分配权限 — ${permRole?.name ?? ''}`"
      size="720px"
    >
      <div class="mb-3 text-sm text-gray-500">
        已选 <b>{{ permCount }}</b> 项。保存后对在线用户不生效，下次登录才拿到新权限。
      </div>

      <div v-for="mod in PERM_TREE" :key="mod.key" class="mb-5">
        <div class="mb-2 border-b pb-1 font-medium">{{ mod.label }}</div>
        <div
          v-for="page in mod.pages"
          :key="page.key"
          class="mb-2 flex items-start gap-3"
        >
          <div class="w-32 shrink-0">
            <ElCheckbox
              :indeterminate="
                pageState(mod.key, page.key, page.perms.map((p) => p.key))
                  .indeterminate
              "
              :model-value="
                pageState(mod.key, page.key, page.perms.map((p) => p.key)).checked
              "
              @change="
                (v) =>
                  togglePage(
                    mod.key,
                    page.key,
                    page.perms.map((p) => p.key),
                    v as boolean,
                  )
              "
            >
              {{ page.label }}
            </ElCheckbox>
          </div>
          <div class="flex flex-wrap gap-x-4 gap-y-1">
            <ElCheckbox
              v-for="perm in page.perms"
              :key="perm.key"
              :model-value="selected(mod.key, page.key).includes(perm.key)"
              @change="
                (v) => toggle(mod.key, page.key, perm.key, v as boolean)
              "
            >
              {{ perm.label }}
            </ElCheckbox>
          </div>
        </div>
      </div>

      <template #footer>
        <ElButton @click="permDrawer = false">取消</ElButton>
        <ElButton :loading="permSaving" type="primary" @click="savePerms">
          保存
        </ElButton>
      </template>
    </ElDrawer>
    <!-- 主机分类数据权限 -->
    <ElDrawer
      v-model="scopeDrawer"
      :title="`可管理主机分类 — ${scopeRole?.name ?? ''}`"
      size="520px"
    >
      <div class="mb-4 text-sm text-gray-500">
        控制这个角色能看到/操作哪些分类下的主机，列表、编辑、删除、Web 终端都受此限制。
        未配置时该角色看不到任何主机。
      </div>

      <ElForm label-width="100px">
        <ElFormItem label="全部分类">
          <ElSwitch v-model="scopeAll" />
          <span class="ml-2 text-xs text-gray-400">
              开启后包含以后新增的分类
            </span>
        </ElFormItem>
        <ElFormItem label="可管理分类">
          <ElSelect
            v-model="scopeIds"
            class="w-full"
            multiple
            clearable
            :disabled="scopeAll"
            placeholder="选择允许的分类"
          >
            <ElOption label="未分类" value="none" />
            <ElOption
              v-for="c in categories"
              :key="c.id"
              :label="`${c.name}（${c.host_count}）`"
              :value="c.id"
            />
          </ElSelect>
        </ElFormItem>
      </ElForm>

      <template #footer>
        <ElButton @click="scopeDrawer = false">取消</ElButton>
        <ElButton :loading="scopeSaving" type="primary" @click="saveScope">
          保存
        </ElButton>
      </template>
    </ElDrawer>
  </div>
</template>
