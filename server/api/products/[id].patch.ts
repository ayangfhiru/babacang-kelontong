import { updateProduct, updateProductSchema } from "../../services/product.service";
import { idParamSchema, parseWithSchema } from "../../utils/validation";
import { getRouterParam, readBody } from "h3";
import { requireAdmin } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const id = parseWithSchema(idParamSchema, getRouterParam(event, "id"));
  const body = parseWithSchema(updateProductSchema, await readBody(event));
  return updateProduct(id, body);
});
