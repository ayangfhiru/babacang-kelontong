import { listUnitOptions } from "../../services/unit.service";

export default defineEventHandler(async () => {
  return { data: await listUnitOptions() };
});
