import { getCategory } from "../../services/category.service";
import { idParamSchema, parseWithSchema } from "../../utils/validation";
import { getRouterParam } from "h3";

export default defineEventHandler(async (event) => {
  const id = parseWithSchema(idParamSchema, getRouterParam(event, "id"));
  return getCategory(id);
});
