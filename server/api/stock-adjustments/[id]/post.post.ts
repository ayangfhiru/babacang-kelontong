import { getRouterParam } from "h3";
import {
  adjustmentIdParamSchema,
  postAdjustment,
} from "~~/server/services/stock-adjustment.service";
import { requireAdmin } from "~~/server/utils/auth";
import { parseWithSchema } from "~~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event);
  const id = parseWithSchema(
    adjustmentIdParamSchema,
    getRouterParam(event, "id"),
  );
  return postAdjustment(id, user.id);
});
