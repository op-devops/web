/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import { useAuthStore } from '#/store';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    accessStore.setAccessToken(null);
    if (
      preferences.app.loginExpiredMode === 'modal' &&
      accessStore.isAccessChecked
    ) {
      accessStore.setLoginExpired(true);
    } else {
      await authStore.logout();
    }
  }

  /**
   * 刷新token逻辑 — Gateway 会话存放在 httpOnly cookie 中，没有 refresh
   * token（enableRefreshToken 保持关闭，此函数不会被调用）。
   */
  async function doRefreshToken(): Promise<string> {
    throw new Error('Cookie-based Gateway sessions have no refresh token.');
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();

      config.headers.Authorization = formatToken(accessStore.accessToken);
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: 0,
    }),
  );

  // 登录态失效的处理（Envelope 版）
  //
  // 网关的约定是 HTTP 状态码恒为 200，真实结果放在 body 的 code 里。
  // vben 自带的 authenticateResponseInterceptor 只看 response.status === 401，
  // 所以 session 过期/被踢时它根本不会触发，页面会停在原地只弹一个错误提示。
  // 这里按 Envelope 的 code 补一个。
  client.addResponseInterceptor({
    rejected: async (error: any) => {
      const code = error?.data?.code ?? error?.response?.data?.code;
      const accessStore = useAccessStore();
      // 只在"本来有登录态"时才跳登录页：
      // 登录接口自己返回 401（密码错、验证码错）时还没有 token，
      // 不该把它当成登录过期去走登出流程。
      if (code === 401 && accessStore.accessToken) {
        await doReAuthenticate();
      }
      throw error;
    },
  });

  // token过期的处理（HTTP 401，保留给非 Envelope 的接口）
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用的错误处理,如果没有进入上面的错误处理逻辑，就会进入这里
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      // 这里可以根据业务进行定制,你可以拿到 error 内的信息进行定制化处理，根据不同的 code 做不同的提示，而不是直接使用 message.error 提示 msg
      // 当前mock接口返回的错误字段是 error 或者 message
      const responseData = error?.response?.data ?? {};
      const errorMessage = responseData?.error ?? responseData?.message ?? '';
      // 请求 ID 由 APISIX 的 request-id 插件生成并写进响应头，网关和各微服务的
      // 日志里都带着它。5xx 这类"服务器开小差了"的提示单看没法排查，带上 ID
      // 用户截个图就能直接定位到日志。4xx 是用户自己填错了，不用打扰他。
      const requestId = error?.response?.headers?.['x-request-id'];
      const status = error?.response?.status ?? 0;
      const code = responseData?.code ?? 0;
      const suffix =
        requestId && (status >= 500 || code >= 500)
          ? `（请求 ID: ${requestId}）`
          : '';
      ElMessage.error(`${errorMessage || msg}${suffix}`);
    }),
  );

  return client;
}

export const requestClient = createRequestClient(apiURL, {
  responseReturn: 'data',
});

export const baseRequestClient = new RequestClient({ baseURL: apiURL });
