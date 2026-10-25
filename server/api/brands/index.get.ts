import { brandListQuerySchema, listBrands } from "../../services/brand.service";
import { parseWithSchema } from "../../utils/validation";
import { getQuery } from "h3";
import { requireSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await requireSession(event);

  const query = parseWithSchema(brandListQuerySchema, getQuery(event));
  return listBrands(query);
});
