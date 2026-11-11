<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { CmdbHostApi, CronTaskApi } from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  ElButton,
  ElDatePicker,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElRadioButton,
  ElRadioGroup,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
} from 'element-plus';

import {
  createTaskApi,
  deleteTaskApi,
  listHostsApi,
  listTasksApi,
  setTaskActiveApi,
  updateTaskApi,
} from '#/api';
import { usePerm } from '#/composables/use-perm';

defineOptions({ name: 'CronTask' });

const { can } = usePerm();

// ---------- 主机(执行对象) ----------

const hosts = ref<CmdbHostApi.Host[]>([]);
const hostMap = computed(() => new Map(hosts.value.map((h) => [h.id, h])));

async function fetchHosts() {
  // 主机列表要 host.host.view 权限,且按角色的主机分类过滤;没权限时下拉为空,不阻塞页面
  try {
    const res = await listHostsApi({ page: 1, page_size: 200 });
    hosts.value = res.hosts;
  } catch {
    hosts.value = [];
  }
}

function hostLabel(id: string) {
  const h = hostMap.value.get(id);
  return h ? `${h.name}(${h.hostname})` : `已删除主机 ${id.slice(0, 6)}…`;
}

// ---------- 列表 ----------

const loading = ref(false);
const tasks = ref<CronTaskApi.Task[]>([]);
const types = ref<string[]>([]);
const total = ref(0);
const query = reactive<{
  is_activate: '' | boolean;
  latest_status: '' | CronTaskApi.Status;
  name: string;
  page: number;
  page_size: number;
  type: string;
}>({
  name: '',
  type: '',
  is_activate: '',
  latest_status: '',
  page: 1,
  page_size: 20,
});

async function fetchTasks() {
  loading.value = true;
  try {
    const res = await listTasksApi({
      name: query.name,
      type: query.type,
      // 空串表示"全部",不传给后端
      is_activate: query.is_activate === '' ? undefined : query.is_activate,
      latest_status: query.latest_status === '' ? undefined : query.latest_status,
      page: query.page,
      page_size: query.page_size,
    });
    tasks.value = res.tasks;
    types.value = res.types;
    total.value = res.pagination.total;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchTasks();
  fetchHosts();
});

function search() {
  query.page = 1;
  fetchTasks();
}

const STATUS: Record<
  Exclude<CronTaskApi.Status, -1>,
  { label: string; type: 'danger' | 'success' | 'warning' }
> = {
  0: { label: '执行中', type: 'warning' },
  1: { label: '成功', type: 'success' },
  2: { label: '失败', type: 'danger' },
};

function triggerText(row: CronTaskApi.Task) {
  switch (row.trigger) {
    case 'cron': {
      const args = parseCronArgs(row.trigger_args);
      return `Cron ${args.rule}`;
    }
    case 'date': {
      return `一次性 ${row.trigger_args}`;
    }
    case 'interval': {
      return `每 ${row.trigger_args} 秒`;
    }
    default: {
      return `${row.trigger} ${row.trigger_args}`;
    }
  }
}

// ---------- 启用 / 停用 ----------

const togglingId = ref('');

async function toggleActive(row: CronTaskApi.Task, want: boolean) {
  togglingId.value = row.id;
  try {
    const task = await setTaskActiveApi(row.id, want);
    Object.assign(row, task);
    ElMessage.success(want ? '已启用，任务进入调度' : '已停用');
  } finally {
    togglingId.value = '';
  }
}

// ---------- 新建 / 编辑 ----------

const NOTIFY_PLACEHOLDER: Record<string, string> = {
  '0': '已关闭',
  '1': 'https://oapi.dingtalk.com/robot/send?access_token=xxx',
  '2': 'https://your.webhook/url',
  '3': 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
  '4': 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
};

interface CronArgs {
  rule: string;
  start: null | string;
  stop: null | string;
}

function parseCronArgs(raw: string): CronArgs {
  try {
    const v = JSON.parse(raw);
    return { rule: v.rule ?? '', start: v.start ?? null, stop: v.stop ?? null };
  } catch {
    return { rule: raw, start: null, stop: null };
  }
}

const dialogVisible = ref(false);
const editing = ref<CronTaskApi.Task | null>(null);
const submitting = ref(false);
const formRef = ref<FormInstance>();
const isEdit = computed(() => !!editing.value);

const form = reactive({
  name: '',
  type: '',
  interpreter: 'sh',
  command: '',
  targets: [] as string[],
  trigger: 'interval' as CronTaskApi.Trigger,
  interval: 3600 as number | undefined,
  date: '' as string,
  cron: { rule: '', start: null, stop: null } as CronArgs,
  notifyMode: '0',
  notifyValue: '',
  desc: '',
});

// 长度跟 cron 网关 gateway/schemas/task.py 保持一致
const length = (min: number, max: number) => ({
  min,
  max,
  message: `长度 ${min}~${max} 个字符`,
  trigger: 'blur',
});
const rules: FormRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }, length(1, 50)],
  type: [{ required: true, message: '请选择或输入任务类型', trigger: 'change' }, length(1, 50)],
  command: [{ required: true, message: '请输入执行内容', trigger: 'blur' }],
  targets: [
    { required: true, type: 'array', min: 1, message: '请选择执行对象', trigger: 'change' },
  ],
  interval: [
    {
      trigger: 'change',
      validator: (_r, _v, cb) =>
        form.trigger === 'interval' && !form.interval ? cb(new Error('请输入间隔秒数')) : cb(),
    },
  ],
  date: [
    {
      trigger: 'change',
      validator: (_r, _v, cb) => {
        if (form.trigger !== 'date') return cb();
        if (!form.date) return cb(new Error('请选择执行时间'));
        if (new Date(form.date.replace(' ', 'T')) <= new Date()) {
          return cb(new Error('执行时间不能早于当前时间'));
        }
        cb();
      },
    },
  ],
  'cron.rule': [
    {
      trigger: 'blur',
      validator: (_r, _v, cb) => {
        if (form.trigger !== 'cron') return cb();
        if (form.cron.rule.trim().split(/\s+/).length !== 5) {
          return cb(new Error('需要 5 段：分 时 日 月 周，例如 0 1 * * *'));
        }
        cb();
      },
    },
  ],
  notifyValue: [
    { max: 255, message: '最多 255 个字符', trigger: 'blur' },
    {
      trigger: 'blur',
      validator: (_r, _v, cb) =>
        form.notifyMode !== '0' && !form.notifyValue.trim()
          ? cb(new Error('请输入通知地址'))
          : cb(),
    },
  ],
  desc: [{ max: 255, message: '最多 255 个字符', trigger: 'blur' }],
};

function resetForm() {
  Object.assign(form, {
    name: '',
    type: '',
    interpreter: 'sh',
    command: '',
    targets: [],
    trigger: 'interval',
    interval: 3600,
    date: '',
    cron: { rule: '', start: null, stop: null },
    notifyMode: '0',
    notifyValue: '',
    desc: '',
  });
}

function openCreate() {
  editing.value = null;
  resetForm();
  dialogVisible.value = true;
  formRef.value?.clearValidate();
}

function openEdit(row: CronTaskApi.Task) {
  editing.value = row;
  resetForm();
  Object.assign(form, {
    name: row.name,
    type: row.type,
    interpreter: row.interpreter || 'sh',
    command: row.command,
    targets: [...row.targets],
    trigger: row.trigger,
    notifyMode: row.rst_notify?.mode || '0',
    notifyValue: row.rst_notify?.value || '',
    desc: row.desc,
  });
  if (row.trigger === 'interval') form.interval = Number(row.trigger_args) || undefined;
  if (row.trigger === 'date') form.date = row.trigger_args;
  if (row.trigger === 'cron') form.cron = parseCronArgs(row.trigger_args);
  dialogVisible.value = true;
  formRef.value?.clearValidate();
}

function buildTriggerArgs(): string {
  switch (form.trigger) {
    case 'cron': {
      return JSON.stringify({
        rule: form.cron.rule.trim().split(/\s+/).join(' '),
        start: form.cron.start || null,
        stop: form.cron.stop || null,
      });
    }
    case 'date': {
      return form.date;
    }
    default: {
      // 统一按字符串传:网关的 int 分支限制 ≤500,字符串分支没有这个限制
      return String(form.interval);
    }
  }
}

async function submit() {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  submitting.value = true;
  try {
    const data: CronTaskApi.SaveParams = {
      name: form.name,
      type: form.type,
      interpreter: form.interpreter,
      command: form.command,
      targets: form.targets,
      trigger: form.trigger,
      trigger_args: buildTriggerArgs(),
      rst_notify: {
        mode: form.notifyMode,
        value: form.notifyMode === '0' ? '' : form.notifyValue.trim(),
      },
      desc: form.desc,
    };
    if (editing.value) {
      await updateTaskApi(editing.value.id, data);
      ElMessage.success('已保存');
    } else {
      await createTaskApi(data);
      ElMessage.success('已添加，任务默认停用，打开“启用”开关后才会调度');
    }
    dialogVisible.value = false;
    await fetchTasks();
  } finally {
    submitting.value = false;
  }
}

// ---------- 删除 ----------

async function remove(row: CronTaskApi.Task) {
  await ElMessageBox.confirm(`确认删除任务【${row.name}】？删除后不可恢复。`, '删除确认', {
    type: 'warning',
  });
  await deleteTaskApi(row.id);
  ElMessage.success('已删除');
  if (tasks.value.length === 1 && query.page > 1) query.page -= 1;
  await fetchTasks();
}
</script>

<template>
  <div class="p-4">
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <ElInput
        v-model="query.name"
        class="!w-56"
        clearable
        placeholder="任务名称"
        @clear="search"
        @keyup.enter="search"
      />
      <ElSelect
        v-model="query.type"
        class="!w-40"
        clearable
        placeholder="任务类型"
        @change="search"
      >
        <ElOption v-for="t in types" :key="t" :label="t" :value="t" />
      </ElSelect>
      <ElSelect
        v-model="query.is_activate"
        class="!w-32"
        placeholder="启用状态"
        @change="search"
      >
        <ElOption label="全部" value="" />
        <ElOption :value="true" label="已启用" />
        <ElOption :value="false" label="已停用" />
      </ElSelect>
      <ElSelect
        v-model="query.latest_status"
        class="!w-32"
        placeholder="最近执行"
        @change="search"
      >
        <ElOption label="全部" value="" />
        <ElOption :value="1" label="成功" />
        <ElOption :value="2" label="失败" />
        <ElOption :value="0" label="执行中" />
      </ElSelect>
      <ElButton type="primary" @click="search">查询</ElButton>
      <div class="flex-1"></div>
      <ElButton v-if="can('cron.task.add')" type="primary" @click="openCreate">
        新建任务
      </ElButton>
    </div>

    <ElTable v-loading="loading" :data="tasks" border stripe>
      <ElTableColumn label="任务名称" prop="name" min-width="140" show-overflow-tooltip />
      <ElTableColumn label="类型" width="110">
        <template #default="{ row }">
          <ElTag effect="plain" size="small" type="info">{{ row.type }}</ElTag>
        </template>
      </ElTableColumn>
      <ElTableColumn label="触发方式" min-width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <span class="font-mono text-sm">{{ triggerText(row as CronTaskApi.Task) }}</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="执行对象" width="110">
        <template #default="{ row }">
          <ElTooltip placement="top">
            <template #content>
              <div v-for="id in row.targets" :key="id">{{ hostLabel(id) }}</div>
            </template>
            <span class="cursor-default">{{ row.targets.length }} 台主机</span>
          </ElTooltip>
        </template>
      </ElTableColumn>
      <ElTableColumn label="最近执行" width="190">
        <template #default="{ row }">
          <template v-if="row.latest_status !== -1">
            <ElTag :type="STATUS[row.latest_status as 0 | 1 | 2].type" size="small">
              {{ STATUS[row.latest_status as 0 | 1 | 2].label }}
            </ElTag>
            <span class="ml-2 text-xs text-gray-400">{{ row.latest_run_time }}</span>
          </template>
          <ElTag v-else-if="row.is_activate" size="small">待调度</ElTag>
          <span v-else class="text-gray-400">未执行</span>
        </template>
      </ElTableColumn>
      <ElTableColumn label="启用" width="80" align="center">
        <template #default="{ row }">
          <ElSwitch
            :disabled="!can('cron.task.edit')"
            :loading="togglingId === row.id"
            :model-value="row.is_activate"
            @update:model-value="(v) => toggleActive(row as CronTaskApi.Task, !!v)"
          />
        </template>
      </ElTableColumn>
      <ElTableColumn label="备注" prop="desc" min-width="140" show-overflow-tooltip />
      <ElTableColumn label="创建时间" prop="create_at" width="170" />
      <ElTableColumn
        v-if="can('cron.task.edit') || can('cron.task.del')"
        label="操作"
        width="130"
        fixed="right"
      >
        <template #default="{ row }">
          <ElButton
            v-if="can('cron.task.edit')"
            link
            type="primary"
            @click="openEdit(row as CronTaskApi.Task)"
          >
            编辑
          </ElButton>
          <ElTooltip
            v-if="can('cron.task.del')"
            :disabled="!row.is_activate"
            content="启用中的任务不能删除，请先停用"
            placement="top"
          >
            <span>
              <ElButton
                :disabled="row.is_activate"
                link
                type="danger"
                @click="remove(row as CronTaskApi.Task)"
              >
                删除
              </ElButton>
            </span>
          </ElTooltip>
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
      @current-change="fetchTasks"
      @size-change="search"
    />

    <ElDialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑任务' : '新建任务'"
      width="60%"
    >
      <ElForm ref="formRef" :model="form" :rules="rules" label-width="90px">
        <ElFormItem label="任务名称" prop="name">
          <ElInput v-model="form.name" maxlength="50" placeholder="如 清理临时文件" />
        </ElFormItem>
        <ElFormItem label="任务类型" prop="type">
          <ElSelect
            v-model="form.type"
            allow-create
            class="w-full"
            default-first-option
            filterable
            placeholder="选择已有类型，或直接输入新类型"
          >
            <ElOption v-for="t in types" :key="t" :label="t" :value="t" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="执行内容" prop="command">
          <div class="w-full">
            <ElRadioGroup v-model="form.interpreter" class="mb-2">
              <ElRadioButton value="sh">Shell</ElRadioButton>
              <ElRadioButton value="python">Python</ElRadioButton>
            </ElRadioGroup>
            <ElInput
              v-model="form.command"
              :rows="6"
              class="font-mono"
              placeholder="要在目标主机上执行的脚本"
              type="textarea"
            />
          </div>
        </ElFormItem>
        <ElFormItem label="执行对象" prop="targets">
          <ElSelect
            v-model="form.targets"
            class="w-full"
            collapse-tags
            collapse-tags-tooltip
            filterable
            multiple
            :max-collapse-tags="4"
            :no-data-text="hosts.length ? '无匹配主机' : '没有可选主机（需要主机查看权限）'"
            placeholder="选择主机，可多选"
          >
            <ElOption
              v-for="h in hosts"
              :key="h.id"
              :label="`${h.name}(${h.hostname})`"
              :value="h.id"
            />
          </ElSelect>
        </ElFormItem>

        <ElFormItem label="触发方式">
          <ElRadioGroup v-model="form.trigger">
            <ElRadioButton value="interval">普通间隔</ElRadioButton>
            <ElRadioButton value="date">一次性</ElRadioButton>
            <ElRadioButton value="cron">UNIX Cron</ElRadioButton>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem v-if="form.trigger === 'interval'" label="间隔(秒)" prop="interval">
          <ElInputNumber
            v-model="form.interval"
            :min="1"
            :step="60"
            controls-position="right"
          />
          <span class="ml-2 text-xs text-gray-400">每隔 N 秒执行一次</span>
        </ElFormItem>
        <ElFormItem v-if="form.trigger === 'date'" label="执行时间" prop="date">
          <ElDatePicker
            v-model="form.date"
            :disabled-date="(d: Date) => d.getTime() < Date.now() - 86_400_000"
            placeholder="仅在该时间执行一次"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </ElFormItem>
        <template v-if="form.trigger === 'cron'">
          <ElFormItem label="执行规则" prop="cron.rule">
            <ElInput
              v-model="form.cron.rule"
              class="font-mono"
              placeholder="分 时 日 月 周，例如每天凌晨 1 点：0 1 * * *"
            />
          </ElFormItem>
          <ElFormItem label="生效区间">
            <div class="flex w-full items-center gap-2">
              <ElDatePicker
                v-model="form.cron.start"
                class="!flex-1"
                placeholder="开始时间(可选)"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
              <span class="text-gray-400">至</span>
              <ElDatePicker
                v-model="form.cron.stop"
                class="!flex-1"
                placeholder="结束时间(可选)"
                type="datetime"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </div>
          </ElFormItem>
        </template>

        <ElFormItem label="失败通知" prop="notifyValue">
          <div class="flex w-full gap-2">
            <ElSelect v-model="form.notifyMode" class="!w-32">
              <ElOption label="关闭" value="0" />
              <ElOption label="钉钉" value="1" />
              <ElOption label="Webhook" value="2" />
            </ElSelect>
            <ElInput
              v-model="form.notifyValue"
              class="flex-1"
              :disabled="form.notifyMode === '0'"
              :placeholder="NOTIFY_PLACEHOLDER[form.notifyMode]"
            />
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
        <ElButton :loading="submitting" type="primary" @click="submit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>
