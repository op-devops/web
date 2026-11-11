import { baseRequestClient, requestClient } from '#/api/request';

// auth 网关(goat/auth)的登录链路:
//   GET  /auth/captcha  拿一张 SVG 图形验证码
//   POST /auth/login    用户名 + 密码 + 验证码,换 Bearer token
//   POST /auth/logout   销毁服务端 session
// token 是纯随机字符串不是 JWT,session 存在服务端 Redis 里,没有 refresh token。

export namespace AuthApi {
  export interface CaptchaResult {
    captcha_id: string;
    /** data:image/svg+xml;base64,... 可直接作为 <img src> */
    image: string;
    expires_in: number;
  }

  // 字段都是可选的:authStore.authLogin 的入参类型是 Recordable<any>,
  // 收紧会在调用处报类型不兼容。必填由后端和登录表单的 zod 规则保证。
  export interface LoginParams {
    username?: string;
    password?: string;
    captcha_id?: string;
    captcha_code?: string;
  }

  export interface LoginResult {
    accessToken: string;
    expires_in: number;
  }
}

/** 取图形验证码 */
export async function getCaptchaApi() {
  return requestClient.get<AuthApi.CaptchaResult>('/auth/captcha');
}

/** 登录 */
export async function loginApi(
  data: AuthApi.LoginParams,
): Promise<AuthApi.LoginResult> {
  const res = await requestClient.post<{
    access_token: string;
    expires_in: number;
  }>('/auth/login', data);
  return { accessToken: res.access_token, expires_in: res.expires_in };
}

/** 退出登录 */
export async function logoutApi() {
  // baseRequestClient:登出时 token 可能已失效，不要触发重新认证拦截器
  return baseRequestClient.post('/auth/logout', {}, { withCredentials: false });
}
