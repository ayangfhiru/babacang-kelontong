import { listCategoryOptions } from "../../services/category.service";
import { requireSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await requireSession(event);

  return { data: await listCategoryOptions() };
});
