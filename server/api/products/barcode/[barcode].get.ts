import { getRouterParam } from "h3";
import {
  barcodeParamSchema,
  checkBarcode,
} from "../../../services/product.service";
import { parseWithSchema } from "../../../utils/validation";
import { requireSession } from "../../../utils/auth";

/**
 * GET /api/products/barcode/:barcode
 *
 * Availability check for the product barcode scanner. Follows the same read
 * pattern as the other product endpoints; the barcode stays a string end to
 * end so leading zeros survive.
 */
export default defineEventHandler(async (event) => {
  await requireSession(event);

  const barcode = parseWithSchema(
    barcodeParamSchema,
    getRouterParam(event, "barcode"),
  );
  return checkBarcode(barcode);
});
