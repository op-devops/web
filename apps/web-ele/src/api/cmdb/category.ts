import { requestClient } from '#/api/request';

const BASE = '/cmdb/categories';

export namespace CmdbCategoryApi {
  export interface Category {
    id: string;
    name: string;
    sort: number;
    /** 该分类下主机数 */
    host_count: number;
  }

  export interface ListResult {
    categories: Category[];
  }

  export interface CreateParams {
    name: string;
  }
}

export function listCategoriesApi() {
  return requestClient.get<CmdbCategoryApi.ListResult>(BASE);
}

export function createCategoryApi(data: CmdbCategoryApi.CreateParams) {
  return requestClient.post<CmdbCategoryApi.Category>(BASE, data);
}

/** 删分类:该分类下主机变为“未分类”,主机本身不删 */
export function deleteCategoryApi(id: string) {
  return requestClient.delete(`${BASE}/${id}`);
}
