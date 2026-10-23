import { getRouterParam } from "h3";
import {
  adjustmentIdParamSchema,
  deleteAdjustment,
} from "../../services/stock-adjustment.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = parseWithSchema(adjustmentIdParamSchema, getRouterParam(event, "id"));
  await deleteAdjustment(id);
  return { success: true };
});
