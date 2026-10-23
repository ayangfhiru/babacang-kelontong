import { getRouterParam } from "h3";
import { getPurchase, purchaseIdParamSchema } from "../../services/purchase.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = parseWithSchema(purchaseIdParamSchema, getRouterParam(event, "id"));
  return getPurchase(id);
});
