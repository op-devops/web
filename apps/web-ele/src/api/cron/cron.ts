import { requestClient } from '#/api/request';

const BASE = '/cron/tasks';

export namespace CronTaskApi {
  export type Trigger = 'calendarinterval' | 'cron' | 'date' | 'interval';

  /** -1 未执行;0 执行中;1 成功;2 失败 */
  export type Status = -1 | 0 | 1 | 2;

  export interface RstNotify {
    /** 0 关闭;1 钉钉;2 自定义 Webhook;3 企业微信;4 飞书 */
    mode: string;
    value: string;
  }

  export interface Task {
    id: string;
    name: string;
    type: string;
    interpreter: string;
    command: string;
    targets: string[];
    trigger: Trigger;
    /** interval 为秒数;date 为 "YYYY-MM-DD HH:mm:ss";cron 为 JSON 串 {rule,start,stop} */
    trigger_args: string;
    is_activate: boolean;
    desc: string;
    rst_notify: RstNotify;
    create_at: string;
    create_by: string;
    latest_status: Status;
    latest_run_time: string;
  }

  export interface ListParams {
    name?: string;
    type?: string;
    target?: string;
    is_activate?: boolean;
    latest_status?: Status;
    page: number;
    page_size: number;
  }

  export interface ListResult {
    tasks: Task[];
    pagination: { page: number; page_size: number; total: number };
    /** 已有的任务类型,给筛选和新建时的下拉用 */
    types: string[];
  }

  export interface SaveParams {
    name: string;
    type: string;
    interpreter: string;
    command: string;
    targets: string[];
    trigger: Trigger;
    trigger_args: string;
    rst_notify: RstNotify;
    desc: string;
  }
}

export function listTasksApi(params: CronTaskApi.ListParams) {
  return requestClient.get<CronTaskApi.ListResult>(BASE, { params });
}

export function getTaskApi(id: string) {
  return requestClient.get<CronTaskApi.Task>(`${BASE}/${id}`);
}

/** 新建后默认停用,需要再调 setTaskActiveApi 才会进调度 */
export function createTaskApi(data: CronTaskApi.SaveParams) {
  return requestClient.post<CronTaskApi.Task>(BASE, data);
}

export function updateTaskApi(id: string, data: CronTaskApi.SaveParams) {
  return requestClient.put<CronTaskApi.Task>(`${BASE}/${id}`, data);
}

export function setTaskActiveApi(id: string, is_activate: boolean) {
  return requestClient.request<CronTaskApi.Task>(`${BASE}/${id}/activate`, {
    data: { is_activate },
    method: 'PATCH',
  });
}

/** 启用中的任务后端拒绝删除,要先停用 */
export function deleteTaskApi(id: string) {
  return requestClient.delete(`${BASE}/${id}`);
}
