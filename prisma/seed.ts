import "dotenv/config";
import { prisma } from "../server/utils/db";
import { hashPassword } from "../server/utils/password";

const seed = async (): Promise<void> => {
  await prisma.$transaction(async (tx) => {
    await tx.stockAllocation.deleteMany();
    await tx.stockMovement.deleteMany();
    await tx.returnItem.deleteMany();
    await tx.return.deleteMany();
    await tx.stockAdjustmentItem.deleteMany();
    await tx.stockAdjustment.deleteMany();
    await tx.salesItem.deleteMany();
    await tx.sales.deleteMany();
    await tx.stockBatch.deleteMany();
    await tx.purchaseItem.deleteMany();
    await tx.purchase.deleteMany();
    await tx.product.deleteMany();
    await tx.supplier.deleteMany();
    await tx.user.deleteMany();
    await tx.category.deleteMany();
    await tx.brand.deleteMany();
    await tx.unit.deleteMany();

    const [food, beverage, household] = await Promise.all([
      tx.category.create({
        data: { name: "Makanan", description: "Produk makanan sehari-hari" },
      }),
      tx.category.create({
        data: { name: "Minuman", description: "Produk minuman" },
      }),
      tx.category.create({
        data: {
          name: "Kebutuhan Rumah",
          description: "Produk kebutuhan rumah tangga",
        },
      }),
    ]);
    const [indomie, aqua, unilever] = await Promise.all([
      tx.brand.create({
        data: { name: "Indomie", description: "Produk mi instan" },
      }),
      tx.brand.create({
        data: { name: "Aqua", description: "Produk air minum" },
      }),
      tx.brand.create({
        data: {
          name: "Unilever",
          description: "Produk kebutuhan rumah tangga",
        },
      }),
    ]);
    const [pcs, bottle] = await Promise.all([
      tx.unit.create({ data: { name: "Pieces", symbol: "pcs" } }),
      tx.unit.create({ data: { name: "Botol", symbol: "btl" } }),
      tx.unit.create({ data: { name: "Paket", symbol: "pkt" } }),
    ]);

    const products = await Promise.all([
      tx.product.create({
        data: {
          sku: "PRD-001",
          barcode: "8991002100011",
          name: "Indomie Goreng",
          categoryId: food.id,
          brandId: indomie.id,
          unitId: pcs.id,
          purchasePrice: "2500",
          sellingPrice: "3500",
        },
      }),
      tx.product.create({
        data: {
          sku: "PRD-002",
          barcode: "8991002200012",
          name: "Aqua 600ml",
          categoryId: beverage.id,
          brandId: aqua.id,
          unitId: bottle.id,
          purchasePrice: "2500",
          sellingPrice: "4000",
        },
      }),
      tx.product.create({
        data: {
          sku: "PRD-003",
          barcode: "8999999000013",
          name: "Sabun Mandi",
          categoryId: household.id,
          brandId: unilever.id,
          unitId: pcs.id,
          purchasePrice: "3500",
          sellingPrice: "5000",
        },
      }),
    ]);
    const supplier = await tx.supplier.create({
      data: {
        code: "SUP-001",
        name: "PT Sumber Makmur",
        contactPerson: "Budi Santoso",
        email: "supplier@example.com",
        phone: "081234567890",
        address: "Jakarta",
      },
    });
    const password = await hashPassword("password");
    const admin = await tx.user.create({
      data: {
        email: "admin@example.com",
        name: "Administrator",
        username: "admin",
        displayUsername: "admin",
        passwordHash: password,
        role: "ADMIN",
        // Better Auth credential row — password verification reads this.
        accounts: {
          create: {
            accountId: "seed",
            providerId: "credential",
            password,
          },
        },
      },
    });
    const staff = await tx.user.create({
      data: {
        email: "staff@example.com",
        name: "Staff Toko",
        username: "staff",
        displayUsername: "staff",
        passwordHash: password,
        role: "STAFF",
        accounts: {
          create: {
            accountId: "seed",
            providerId: "credential",
            password,
          },
        },
      },
    });

    const purchase = await tx.purchase.create({
      data: {
        number: "PO-2026-0001",
        supplierId: supplier.id,
        userId: admin.id,
        status: "POSTED",
        date: new Date("2026-01-10"),
        subtotal: "850000",
        total: "850000",
      },
    });
    const purchaseItems = await Promise.all(
      products.map((product, index) =>
        tx.purchaseItem.create({
          data: {
            purchaseId: purchase.id,
            productId: product.id,
            quantity: 100,
            unitCost: index === 0 ? "2500" : index === 1 ? "2500" : "3500",
            subtotal:
              index === 0 ? "250000" : index === 1 ? "250000" : "350000",
            batchNumber: `BATCH-${index + 1}`,
            expiredAt: index < 2 ? new Date("2027-01-10") : null,
          },
        }),
      ),
    );
    const batches = await Promise.all(
      purchaseItems.map((item, index) =>
        tx.stockBatch.create({
          data: {
            productId: item.productId,
            purchaseItemId: item.id,
            batchNumber: item.batchNumber,
            receivedAt: new Date("2026-01-10"),
            expiredAt: item.expiredAt,
            quantityInitial: 100,
            quantityRemain: index === 0 ? 95 : index === 1 ? 98 : 100,
            unitCost: item.unitCost,
          },
        }),
      ),
    );
    await Promise.all(
      batches.map((batch) =>
        tx.stockMovement.create({
          data: {
            productId: batch.productId,
            batchId: batch.id,
            userId: admin.id,
            type: "PURCHASE",
            quantity: batch.quantityInitial,
            referenceType: "PURCHASE",
            referenceId: purchase.id,
            note: "Stok awal dari pembelian",
          },
        }),
      ),
    );

    const sale = await tx.sales.create({
      data: {
        number: "SO-2026-0001",
        userId: staff.id,
        status: "POSTED",
        date: new Date("2026-01-15"),
        subtotal: "7500",
        total: "7500",
        cogs: "5000",
      },
    });
    const saleItem = await tx.salesItem.create({
      data: {
        salesId: sale.id,
        productId: products[0].id,
        quantity: 2,
        unitPrice: "3500",
        subtotal: "7000",
        cogs: "5000",
      },
    });
    await tx.stockAllocation.create({
      data: {
        salesItemId: saleItem.id,
        batchId: batches[0].id,
        quantity: 2,
        unitCost: "2500",
        totalCost: "5000",
      },
    });
    await tx.stockMovement.create({
      data: {
        productId: products[0].id,
        batchId: batches[0].id,
        userId: staff.id,
        type: "SALE",
        quantity: -2,
        referenceType: "SALES",
        referenceId: sale.id,
        note: "Penjualan contoh",
      },
    });

    const stockAdjustment = await tx.stockAdjustment.create({
      data: {
        number: "ADJ-2026-0001",
        userId: admin.id,
        status: "POSTED",
        date: new Date("2026-01-20"),
        reason: "Selisih stok opname",
      },
    });
    await tx.stockAdjustmentItem.create({
      data: {
        adjustmentId: stockAdjustment.id,
        productId: products[1].id,
        batchId: batches[1].id,
        systemQty: 98,
        physicalQty: 97,
        difference: -1,
        unitCost: "2500",
        reason: "Barang rusak",
      },
    });
    await tx.stockMovement.create({
      data: {
        productId: products[1].id,
        batchId: batches[1].id,
        userId: admin.id,
        type: "ADJUSTMENT",
        quantity: -1,
        // Must match the value written by the runtime services so cancellation
        // can find and restore this movement.
        referenceType: "StockAdjustment",
        referenceId: stockAdjustment.id,
        note: "Penyesuaian stok contoh",
      },
    });

    const purchaseReturn = await tx.return.create({
      data: {
        number: "RET-2026-0001",
        kind: "PURCHASE",
        status: "POSTED",
        date: new Date("2026-01-22"),
        reason: "Kemasan rusak",
        userId: admin.id,
      },
    });
    await tx.returnItem.create({
      data: {
        returnId: purchaseReturn.id,
        purchaseId: purchase.id,
        purchaseItemId: purchaseItems[2].id,
        productId: products[2].id,
        batchId: batches[2].id,
        quantity: 1,
        unitCost: "3500",
        subtotal: "3500",
      },
    });
  });
  console.log("Database seed berhasil dibuat.");
};

seed()
  .catch((error: unknown) => {
    console.error("Gagal menjalankan seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
