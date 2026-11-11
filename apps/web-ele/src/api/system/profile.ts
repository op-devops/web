import { requestClient } from '#/api/request';

/** 改自己的资料 */
export function updateSelfApi(data: { nickname?: string; email?: string }) {
  return requestClient.put('/self', data);
}

/**
 * 改自己的密码。
 * 注意：后端会踢掉该用户所有登录态（含当前这个），调用方必须引导重新登录。
 */
export function changePasswordApi(data: {
  old_password: string;
  new_password: string;
}) {
  return requestClient.put('/self/password', data);
}
