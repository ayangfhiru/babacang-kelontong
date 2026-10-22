import { updateSupplier, updateSupplierSchema } from "../../services/supplier.service";
import { idParamSchema, parseWithSchema } from "../../utils/validation";
import { getRouterParam, readBody } from "h3";

export default defineEventHandler(async (event) => {
  const id = parseWithSchema(idParamSchema, getRouterParam(event, "id"));
  const body = parseWithSchema(updateSupplierSchema, await readBody(event));
  return updateSupplier(id, body);
});
