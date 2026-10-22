import { createCategory, createCategorySchema } from "../../services/category.service";
import { parseWithSchema } from "../../utils/validation";
import { readBody, setResponseStatus } from "h3";

export default defineEventHandler(async (event) => {
  const body = parseWithSchema(createCategorySchema, await readBody(event));
  const category = await createCategory(body);
  setResponseStatus(event, 201);
  return category;
});
