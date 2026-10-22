import { listBrandOptions } from "../../services/brand.service";

export default defineEventHandler(async () => {
  return { data: await listBrandOptions() };
});
