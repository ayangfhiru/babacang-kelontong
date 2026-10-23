import { getRouterParam } from "h3";
import { getReturn, returnIdParamSchema } from "../../services/return.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = parseWithSchema(returnIdParamSchema, getRouterParam(event, "id"));
  return getReturn(id);
});
