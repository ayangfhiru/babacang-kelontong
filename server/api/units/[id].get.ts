import { getUnit } from "../../services/unit.service";
import { idParamSchema, parseWithSchema } from "../../utils/validation";
import { getRouterParam } from "h3";
import { requireSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await requireSession(event);

  const id = parseWithSchema(idParamSchema, getRouterParam(event, "id"));
  return getUnit(id);
});
