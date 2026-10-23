import { getQuery } from "h3";
import { listPurchases, purchaseListQuerySchema } from "../../services/purchase.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = parseWithSchema(purchaseListQuerySchema, getQuery(event));
  return listPurchases(query);
});
