import { getRouterParam } from "h3";
import { cancelPurchase, purchaseIdParamSchema } from "~~/server/services/purchase.service";
import { requireAdmin } from "~~/server/utils/auth";
import { parseWithSchema } from "~~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event);
  const id = parseWithSchema(purchaseIdParamSchema, getRouterParam(event, "id"));
  return cancelPurchase(id, user.id);
});
