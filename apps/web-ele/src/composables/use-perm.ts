import { useAccess } from '@vben/access';

import { SUPER_CODE } from '#/api';

/**
 * 权限码判断。
 *
 * 超管在后端是 is_supper 绕过所有检查，前端把它映射成通配符 '*'（见 api/core/user.ts）。
 * vben 的 hasAccessByCodes 是精确匹配，不认通配符，所以这里统一兜一层——
 * 否则超管登录后每个按钮都会被隐藏。
 */
export function usePerm() {
  const { hasAccessByCodes } = useAccess();

  const isSuper = () => hasAccessByCodes([SUPER_CODE]);
  const can = (code: string) => isSuper() || hasAccessByCodes([code]);

  return { can, isSuper };
}
