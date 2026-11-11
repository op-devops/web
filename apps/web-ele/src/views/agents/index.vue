<script lang="ts" setup>
// 智能体管理 — ported from frontend-vue/src/views/AdminView.vue (agents tab).
// Goes through the real Gateway /api/agents CRUD.
import type { AgentInfo } from '#/api/deerflow/agents';

import { onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElSwitch,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import {
  createAgent,
  deleteAgent,
  fetchAgentDetail,
  fetchAgents,
  updateAgent,
} from '#/api/deerflow/agents';

defineOptions({ name: 'AgentsAdmin' });

const agents = ref<AgentInfo[]>([]);
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  try {
    agents.value = await fetchAgents();
  } finally {
    loading.value = false;
  }
});

const agentDialog = ref(false);
const agentEditing = ref<null | string>(null);
// defaultQuestions / kbFilter are edited as one entry per line (womi_ai 1.0
// convention) and converted to/from the API's string[] on save/backfill.
const agentForm = reactive({
  name: '',
  description: '',
  soul: '',
  defaultQuestions: '',
  kbFilter: '',
  shared: true,
});

function toQuestionList(text: string): string[] {
  return text
    .split('\n')
    .map((q) => q.trim())
    .filter(Boolean);
}
const agentBusy = ref(false);
// Guards the edit flow: the current SOUL.md is backfilled asynchronously, and
// we must not send `soul` (even "") until it has loaded — otherwise saving
// early would silently wipe the existing SOUL.
const soulLoaded = ref(false);

async function openAgentDialog(agent?: AgentInfo) {
  agentEditing.value = agent?.name ?? null;
  agentForm.name = agent?.name ?? '';
  agentForm.description = agent?.description ?? '';
  agentForm.soul = '';
  agentForm.defaultQuestions = '';
  agentForm.kbFilter = '';
  agentForm.shared = true;
  soulLoaded.value = !agent; // create mode has nothing to load
  agentDialog.value = true;
  if (agent) {
    const detail = await fetchAgentDetail(agent.name);
    if (detail?.soul) agentForm.soul = detail.soul;
    if (detail?.default_questions?.length) {
      agentForm.defaultQuestions = detail.default_questions.join('\n');
    }
    if (detail?.kb_filter?.length) {
      agentForm.kbFilter = detail.kb_filter.join('\n');
    }
    soulLoaded.value = detail !== null;
    if (detail === null) {
      ElMessage.warning('SOUL.md 加载失败：本次保存将不修改 SOUL 内容');
    }
  }
}

async function saveAgent() {
  if (!agentForm.name.trim()) {
    ElMessage.warning('请填写智能体名称（英文/数字/短横线）');
    return;
  }
  agentBusy.value = true;
  try {
    if (agentEditing.value) {
      // Always send `soul` / `default_questions` once the detail has loaded —
      // empty means "clear" (backend: omitted = leave untouched, "" / [] =
      // overwrite). Both ride the soulLoaded guard so a failed detail load
      // never wipes existing content.
      await updateAgent(agentEditing.value, {
        description: agentForm.description,
        ...(soulLoaded.value
          ? {
              soul: agentForm.soul,
              default_questions: toQuestionList(agentForm.defaultQuestions),
              kb_filter: toQuestionList(agentForm.kbFilter),
            }
          : {}),
      });
    } else {
      const defaultQuestions = toQuestionList(agentForm.defaultQuestions);
      const kbFilter = toQuestionList(agentForm.kbFilter);
      await createAgent({
        name: agentForm.name.trim(),
        description: agentForm.description,
        shared: agentForm.shared,
        ...(agentForm.soul.trim() ? { soul: agentForm.soul } : {}),
        ...(defaultQuestions.length > 0
          ? { default_questions: defaultQuestions }
          : {}),
        ...(kbFilter.length > 0 ? { kb_filter: kbFilter } : {}),
      });
    }
    agents.value = await fetchAgents();
    ElMessage.success('已保存');
    agentDialog.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    agentBusy.value = false;
  }
}

async function removeAgent(agent: AgentInfo) {
  try {
    await ElMessageBox.confirm(
      `确定删除智能体「${agent.name}」吗？将删除其配置、SOUL.md 与记忆。`,
      '删除智能体',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    );
  } catch {
    return;
  }
  try {
    await deleteAgent(agent.name);
    agents.value = await fetchAgents();
    ElMessage.success('已删除');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除失败');
  }
}
</script>

<template>
  <Page title="智能体管理" description="自定义智能体（配置 + SOUL.md）">
    <div v-loading="loading">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span class="text-muted-foreground text-sm">
          共 {{ agents.length }} 个（存储于当前账号名下）
        </span>
        <ElButton type="primary" @click="openAgentDialog()">
          新建智能体
        </ElButton>
      </div>
      <ElTable :data="agents" size="small" class="w-full">
        <ElTableColumn
          prop="name"
          label="名称（slug）"
          min-width="220"
          show-overflow-tooltip
        />
        <ElTableColumn
          prop="description"
          label="描述"
          min-width="260"
          show-overflow-tooltip
        />
        <ElTableColumn label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <ElButton
              link
              type="primary"
              @click="openAgentDialog(row as AgentInfo)"
            >
              编辑
            </ElButton>
            <ElButton link type="danger" @click="removeAgent(row as AgentInfo)">
              删除
            </ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </div>

    <!-- 智能体编辑弹窗 -->
    <ElDialog
      v-model="agentDialog"
      :title="agentEditing ? `编辑智能体：${agentEditing}` : '新建智能体'"
      width="60%"
    >
      <ElForm label-width="88px" label-position="left">
        <ElFormItem label="名称(slug)">
          <ElInput
            v-model="agentForm.name"
            :disabled="Boolean(agentEditing)"
            placeholder="如 gaodengshuxue-wenda（英文/数字/短横线）"
          />
        </ElFormItem>
        <ElFormItem label="描述">
          <ElInput
            v-model="agentForm.description"
            type="textarea"
            :rows="2"
            resize="vertical"
          />
        </ElFormItem>
        <ElFormItem label="SOUL.md">
          <ElInput
            v-model="agentForm.soul"
            type="textarea"
            :rows="8"
            resize="vertical"
            placeholder="系统提示词 / 角色设定（可空）"
          />
        </ElFormItem>
        <ElFormItem label="默认提问">
          <ElInput
            v-model="agentForm.defaultQuestions"
            type="textarea"
            :rows="3"
            resize="vertical"
            placeholder="每行一个问题，展示在该智能体对话页，点击即发送（可空）"
          />
        </ElFormItem>
        <ElFormItem label="知识库筛选">
          <ElInput
            v-model="agentForm.kbFilter"
            type="textarea"
            :rows="3"
            resize="vertical"
            placeholder="每行一个书名，knowledge_base_search 仅检索这些书（按 doc_filter_field=book_name 过滤，可空=用全局默认）"
          />
        </ElFormItem>
        <ElFormItem v-if="!agentEditing" label="共享">
          <ElSwitch v-model="agentForm.shared" />
          <span class="text-muted-foreground ml-2 text-sm">
            开启后写入全局目录（backend/.deer-flow/agents/），所有账号可用
          </span>
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="agentDialog = false">取消</ElButton>
        <ElButton type="primary" :loading="agentBusy" @click="saveAgent">
          保存
        </ElButton>
      </template>
    </ElDialog>
  </Page>
</template>
