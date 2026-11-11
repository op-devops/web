import { useAppConfig } from '@vben/hooks';
import { useAccessStore } from '@vben/stores';

import { gunzipSync } from 'fflate';

import { requestClient } from '#/api/request';

// terminal 网关接口统一加 /terminal 前缀,代理改写到 APISIX 的 /terminal-api
const BASE = '/terminal/sessions';

export namespace TerminalSessionApi {
  export interface Session {
    id: string;
    user_id: string;
    username: string;
    host_id: string;
    hostname: string;
    account: string;
    protocol: string;
    remote_addr: string;
    is_finished: boolean;
    has_replay: boolean;
    /** int64 经 protobuf-json 会序列化成字符串,用的时候 Number() 一下 */
    replay_size: number | string;
    date_start: string;
    date_end: string;
  }
  export interface ListParams {
    username?: string;
    target?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }
  export interface ListResult {
    sessions: Session[];
    pagination: { page: number; page_size: number; total: number };
  }
}

export function listSessionsApi(params: TerminalSessionApi.ListParams) {
  return requestClient.get<TerminalSessionApi.ListResult>(BASE, { params });
}

export function getSessionApi(id: string) {
  return requestClient.get<TerminalSessionApi.Session>(`${BASE}/${id}`);
}

/**
 * 拉回放并解 gzip,返回 asciinema cast v2 文本。
 * 不走 requestClient:它的响应拦截器会把二进制当 Envelope 解坏;
 * asciinema-player 内部 fetch 也不带鉴权头。所以这里手动 fetch + 带 Bearer。
 */
export async function fetchReplayText(id: string): Promise<string> {
  const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
  const token = useAccessStore().accessToken ?? '';
  const resp = await fetch(`${apiURL}${BASE}/${id}/replay`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`拉取回放失败: HTTP ${resp.status}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  // gzip 魔数 1f 8b 才解压;万一没压也能直接用
  const bytes =
    buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b ? gunzipSync(buf) : buf;
  return new TextDecoder('utf-8').decode(bytes);
}
