<script lang="ts" setup>
import type { VbenFormSchema } from '@vben/common-ui';

import { computed, markRaw, onMounted, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { ElMessage } from 'element-plus';

import { getCaptchaApi } from '#/api';
import { useAuthStore } from '#/store';

import CaptchaInput from './captcha-input.vue';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

// auth 网关的图形验证码:GET /auth/captcha 返回 captcha_id + 一张 SVG 的 data URI。
// 验证码是一次性的(服务端 pop 出来就删),所以每次提交后都要换一张,
// 否则密码输错重试时必然报"验证码已过期"。
const captchaId = ref('');
const captchaImage = ref('');

async function refreshCaptcha() {
  try {
    const res = await getCaptchaApi();
    captchaId.value = res.captcha_id;
    captchaImage.value = res.image;
  } catch {
    captchaImage.value = '';
    ElMessage.error('验证码加载失败，点击图片重试');
  }
}

onMounted(refreshCaptcha);

async function handleSubmit(values: Record<string, any>) {
  try {
    await authStore.authLogin({
      username: values.username,
      password: values.password,
      captcha_id: captchaId.value,
      captcha_code: values.captcha_code,
    });
  } finally {
    // 成败都换:验证码已被服务端消费掉了
    await refreshCaptcha();
  }
}

const formSchema = computed((): VbenFormSchema[] => {
  return [
    {
      component: 'VbenInput',
      componentProps: { placeholder: '登录名' },
      fieldName: 'username',
      label: $t('authentication.username'),
      rules: z.string().min(1, { message: $t('authentication.usernameTip') }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: { placeholder: $t('authentication.password') },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(1, { message: $t('authentication.passwordTip') }),
    },
    {
      component: markRaw(CaptchaInput),
      componentProps: {
        image: captchaImage.value,
        onRefresh: refreshCaptcha,
      },
      fieldName: 'captcha_code',
      label: '验证码',
      rules: z.string().min(1, { message: '请输入图形验证码' }),
    },
  ];
});
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-remember-me="false"
    :show-third-party-login="false"
    @submit="handleSubmit"
  />
</template>
