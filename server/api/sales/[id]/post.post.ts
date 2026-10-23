import { getRouterParam } from "h3";
import { postSales, salesIdParamSchema } from "~~/server/services/sales.service";
import { requireAdmin } from "~~/server/utils/auth";
import { parseWithSchema } from "~~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event);
  const id = parseWithSchema(salesIdParamSchema, getRouterParam(event, "id"));
  return postSales(id, user.id);
});
