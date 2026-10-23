import { getQuery } from "h3";
import {
  adjustmentListQuerySchema,
  listAdjustments,
} from "../../services/stock-adjustment.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = parseWithSchema(adjustmentListQuerySchema, getQuery(event));
  return listAdjustments(query);
});
