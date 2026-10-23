import { getRouterParam } from "h3";
import { getSales, salesIdParamSchema } from "../../services/sales.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = parseWithSchema(salesIdParamSchema, getRouterParam(event, "id"));
  return getSales(id);
});
