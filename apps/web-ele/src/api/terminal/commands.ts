import { requestClient } from '#/api/request';
const BASE = '/terminal/commands';

export namespace TerminalCommandApi {
  export interface Command {
    id: string;
    session_id: string;
    username: string;
    hostname: string;
    account: string;
    input: string;
    output: string;
    timestamp: string;
  }
  export interface ListParams {
    session_id?: string;
    username?: string;
    target?: string;
    keyword?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }
  export interface ListResult {
    commands: Command[];
    pagination: { page: number; page_size: number; total: number };
  }
}

export function listCommandsApi(params: TerminalCommandApi.ListParams) {
  return requestClient.get<TerminalCommandApi.ListResult>(BASE, { params });
}

