import { getQuery } from "h3";
import { listReturns, returnListQuerySchema } from "../../services/return.service";
import { requireAdmin } from "../../utils/auth";
import { parseWithSchema } from "../../utils/validation";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const query = parseWithSchema(returnListQuerySchema, getQuery(event));
  return listReturns(query);
});
