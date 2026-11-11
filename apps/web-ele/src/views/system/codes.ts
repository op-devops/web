/**
 * 页面权限码表。三级结构：模块 → 页面 → 动作，展开成 "模块.页面.动作"。
 *
 * 这是**前端定义**的:后端只存 JSON、按角色并集展开成扁平码下发,不校验具体的码
 * 是否存在——否则前端加一个页面就要改后端、重新生成 proto。
 *
 * system 模块是新加的:老运维平台的账户/角色管理走 AdminView(只有超管能进),
 * 没有权限码。改成码控制后可以把账户管理委派给非超管;超管仍然绕过所有检查。
 * 其余模块从老平台 ops_web/src/pages/system/role/codes.js 原样迁移,
 * 对应的业务服务尚未迁移过来,先把权限位占好。
 */

export interface PermItem {
  key: string;
  label: string;
}

export interface PermPage {
  key: string;
  label: string;
  perms: PermItem[];
}

export interface PermModule {
  key: string;
  label: string;
  pages: PermPage[];
}

export const PERM_TREE: PermModule[] = [
  {
    "key": "system",
    "label": "系统管理",
    "pages": [
      {
        "key": "account",
        "label": "账户管理",
        "perms": [
          {
            "key": "view",
            "label": "查看账户"
          },
          {
            "key": "add",
            "label": "新建账户"
          },
          {
            "key": "edit",
            "label": "编辑账户(含重置密码/启停)"
          },
          {
            "key": "del",
            "label": "删除账户"
          },
          {
            "key": "kick",
            "label": "强制下线"
          }
        ]
      },
      {
        "key": "role",
        "label": "角色管理",
        "perms": [
          {
            "key": "view",
            "label": "查看角色"
          },
          {
            "key": "add",
            "label": "新建角色"
          },
          {
            "key": "edit",
            "label": "编辑角色(含分配权限)"
          },
          {
            "key": "del",
            "label": "删除角色"
          }
        ]
      },
      {
        "key": "history",
        "label": "登录日志",
        "perms": [
          {
            "key": "view",
            "label": "查看登录日志"
          }
        ]
      }
    ]
  },
  {
    "key": "dashboard",
    "label": "Dashboard",
    "pages": [
      {
        "key": "dashboard",
        "label": "Dashboard",
        "perms": [
          {
            "key": "view",
            "label": "查看Dashboard"
          }
        ]
      }
    ]
  },
  {
    "key": "host",
    "label": "主机管理",
    "pages": [
      {
        "key": "host",
        "label": "主机管理",
        "perms": [
          {
            "key": "view",
            "label": "查看主机"
          },
          {
            "key": "add",
            "label": "新建主机"
          },
          {
            "key": "edit",
            "label": "编辑主机"
          },
          {
            "key": "del",
            "label": "删除主机"
          },
        ]
      },
      {
        "key": "category",
        "label": "主机分类",
        "perms": [
          {
            "key": "view",
            "label": "查看分类"
          },
          {
            "key": "add",
            "label": "新建分类"
          },
          {
            "key": "del",
            "label": "删除分类"
          }
        ]
      },
      {
        "key": "terminal",
        "label": "Web终端",
        "perms": [
          {
            "key": "view",
            "label": "登陆终端"
          },
          {
            "key": "audit",
            "label": "会话审计"
          },
          {
            "key": "cmd",
            "label": "命令审计"
          }
        ]
      },

    ]
  },
  {
    "key": "womi",
    "label": "沃米教育",
    "pages": [
      {
        "key": "service",
        "label": "后端服务",
        "perms": [
          {
            "key": "view",
            "label": "查看服务"
          },
          {
            "key": "edit",
            "label": "编辑服务"
          },
          {
            "key": "add",
            "label": "新增服务"
          },
          {
            "key": "del",
            "label": "删除服务"
          },
          {
            "key": "checkStatus",
            "label": "检查服务状态"
          },
          {
            "key": "start",
            "label": "启动服务"
          },
          {
            "key": "stop",
            "label": "关闭服务"
          },
          {
            "key": "restart",
            "label": "重启服务"
          },
          {
            "key": "update",
            "label": "更新服务"
          }
        ]
      },
      {
        "key": "bookupload",
        "label": "图书上传",
        "perms": [
          {
            "key": "view",
            "label": "查看上传记录"
          },
          {
            "key": "do",
            "label": "上传图书"
          }
        ]
      },
      {
        "key": "scrape",
        "label": "抓取新闻",
        "perms": [
          {
            "key": "view",
            "label": "查看微信公众号新闻"
          },
          {
            "key": "save",
            "label": "编辑保存新闻"
          },
          {
            "key": "del",
            "label": "删除新闻"
          },
          {
            "key": "sync",
            "label": "同步新闻"
          }
        ]
      }
    ]
  },
  {
    "key": "audit",
    "label": "审计日志",
    "pages": [
      {
        "key": "login",
        "label": "登录日志",
        "perms": [
          {
            "key": "view",
            "label": "查看登录日志"
          }
        ]
      }
    ]
  },
  {
    "key": "aliyun",
    "label": "阿里云",
    "pages": [
      {
        "key": "cdn",
        "label": "cdn刷新",
        "perms": [
          {
            "key": "view",
            "label": "查看刷新任务"
          },
          {
            "key": "flush",
            "label": "刷新资源"
          }
        ]
      },
      {
        "key": "resource",
        "label": "资源包",
        "perms": [
          {
            "key": "view",
            "label": "查看资源包"
          }
        ]
      }
    ]
  },
  {
    "key": "exec",
    "label": "批量执行",
    "pages": [
      {
        "key": "task",
        "label": "执行任务",
        "perms": [
          {
            "key": "do",
            "label": "执行任务"
          }
        ]
      },
      {
        "key": "template",
        "label": "模板管理",
        "perms": [
          {
            "key": "view",
            "label": "查看模板"
          },
          {
            "key": "add",
            "label": "新建模板"
          },
          {
            "key": "edit",
            "label": "编辑模板"
          },
          {
            "key": "del",
            "label": "删除模板"
          }
        ]
      },
      {
        "key": "transfer",
        "label": "文件分发",
        "perms": [
          {
            "key": "do",
            "label": "文件分发"
          }
        ]
      }
    ]
  },
  {
    "key": "deploy",
    "label": "应用发布",
    "pages": [
      {
        "key": "app",
        "label": "应用管理",
        "perms": [
          {
            "key": "view",
            "label": "查看应用"
          },
          {
            "key": "add",
            "label": "新建应用"
          },
          {
            "key": "edit",
            "label": "编辑应用"
          },
          {
            "key": "del",
            "label": "删除应用"
          },
          {
            "key": "config",
            "label": "查看配置"
          }
        ]
      },
      {
        "key": "repository",
        "label": "构建仓库",
        "perms": [
          {
            "key": "view",
            "label": "查看构建"
          },
          {
            "key": "add",
            "label": "新建版本"
          },
          {
            "key": "build",
            "label": "执行构建"
          },
          {
            "key": "del",
            "label": "删除版本"
          }
        ]
      },
      {
        "key": "request",
        "label": "发布申请",
        "perms": [
          {
            "key": "view",
            "label": "查看申请"
          },
          {
            "key": "add",
            "label": "新建申请"
          },
          {
            "key": "edit",
            "label": "编辑申请"
          },
          {
            "key": "del",
            "label": "删除申请"
          },
          {
            "key": "approve",
            "label": "审核申请"
          },
          {
            "key": "do",
            "label": "执行发布"
          }
        ]
      }
    ]
  },
  {
    "key": "cron",
    "label": "任务计划",
    "pages": [
      {
        "key": "task",
        "label": "任务计划",
        "perms": [
          {
            "key": "view",
            "label": "查看任务"
          },
          {
            "key": "add",
            "label": "新建任务"
          },
          {
            "key": "edit",
            "label": "编辑任务"
          },
          {
            "key": "del",
            "label": "删除任务"
          }
        ]
      }
    ]
  },
  {
    "key": "config",
    "label": "配置中心",
    "pages": [
      {
        "key": "env",
        "label": "环境管理",
        "perms": [
          {
            "key": "view",
            "label": "查看环境"
          },
          {
            "key": "edit",
            "label": "编辑环境"
          },
          {
            "key": "del",
            "label": "删除环境"
          }
        ]
      },
      {
        "key": "src",
        "label": "服务管理",
        "perms": [
          {
            "key": "view",
            "label": "查看服务"
          },
          {
            "key": "add",
            "label": "新建服务"
          },
          {
            "key": "edit",
            "label": "编辑服务"
          },
          {
            "key": "del",
            "label": "删除服务"
          },
          {
            "key": "view_config",
            "label": "查看配置"
          },
          {
            "key": "edit_config",
            "label": "修改配置"
          }
        ]
      },
      {
        "key": "app",
        "label": "应用管理",
        "perms": [
          {
            "key": "view",
            "label": "查看应用"
          },
          {
            "key": "edit",
            "label": "编辑应用"
          },
          {
            "key": "del",
            "label": "删除应用"
          },
          {
            "key": "view_config",
            "label": "查看配置"
          },
          {
            "key": "edit_config",
            "label": "修改配置"
          }
        ]
      }
    ]
  },
  {
    "key": "monitor",
    "label": "监控中心",
    "pages": [
      {
        "key": "monitor",
        "label": "监控中心",
        "perms": [
          {
            "key": "view",
            "label": "查看监控"
          },
          {
            "key": "add",
            "label": "新建监控"
          },
          {
            "key": "edit",
            "label": "编辑监控"
          },
          {
            "key": "del",
            "label": "删除监控"
          }
        ]
      }
    ]
  },
  {
    "key": "alarm",
    "label": "报警中心",
    "pages": [
      {
        "key": "alarm",
        "label": "报警记录",
        "perms": [
          {
            "key": "view",
            "label": "查看记录"
          }
        ]
      },
      {
        "key": "contact",
        "label": "报警联系人",
        "perms": [
          {
            "key": "view",
            "label": "查看联系人"
          },
          {
            "key": "add",
            "label": "新建联系人"
          },
          {
            "key": "edit",
            "label": "编辑联系人"
          },
          {
            "key": "del",
            "label": "删除联系人"
          }
        ]
      },
      {
        "key": "group",
        "label": "报警联系组",
        "perms": [
          {
            "key": "view",
            "label": "查看联系组"
          },
          {
            "key": "add",
            "label": "新建联系组"
          },
          {
            "key": "edit",
            "label": "编辑联系组"
          },
          {
            "key": "del",
            "label": "删除联系组"
          }
        ]
      }
    ]
  }
];

/** 展开成扁平权限码,用于"全选"和与后端下发的 perms 比对 */
export function flattenPerms(tree: PermModule[] = PERM_TREE): string[] {
  const out: string[] = [];
  for (const mod of tree) {
    for (const page of mod.pages) {
      for (const perm of page.perms) {
        out.push(`${mod.key}.${page.key}.${perm.key}`);
      }
    }
  }
  return out;
}
