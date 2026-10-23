import { getQuery } from "h3";
import { z } from "zod";
import { getExpiryNotifications } from "../../services/stock.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

const expiryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(["expired", "soon", "safe", "all"]).default("all"),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = parseWithSchema(expiryQuerySchema, getQuery(event));
  return getExpiryNotifications(query);
});
