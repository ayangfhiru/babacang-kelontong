import { createSupplier, createSupplierSchema } from "../../services/supplier.service";
import { parseWithSchema } from "../../utils/validation";
import { readBody, setResponseStatus } from "h3";

export default defineEventHandler(async (event) => {
  const body = parseWithSchema(createSupplierSchema, await readBody(event));
  const supplier = await createSupplier(body);
  setResponseStatus(event, 201);
  return supplier;
});
