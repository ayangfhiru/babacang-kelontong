import { getRouterParam } from "h3";
import { cancelReturn, returnIdParamSchema } from "~~/server/services/return.service";
import { requireAdmin } from "~~/server/utils/auth";
import { parseWithSchema } from "~~/server/utils/validation";

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event);
  const id = parseWithSchema(returnIdParamSchema, getRouterParam(event, "id"));
  return cancelReturn(id, user.id);
});
