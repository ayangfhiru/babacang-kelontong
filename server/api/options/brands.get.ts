import { listBrandOptions } from "../../services/brand.service";
import { requireSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await requireSession(event);

  return { data: await listBrandOptions() };
});
