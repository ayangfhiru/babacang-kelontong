import { readBody } from "h3";
import { createPurchase, createPurchaseSchema } from "../../services/purchase.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event);
  const body = parseWithSchema(createPurchaseSchema, await readBody(event));
  return createPurchase(user.id, body);
});
