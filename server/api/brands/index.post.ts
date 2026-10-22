import { createBrand, createBrandSchema } from "../../services/brand.service";
import { parseWithSchema } from "../../utils/validation";
import { readBody, setResponseStatus } from "h3";

export default defineEventHandler(async (event) => {
  const body = parseWithSchema(createBrandSchema, await readBody(event));
  const brand = await createBrand(body);
  setResponseStatus(event, 201);
  return brand;
});
