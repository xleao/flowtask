import type { Category } from "../types/models";
import { request } from "./apiClient";

export const CategoryService = {
  async list(): Promise<Category[]> {
    return (await request<Category[]>("/categories")).data;
  },
};
