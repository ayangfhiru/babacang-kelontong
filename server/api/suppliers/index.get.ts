import { listSuppliers, supplierListQuerySchema } from "../../services/supplier.service";
import { parseWithSchema } from "../../utils/validation";
import { getQuery } from "h3";

export default defineEventHandler(async (event) => {
  const query = parseWithSchema(supplierListQuerySchema, getQuery(event));
  return listSuppliers(query);
});
