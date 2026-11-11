import {
  appCopyrightPreferences,
  defineOverridesPreferences,
} from '@vben/preferences';

/**
 * @description 项目配置文件
 * 只需要覆盖项目中的一部分配置，不需要的配置不用覆盖，会自动使用默认配置
 * !!! 更改配置后请清空缓存，否则可能不生效
 */
export const overridesPreferences = defineOverridesPreferences({
  // overrides
  app: {
    defaultHomePath: '/dashboard',
    name: import.meta.env.VITE_APP_TITLE,
    // 水印默认开启,内容留空时自动用当前用户名(basic.vue 里的兜底)。
    // 偏好设置面板里的水印开关已移除,不允许用户关掉。
    watermark: true,
  },
  // 默认亮色。'dark' = 暗色,'auto' = 跟随系统
  theme: {
    mode: 'light',
  },
  copyright: appCopyrightPreferences,
});
