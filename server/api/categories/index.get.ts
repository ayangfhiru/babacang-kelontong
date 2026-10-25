import { categoryListQuerySchema, listCategories } from "../../services/category.service";
import { parseWithSchema } from "../../utils/validation";
import { getQuery } from "h3";
import { requireSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await requireSession(event);

  const query = parseWithSchema(categoryListQuerySchema, getQuery(event));
  return listCategories(query);
});
