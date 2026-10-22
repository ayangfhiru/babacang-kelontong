import { deleteSupplier } from "../../services/supplier.service";
import { idParamSchema, parseWithSchema } from "../../utils/validation";
import { getRouterParam, setResponseStatus } from "h3";

export default defineEventHandler(async (event) => {
  const id = parseWithSchema(idParamSchema, getRouterParam(event, "id"));
  await deleteSupplier(id);
  setResponseStatus(event, 204);
  return null;
});
