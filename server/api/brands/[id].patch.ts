import { updateBrand, updateBrandSchema } from "../../services/brand.service";
import { idParamSchema, parseWithSchema } from "../../utils/validation";
import { getRouterParam, readBody } from "h3";

export default defineEventHandler(async (event) => {
  const id = parseWithSchema(idParamSchema, getRouterParam(event, "id"));
  const body = parseWithSchema(updateBrandSchema, await readBody(event));
  return updateBrand(id, body);
});
