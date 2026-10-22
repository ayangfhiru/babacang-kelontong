import { brandListQuerySchema, listBrands } from "../../services/brand.service";
import { parseWithSchema } from "../../utils/validation";
import { getQuery } from "h3";

export default defineEventHandler(async (event) => {
  const query = parseWithSchema(brandListQuerySchema, getQuery(event));
  return listBrands(query);
});
