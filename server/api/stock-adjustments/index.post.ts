import { readBody } from "h3";
import {
  createAdjustment,
  createAdjustmentSchema,
} from "../../services/stock-adjustment.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event);
  const body = parseWithSchema(createAdjustmentSchema, await readBody(event));
  return createAdjustment(user.id, body);
});
