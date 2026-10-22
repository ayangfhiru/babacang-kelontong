import { updateCategory, updateCategorySchema } from "../../services/category.service";
import { idParamSchema, parseWithSchema } from "../../utils/validation";
import { getRouterParam, readBody } from "h3";

export default defineEventHandler(async (event) => {
  const id = parseWithSchema(idParamSchema, getRouterParam(event, "id"));
  const body = parseWithSchema(updateCategorySchema, await readBody(event));
  return updateCategory(id, body);
});
