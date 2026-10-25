import { createUnit, createUnitSchema } from "../../services/unit.service";
import { parseWithSchema } from "../../utils/validation";
import { readBody, setResponseStatus } from "h3";
import { requireAdmin } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = parseWithSchema(createUnitSchema, await readBody(event));
  const unit = await createUnit(body);
  setResponseStatus(event, 201);
  return unit;
});
