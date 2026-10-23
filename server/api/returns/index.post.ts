import { readBody } from "h3";
import { createReturn, createReturnSchema } from "../../services/return.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event);
  const body = parseWithSchema(createReturnSchema, await readBody(event));
  return createReturn(user.id, body);
});
