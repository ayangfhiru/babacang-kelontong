import { getQuery } from "h3";
import { z } from "zod";
import { getStockAvailability } from "../../services/stock.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

const availabilityQuerySchema = z.object({
  productId: z.string().trim().min(1, "Produk wajib dipilih.").max(64),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = parseWithSchema(availabilityQuerySchema, getQuery(event));
  return getStockAvailability(query.productId);
});
