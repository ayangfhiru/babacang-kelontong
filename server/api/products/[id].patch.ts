import { updateProduct, updateProductSchema } from "../../services/product.service";
import { idParamSchema, parseWithSchema } from "../../utils/validation";
import { getRouterParam, readBody } from "h3";

export default defineEventHandler(async (event) => {
  const id = parseWithSchema(idParamSchema, getRouterParam(event, "id"));
  const body = parseWithSchema(updateProductSchema, await readBody(event));
  return updateProduct(id, body);
});
