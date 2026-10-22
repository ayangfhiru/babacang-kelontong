import { listProducts, productListQuerySchema } from "../../services/product.service";
import { parseWithSchema } from "../../utils/validation";
import { getQuery } from "h3";

export default defineEventHandler(async (event) => {
  const query = parseWithSchema(productListQuerySchema, getQuery(event));
  return listProducts(query);
});
