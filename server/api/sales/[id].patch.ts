import { getRouterParam, readBody } from "h3";
import { updateSales, updateSalesSchema, salesIdParamSchema } from "../../services/sales.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = parseWithSchema(salesIdParamSchema, getRouterParam(event, "id"));
  const body = parseWithSchema(updateSalesSchema, await readBody(event));
  return updateSales(id, body);
});
