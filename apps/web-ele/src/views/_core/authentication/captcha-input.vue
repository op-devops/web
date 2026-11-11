<script lang="ts" setup>
// 图形验证码输入框:左边输入、右边贴图,点图刷新。
// 做成独立组件是因为 AuthenticationLogin 内部的 <Form /> 不转发插槽,
// 想在某个字段旁边加东西只能通过 schema 的 component 塞进去。

defineOptions({ name: 'CaptchaInput' });

defineProps<{
  /** data:image/svg+xml;base64,... */
  image?: string;
  modelValue?: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  refresh: [];
  'update:modelValue': [string];
}>();
</script>

<template>
  <div class="flex items-center gap-2">
    <input
      :placeholder="placeholder ?? '图形验证码'"
      :value="modelValue"
      autocomplete="off"
      class="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1"
      type="text"
      @input="
        emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
    />
    <img
      v-if="image"
      :src="image"
      alt="点击刷新验证码"
      class="h-10 w-[120px] shrink-0 cursor-pointer rounded border bg-white"
      title="点击刷新"
      @click="emit('refresh')"
    />
    <div
      v-else
      class="text-muted-foreground flex h-10 w-[120px] shrink-0 cursor-pointer items-center justify-center rounded border text-xs"
      @click="emit('refresh')"
    >
      加载中…
    </div>
  </div>
</template>
