import { getRouterParam, readBody } from "h3";
import {
  updatePurchase,
  updatePurchaseSchema,
  purchaseIdParamSchema,
} from "../../services/purchase.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = parseWithSchema(purchaseIdParamSchema, getRouterParam(event, "id"));
  const body = parseWithSchema(updatePurchaseSchema, await readBody(event));
  return updatePurchase(id, body);
});
