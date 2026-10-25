import { deleteBrand } from "../../services/brand.service";
import { idParamSchema, parseWithSchema } from "../../utils/validation";
import { getRouterParam, setResponseStatus } from "h3";
import { requireAdmin } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const id = parseWithSchema(idParamSchema, getRouterParam(event, "id"));
  await deleteBrand(id);
  setResponseStatus(event, 204);
  return null;
});
