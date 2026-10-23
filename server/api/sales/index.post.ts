import { readBody } from "h3";
import { createSales, createSalesSchema } from "../../services/sales.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event);
  const body = parseWithSchema(createSalesSchema, await readBody(event));
  return createSales(user.id, body);
});
