import { getRouterParam } from "h3";
import { deleteReturn, returnIdParamSchema } from "../../services/return.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = parseWithSchema(returnIdParamSchema, getRouterParam(event, "id"));
  await deleteReturn(id);
  return { success: true };
});
