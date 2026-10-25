import { listUnitOptions } from "../../services/unit.service";
import { requireSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await requireSession(event);

  return { data: await listUnitOptions() };
});
