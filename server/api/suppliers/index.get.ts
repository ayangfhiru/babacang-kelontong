import { listSuppliers, supplierListQuerySchema } from "../../services/supplier.service";
import { parseWithSchema } from "../../utils/validation";
import { getQuery } from "h3";
import { requireSession } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  await requireSession(event);

  const query = parseWithSchema(supplierListQuerySchema, getQuery(event));
  return listSuppliers(query);
});
