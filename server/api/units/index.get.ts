import { listUnits, unitListQuerySchema } from "../../services/unit.service";
import { parseWithSchema } from "../../utils/validation";
import { getQuery } from "h3";

export default defineEventHandler(async (event) => {
  const query = parseWithSchema(unitListQuerySchema, getQuery(event));
  return listUnits(query);
});
