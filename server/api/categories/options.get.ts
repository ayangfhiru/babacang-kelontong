import { listCategoryOptions } from "../../services/category.service";

export default defineEventHandler(async () => {
  return { data: await listCategoryOptions() };
});
