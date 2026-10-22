import { createProduct, createProductSchema } from "../../services/product.service";
import { parseWithSchema } from "../../utils/validation";
import { readBody, setResponseStatus } from "h3";

export default defineEventHandler(async (event) => {
  const body = parseWithSchema(createProductSchema, await readBody(event));
  const product = await createProduct(body);
  setResponseStatus(event, 201);
  return product;
});
