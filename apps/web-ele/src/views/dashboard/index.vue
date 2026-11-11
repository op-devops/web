<script lang="ts" setup>
import { ElCard, ElEmpty } from 'element-plus';

defineOptions({ name: 'Dashboard' });

// 报表首页,先占位。后续补:概览指标卡 + 图表(主机数、验证率、登录趋势等)。
</script>

<template>
  <div class="p-4">
    <!-- 概览指标占位:后面接真实统计接口 -->
    <div class="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <ElCard v-for="i in 4" :key="i" shadow="never">
        <div class="text-sm text-gray-400">指标 {{ i }}</div>
        <div class="mt-2 text-2xl font-semibold text-gray-300">—</div>
      </ElCard>
    </div>

    <ElCard shadow="never">
      <ElEmpty description="报表建设中，敬请期待" />
    </ElCard>
  </div>
</template>
