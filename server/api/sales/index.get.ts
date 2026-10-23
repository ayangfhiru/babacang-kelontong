import { getQuery } from "h3";
import { listSales, salesListQuerySchema } from "../../services/sales.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = parseWithSchema(salesListQuerySchema, getQuery(event));
  return listSales(query);
});
