# FLOW.md — Alur Project Babacang Kelontong

Dokumen ini menjelaskan alur kerja seluruh project **per halaman (`app/pages/**`)** dan **per file** (server, komponen, composable, util, tipe, database), sehingga bisa dibaca sebagai peta rujukan.

> Diperbarui: 25 Oktober 2026. Jika menambah halaman/endpoint baru, perbarui bagian yang relevan.

---

## Daftar Isi

1. [Gambaran Umum](#1-gambaran-umum)
2. [Autentikasi & Otorisasi](#2-autentikasi--otorisasi)
3. [Flow per Halaman Pages (per file)](#3-flow-per-halaman-pages-per-file)
4. [Flow per File Server](#4-flow-per-file-server)
5. [Alur Domain End-to-End](#5-alur-domain-end-to-end)
6. [Lapisan Penunjang per File](#6-lapisan-penunjang-per-file)
7. [Tipe Data (`types/`)](#7-tipe-data-types)
8. [Database (Prisma)](#8-database-prisma)
9. [Konfigurasi & Environment](#9-konfigurasi--environment)
10. [Indeks Seluruh File](#10-indeks-seluruh-file)
11. [Catatan Kondisi Saat Ini](#11-catatan-kondisi-saat-ini)

---

## 1. Gambaran Umum

**Stack:** Nuxt 4 (Vue 3 Composition API, TypeScript) · Tailwind CSS v4 (via `@tailwindcss/vite`) · Nitro server routes · Prisma ORM 7 (PostgreSQL/Neon, driver adapter `@prisma/adapter-pg`) · Better Auth (username + email login) · Zod (validasi runtime) · Lucide (ikon) · dayjs/Intl (waktu).

**Struktur direktori utama:**

```text
app/
├── assets/main.css          # Tailwind v4 + token desain + font
├── components/              # ui/ (Base*), layout/ (App*), admin/, product/
├── composables/             # useAuth, useNotify, usePageTitle, useDebouncedRef, useTheme
├── layouts/                 # default.vue (shell admin), auth.vue (halaman masuk)
├── middleware/auth.global.ts# guard global
├── pages/                   # routing file-based
└── utils/                   # api/error, format/*, navigation, validation/number
server/
├── api/                     # 58 file route; nama file = metode + path
├── services/                # 11 service: seluruh aturan bisnis
└── utils/                   # api, auth (requireSession, requireAdmin), db, money, password, validation
types/                       # 13 domain + barrel index.ts (kontrak antar client/server)
prisma/schema.prisma         # 19 model, 4 enum
```

**Alur satu request (semua halaman):**

```text
Browser → URL /admin/...
  ├─ app/middleware/auth.global.ts   cek auth.getSession() (server-side)
  │                                   → belum login: redirect /login?redirect=…
  │                                   → sudah login di /login|/register: redirect aman
  ├─ app/layouts/default.vue         AppSidebar + AppHeader (judul usePageTitle) + AppToastList
  └─ app/pages/**.vue                useAsyncData / $fetch
        └─ $fetch("/api/…")
             ├─ server/api/**.ts     guard (requireSession/requireAdmin) → parseWithSchema(zod) → service
             └─ server/services/*.ts aturan bisnis dalam transaksi Prisma
                  └─ PostgreSQL      batch stok (FIFO), movement audit, dokumen
```

**Aturan lifecycle dokumen transaksi (bersama semua modul):**

```text
DRAFT ──POST──▶ POSTED ──CANCEL──▶ CANCELLED
  └─DELETE (hanya DRAFT; hard delete)
```

- Stok **hanya berubah saat POSTED** (dan kompensasi saat CANCEL).
- Semua angka/uang dihitung ulang di server (total tidak pernah dipercaya dari klien).
- Nomor dokumen berurutan per hari: `PO-YYYYMMDD-NNNN` (pembelian), `INV-` (penjualan), `RTN-` (retur), `ADJ-` (penyesuaian) — dibuat di dalam transaksi dengan retry unik (lihat §5.6).

**Urutan pembuatan data dalam aplikasi:**

```text
Master data: Kategori/Unit/Merek/Supplier → Produk
Transaksi : Pembelian (POSTED → batch masuk) ─┐
            Penjualan (POSTED → alokasi FIFO) ─┼→ Retur & Penyesuaian Stok
                                               ┘
```

---

## 2. Autentikasi & Otorisasi

### 2.1 Login / Registrasi (alur lintas halaman)

- **Server:** `server/api/auth/[...all].ts` → handler Better Auth. Untuk `POST /sign-up/email` ada pre-check Zod (`signUpBodySchema` + `confirmPassword`) dan cek unisitas email & username (Better Auth sendiri mengembalikan 200 generik untuk duplikat email saat `autoSignIn: false`, jadi pre-check ini yang menghasilkan 409).
- **Client:** `app/composables/useAuth.ts` (klien Better Auth Vue, meneruskan cookie saat SSR).
- **Halaman:** `login.vue` (`signIn.email` / `signIn.username` tergantung bentuk identifier, fallback redirect aman `isSafeInternalPath` → `/dashboard`), `register.vue` (`signUp.email` + validasi klien lengkap → `/login`).
- **Layout:** keduanya memakai `definePageMeta({ layout: "auth" })` (`app/layouts/auth.vue` — tanpa sidebar/header).

### 2.2 Middleware `app/middleware/auth.global.ts`

- Hanya menegakkan aturan untuk path `/admin/**`, `/dashboard` (area terproteksi) serta `/login`, `/register` (halaman auth); path lain lewat.
- Sesi selalu diambil dengan `auth.getSession()` (server-side), bukan `useSession(useFetch)` — menghindari cache SSR yang membuat user baru login terjebak di `/login`.
- Belum login → `/login?redirect=<fullPath>`; sudah login di `/login|/register` → `?redirect` hanya bila lolos `isSafeInternalPath`, selain itu `/dashboard`.
- **Cek role TIDAK di middleware** — dilakukan per endpoint lewat `requireAdmin`.

### 2.3 Guard server `requireSession` & `requireAdmin` (`server/utils/auth.ts`)

Keduanya memanggil `auth.api.getSession({ headers })` — identitas selalu berasal dari cookie sesi terverifikasi, tidak pernah dari body/query klien.

| Guard | Tanpa sesi | Sesi, role bukan ADMIN | Sesi ADMIN |
| --- | --- | --- | --- |
| `requireSession(event)` | **401 UNAUTHORIZED** | lolos (STAFF diperbolehkan) | lolos |
| `requireAdmin(event)` | **401 UNAUTHORIZED** | **403 FORBIDDEN** | mengembalikan `SessionUser` |

`requireAdmin` sendiri memanggil `requireSession` lebih dahulu (DRY), lalu mengecek `role !== "ADMIN"`.

**Sebaran guard (diverifikasi — semua 58 route kecuali auth):**

| Endpoint | Guard |
| --- | --- |
| `/api/purchases/*`, `/api/sales/*`, `/api/returns/*`, `/api/stock-adjustments/*`, `/api/stock/*` | `requireAdmin` (semua method) |
| `/api/brands/*`, `/api/categories/*`, `/api/units/*`, `/api/suppliers/*`, `/api/products/*` **POST/PATCH/DELETE** | `requireAdmin` (tulis = admin saja) |
| `/api/brands/*`, `/api/categories/*`, `/api/units/*`, `/api/suppliers/*`, `/api/products/*`, `/api/products/barcode/:barcode` **GET** | `requireSession` (baca boleh STAFF — dibutuhkan form penjualan/opname) |
| `/api/options/*` (`GET`) | `requireSession` |
| `/api/auth/*` | publik (memang untuk autentikasi) |

Kebijakan ini diputuskan eksplisit: **baca = wajib sesi valid (STAFF boleh), tulis = ADMIN only.** Sebelumnya seluruh master data sama sekali tanpa guard (terverifikasi: `POST /api/brands` anonim → 201).

---

## 3. Flow per Halaman Pages (per file)

### 3.1 Halaman publik

#### `app/pages/index.vue` → `/`
- **Peran:** stub root.
- **Data:** tidak ada.
- **Navigasi:** `navigateTo("/admin/master-data/products", { redirectCode: 302 })`.

#### `app/pages/login.vue` → `/login`
- **Peran:** form masuk dengan email **atau** username.
- **Data:** via `useAuth()` — `auth.signIn.email(...)` atau `auth.signIn.username(...)` sesai bentuk identifier.
- **State/logika:** `definePageMeta({ layout: "auth" })`, `usePageTitle("Masuk")`; `form { identifier, password }`, validasi klien, pemetaan kode error (rate limit / kredensial salah), `isBusy`, redirect aman via `isSafeInternalPath(route.query.redirect)` fallback `/dashboard`.
- **Navigasi:** ke `/register`; sukses → `navigateTo(redirect)`.
- **Komponen:** `BaseInput`, `BaseButton`.

#### `app/pages/register.vue` → `/register`
- **Peran:** pendaftaran akun staf.
- **Data:** `auth.signUp.email(payload)` (payload memuat `confirmPassword` untuk pre-check server).
- **State/logika:** layout `auth`, `usePageTitle("Daftar")`; validasi klien (nama, `USERNAME_PATTERN`, format email, panjang password, konfirmasi), `applyServerErrors` dari `ApiErrorPayload`.
- **Navigasi:** ke `/login`; sukses → `/login`.

### 3.2 Dashboard

#### `app/pages/dashboard.vue` → `/dashboard`
- **Peran:** halaman sapaan + kartu menu cepat.
- **Data:** sesi Better Auth (`auth.useSession(useFetch)`).
- **State/logika:** `displayName`, `roleLabel` (Admin/Staf), array `quickLinks`; `usePageTitle("Dashboard")`.
- **Navigasi:** ke `/admin/transactions/sales`, `/admin/transactions/purchases`, `/admin/inventory`, `/admin/master-data/products`.

#### `app/pages/admin/index.vue` → `/admin`
- **Peran:** redirect saja → `/admin/master-data/products` (302).

### 3.3 Admin — Master Data

Pola bersama 4 CRUD (brands/categories/units/suppliers): `useAsyncData` dengan `watch: [listQuery]`, pencarian pakai `useDebouncedRef` (reset `page` saat berubah), filter `isActive`, modal create/edit (`*Form`), `BaseConfirmDialog` untuk hapus, `usePageTitle` + `useNotify`.

#### `app/pages/admin/master-data/brands/index.vue` → `/admin/master-data/brands`
- **Data:** `GET /api/brands?page=&pageSize=10&search=&isActive=`; aksi `POST /api/brands`, `PATCH /api/brands/:id`, `DELETE /api/brands/:id`.
- **State/logika:** `searchInput` + debounce, `filters {page, isActive}`, `isFormOpen/editing/formErrors`, `deleteTarget`.
- **Komponen:** `BrandForm`, `BaseSelect`, `BasePagination`, `BaseConfirmDialog`, `BaseBadge`, `BaseButton`.

#### `app/pages/admin/master-data/categories/index.vue` → `/admin/master-data/categories`
- **Data:** `GET /api/categories?…` + `POST`/`PATCH`/`DELETE /api/categories[/:id]`. Pola identik merek.

#### `app/pages/admin/master-data/units/index.vue` → `/admin/master-data/units`
- **Data:** `GET /api/units?…` + `POST`/`PATCH`/`DELETE /api/units[/:id]`. Pola identik merek.

#### `app/pages/admin/master-data/suppliers/index.vue` → `/admin/master-data/suppliers`
- **Data:** `GET /api/suppliers?…` + `POST`/`PATCH`/`DELETE /api/suppliers[/:id]`. Pencarian mencakup nama/kode/telepon/email.

#### `app/pages/admin/master-data/products/index.vue` → `/admin/master-data/products`
- **Peran:** daftar produk + pencarian, filter relasi, hapus, dan verifikasi barcode (scanner).
- **Data:**
  - `GET /api/products?page=&pageSize=10&search=&categoryId=&brandId=&unitId=&isActive=` (watch `listQuery`);
  - dropdown: `GET /api/options/categories`, `/api/options/brands`, `/api/options/units`;
  - hapus: `DELETE /api/products/:id`;
  - scanner: `GET /api/products/barcode/:barcode`.
- **State/logika:** debounce search, `filters` 5 field, `deleteTarget`; `handleBarcodeFound` → toast; `handleBarcodeNotFound` → `navigateTo({ path: '/admin/master-data/products/create', query: { barcode } })`.
- **Navigasi:** ke `…/products/create`, `…/products/:id/edit`.
- **Komponen:** `ProductBarcodeScannerModal`, `BaseSelect`, `BasePagination`, `BaseConfirmDialog`, `BaseBadge`.

#### `app/pages/admin/master-data/products/create.vue` → `/admin/master-data/products/create`
- **Data:** `GET /api/options/{categories,brands,units}` saat setup; submit `POST /api/products`.
- **State/logika:** barcode pra-isi dari `route.query.barcode` sebagai **string** (pertahankan nol di depan) + banner info scan; `isSubmitting`, `formErrors` (detail per-field dari server).
- **Navigasi:** kembali/berhasil → `/admin/master-data/products`.
- **Komponen:** `ProductForm`.

#### `app/pages/admin/master-data/products/[id]/edit.vue` → `/admin/master-data/products/:id/edit`
- **Data:** `GET /api/products/:id` + `GET /api/options/{categories,brands,units}`; submit `PATCH /api/products/:id`.
- **State/logika:** `formErrors`, `isTargetMissing` (400/404 → "Produk tidak ditemukan"), `loadFailed` + tombol muat ulang.
- **Navigasi:** ke `/admin/master-data/products` (kembali/batal).

### 3.4 Admin — Transaksi

#### `app/pages/admin/transactions/purchases/index.vue` → `/admin/transactions/purchases`
- **Data:** `GET /api/purchases?page=&pageSize=10` (watch `page`).
- **State/logika:** `formatMoney` (Intl IDR), tombol muat ulang; `usePageTitle("Pembelian")`.
- **Navigasi:** ke `…/purchases/create` (tombol "Pembelian Baru") dan `…/purchases/:id` (nomor dokumen).

#### `app/pages/admin/transactions/purchases/create.vue` → `/admin/transactions/purchases/create`
- **Peran:** form draft pembelian multi-item.
- **Data:** saat setup `GET /api/suppliers?page=1&pageSize=100&isActive=true` dan `GET /api/products?page=1&pageSize=100&isActive=true` (`Promise.all`); submit `POST /api/purchases`.
- **State/logika:** `form {supplierId, date, notes, discount}`, `items: Line[]` (quantity/unitCost/discount/batchNumber/expiredAt), computed `subtotal`/`total`, `addItem/removeItem`, `saving`; semua angka di-`Number()` saat submit.
- **Navigasi:** kembali/berhasil → `/admin/transactions/purchases`.
- **Komponen:** `BaseSelect`, `BaseInput`, `BaseButton`.

#### `app/pages/admin/transactions/purchases/[id].vue` → `/admin/transactions/purchases/:id`
- **Data:** `GET /api/purchases/:id`; aksi hanya saat `DRAFT`: `POST /api/purchases/:id/post`, `POST /api/purchases/:id/cancel`.
- **State/logika:** `busy`, `useNotify`, `getApiErrorPayload`.
- **Navigasi:** kembali ke daftar pembelian.

#### `app/pages/admin/transactions/sales/index.vue` → `/admin/transactions/sales`
- **Data:** `GET /api/sales?page=&pageSize=10` (watch `page`).
- **State/logika:** kolom Nomor / **Petugas** (`item.user.name`) / Tanggal / Status / Total; `formatMoney`.
- **Navigasi:** ke `…/sales/create` dan `…/sales/:id`.

#### `app/pages/admin/transactions/sales/create.vue` → `/admin/transactions/sales/create`
- **Data:** `GET /api/products?page=1&pageSize=100&isActive=true` saat setup; submit `POST /api/sales`.
- **State/logika:** `form {date (datetime-local), notes, discount, tax}`, item berbasis string dengan parser `parsePositiveInt`/`parseNonNegativeMoney` (`app/utils/validation/number`), computed `subtotal`/`total`; `watch` produk → pra-isi `unitPrice` dari `sellingPrice` bila masih 0.
- **Navigasi:** kembali/berhasil → `/admin/transactions/sales`.

#### `app/pages/admin/transactions/sales/[id].vue` → `/admin/transactions/sales/:id`
- **Data:** `GET /api/sales/:id`; aksi saat `DRAFT`: `POST /api/sales/:id/post`, `POST /api/sales/:id/cancel`.
- **State/logika:** kartu info **Petugas** (`sales.user.name`), Tanggal, Status; tabel item + total. Posting alokasi FIFO dijalankan server.
- **Navigasi:** kembali ke daftar penjualan.

#### `app/pages/admin/transactions/returns/index.vue` → `/admin/transactions/returns`
- **Peran:** daftar retur (Nomor / Jenis / Tanggal / Status / Total).
- **Data:** `GET /api/returns?page=&pageSize=10` (watch `page`), tipa `PaginatedResponse<ReturnSummary>`; `total` = nilai inventaris agregat (jumlah `subtotal` item) dihitung server.
- **State/logika:** `formatMoney`, tombol muat ulang; `usePageTitle("Retur")`.
- **Navigasi:** tombol **"Retur Baru"** → `/admin/transactions/returns/create`; nomor dokumen → `/admin/transactions/returns/:id` (⚠ halaman detailnya belum ada — lihat §11).

#### `app/pages/admin/transactions/returns/create.vue` → `/admin/transactions/returns/create` ★ (halaman baru)
- **Peran:** form pembuatan **draft retur** dari dokumen sumber yang sudah POSTED (retur penjualan maupun pembelian).
- **Data:**
  1. `watch(kind)` → `GET /api/sales?status=POSTED&page=1&pageSize=100` **atau** `GET /api/purchases?status=POSTED&…` (hanya dokumen posted yang bisa diretur);
  2. `watch(sourceId)` → `GET /api/sales/:id` **atau** `GET /api/purchases/:id` untuk memuat baris item sumber;
  3. submit `POST /api/returns` dengan `CreateReturnInput`.
- **State/logika:**
  - `kind` (`SALE` | `PURCHASE`), `sourceId`, `sources`, `lines` (per baris: `sourceQty`, `quantity` default 0, `restock` default `false`, checkbox restock hanya untuk `SALE`);
  - `loadingSources`/`loadingLines`, ganti jenis → reset dokumen + item;
  - validasi klien: wajib pilih jenis & dokumen, minimal satu baris qty ≥ 1, qty ≤ qty sumber, `Number.isInteger`;
  - error server (`ApiErrorPayload.details`) digabung ke toast;
  - `form {date, reason, condition, notes}` (BaseTextarea, max 2000).
- **Navigasi:** kembali/berhasil → `/admin/transactions/returns`.
- **Komponen:** `BaseSelect`, `BaseInput`, `BaseTextarea`, `BaseButton`.
- **Aturan server yang dipegang form ini (lihat §5.4):** sumber harus `POSTED`, qty ≤ sisa retur POSTED, `sourceItemId` harus milik dokumen sumber.

### 3.5 Admin — Inventaris

#### `app/pages/admin/inventory/index.vue` → `/admin/inventory`
- **Peran:** overview kedaluwarsa (batch expired / segera kedaluwarsa).
- **Data:** `GET /api/stock/expiry-notifications?category=all&page=1&pageSize=100`.
- **State/logika:** computed `items` + `summary` (expired/soon), tombol muat ulang saat pending.
- **Navigasi:** ke `…/adjustments` dan `…/adjustments/create`.

#### `app/pages/admin/inventory/adjustments/index.vue` → `/admin/inventory/adjustments`
- **Data:** `GET /api/stock-adjustments?page=&pageSize=10` (watch `page`).
- **Navigasi:** tombol baru → `…/adjustments/create`; nomor → `…/adjustments/:id`.

#### `app/pages/admin/inventory/adjustments/create.vue` → `/admin/inventory/adjustments/create`
- **Peran:** form opname multi-item (stok fisik vs stok sistem).
- **Data:** `GET /api/products?page=1&pageSize=100&isActive=true`; prefetch per baris `GET /api/stock/availability?productId=` (di-watch pada daftar `productId`); submit `POST /api/stock-adjustments`.
- **State/logika:** `form {date, reason, notes}`, `items: AdjustmentLine[]`, cache `systemQty`, hitung `difference` per baris; aturan per baris: **stok naik → `unitCost` wajib**, **stok turun → alasan wajib**; `isScannerOpen`.
- **Navigasi:** berhasil → `…/adjustments/:id` (detail hasil posting).
- **Komponen:** `ProductBarcodeScannerModal`, `BaseSelect`, `BaseInput`, `BaseButton`.

#### `app/pages/admin/inventory/adjustments/[id].vue` → `/admin/inventory/adjustments/:id`
- **Data:** `GET /api/stock-adjustments/:id` (key `stock-adjustment-${id}`, `watch: [adjustmentId]`); aksi `POST …/:id/post`, `POST …/:id/cancel`, `DELETE …/:id` via `runAction()`.
- **State/logika:** `busy`, `isDeleteOpen`, `errorMessage`, `STATUS_TONE` per status.

### 3.6 Tabel indeks halaman

| File | Route | Endpoint utama |
| --- | --- | --- |
| `app/pages/index.vue` | `/` | — (redirect 302) |
| `app/pages/login.vue` | `/login` | Better Auth `signIn.email` / `signIn.username` |
| `app/pages/register.vue` | `/register` | Better Auth `signUp.email` |
| `app/pages/dashboard.vue` | `/dashboard` | sesi Better Auth |
| `app/pages/admin/index.vue` | `/admin` | — (redirect 302) |
| `app/pages/admin/master-data/brands/index.vue` | `/admin/master-data/brands` | GET/POST/PATCH/DELETE `/api/brands[/:id]` |
| `app/pages/admin/master-data/categories/index.vue` | `/admin/master-data/categories` | GET/POST/PATCH/DELETE `/api/categories[/:id]` |
| `app/pages/admin/master-data/units/index.vue` | `/admin/master-data/units` | GET/POST/PATCH/DELETE `/api/units[/:id]` |
| `app/pages/admin/master-data/suppliers/index.vue` | `/admin/master-data/suppliers` | GET/POST/PATCH/DELETE `/api/suppliers[/:id]` |
| `app/pages/admin/master-data/products/index.vue` | `/admin/master-data/products` | GET `/api/products`, GET `/api/options/*`, DELETE `/api/products/:id`, GET `/api/products/barcode/:b` |
| `app/pages/admin/master-data/products/create.vue` | `/admin/master-data/products/create` | GET `/api/options/*`, POST `/api/products` |
| `app/pages/admin/master-data/products/[id]/edit.vue` | `/admin/master-data/products/:id/edit` | GET/PATCH `/api/products/:id`, GET `/api/options/*` |
| `app/pages/admin/transactions/purchases/index.vue` | `/admin/transactions/purchases` | GET `/api/purchases` |
| `app/pages/admin/transactions/purchases/create.vue` | `/admin/transactions/purchases/create` | GET `/api/suppliers`, `/api/products`, POST `/api/purchases` |
| `app/pages/admin/transactions/purchases/[id].vue` | `/admin/transactions/purchases/:id` | GET `/api/purchases/:id`, POST `…/post`, `…/cancel` |
| `app/pages/admin/transactions/sales/index.vue` | `/admin/transactions/sales` | GET `/api/sales` |
| `app/pages/admin/transactions/sales/create.vue` | `/admin/transactions/sales/create` | GET `/api/products`, POST `/api/sales` |
| `app/pages/admin/transactions/sales/[id].vue` | `/admin/transactions/sales/:id` | GET `/api/sales/:id`, POST `…/post`, `…/cancel` |
| `app/pages/admin/transactions/returns/index.vue` | `/admin/transactions/returns` | GET `/api/returns` |
| `app/pages/admin/transactions/returns/create.vue` | `/admin/transactions/returns/create` | GET `/api/sales|purchases?status=POSTED`, GET detail sumber, POST `/api/returns` |
| `app/pages/admin/inventory/index.vue` | `/admin/inventory` | GET `/api/stock/expiry-notifications` |
| `app/pages/admin/inventory/adjustments/index.vue` | `/admin/inventory/adjustments` | GET `/api/stock-adjustments` |
| `app/pages/admin/inventory/adjustments/create.vue` | `/admin/inventory/adjustments/create` | GET `/api/products`, GET `/api/stock/availability`, POST `/api/stock-adjustments` |
| `app/pages/admin/inventory/adjustments/[id].vue` | `/admin/inventory/adjustments/:id` | GET/DELETE `…/:id`, POST `…/post`, `…/cancel` |

---

## 4. Flow per File Server

### 4.1 Pola route `server/api/**`

Nama file menentukan metode + path:

| Pola file | Route |
| --- | --- |
| `x/index.get.ts` | `GET /api/x` |
| `x/index.post.ts` | `POST /api/x` |
| `x/[id].get.ts` | `GET /api/x/:id` |
| `x/[id].patch.ts` | `PATCH /api/x/:id` |
| `x/[id].delete.ts` | `DELETE /api/x/:id` |
| `x/[id]/post.post.ts` | `POST /api/x/:id/post` |
| `x/[id]/cancel.post.ts` | `POST /api/x/:id/cancel` |

Rata-rata isi handler: guard (`requireSession` untuk baca / `requireAdmin` untuk tulis) → `parseWithSchema(zod, readBody|getQuery|routerParam)` → fungsi service → kembalikan hasil (create memakai `setResponseStatus(201)`).

### 4.2 Daftar route per resource

**auth**
| File | Route | Catatan |
| --- | --- | --- |
| `auth/[...all].ts` | `ALL /api/auth/*` | handler Better Auth; pre-check Zod + unisitas email/username pada `POST /sign-up/email` |

**brands (5)** · **categories (5)** · **units (5)** · **suppliers (5)** — pola sama; **GET → `requireSession`, POST/PATCH/DELETE → `requireAdmin`**:

| File (contoh brands) | Route | Service |
| --- | --- | --- |
| `index.get.ts` | `GET /api/brands` | `listBrands(query)` |
| `index.post.ts` | `POST /api/brands` | `createBrand(body)` → 201 |
| `[id].get.ts` | `GET /api/brands/:id` | `getBrand(id)` |
| `[id].patch.ts` | `PATCH /api/brands/:id` | `updateBrand(id, body)` |
| `[id].delete.ts` | `DELETE /api/brands/:id` | `deleteBrand(id)` → 204 |

**products (6)** — GET → `requireSession`, POST/PATCH/DELETE → `requireAdmin`:
| File | Route | Service |
| --- | --- | --- |
| `index.get.ts` | `GET /api/products` | `listProducts(query)` (filter category/brand/unit/isActive) |
| `index.post.ts` | `POST /api/products` | `createProduct` (SKU/barcode di-uppercase, unisitas) → 201 |
| `[id].get.ts` / `[id].patch.ts` / `[id].delete.ts` | `GET`/`PATCH`/`DELETE /api/products/:id` | `getProduct` / `updateProduct` / `deleteProduct` (204) |
| `barcode/[barcode].get.ts` | `GET /api/products/barcode/:barcode` | `checkBarcode(raw)` → `{ success, exists, data }`; barcode tetap string (nol di depan aman) |

**options (3)** — dropdown master data (prefix `/api/options/*`; dipindah dari `/api/{resource}/options` agar tidak ambigu dengan route `/:id` pada pengetikan `$fetch`); guard `requireSession`:
| File | Route | Service |
| --- | --- | --- |
| `options/brands.get.ts` | `GET /api/options/brands` | `listBrandOptions()` → `{ data }` |
| `options/categories.get.ts` | `GET /api/options/categories` | `listCategoryOptions()` |
| `options/units.get.ts` | `GET /api/options/units` | `listUnitOptions()` |

**purchases (7)** · **sales (7)** — semuanya `requireAdmin`:

| Route | Service |
| --- | --- |
| `GET /api/purchases` | `listPurchases(query)` (filter `status`, `supplierId`) |
| `POST /api/purchases` | `createPurchase(user.id, body)` |
| `GET/PATCH/DELETE /api/purchases/:id` | `getPurchase` / `updatePurchase` / `deletePurchase` (hanya DRAFT) |
| `POST /api/purchases/:id/post` | `postPurchase(id, user.id)` |
| `POST /api/purchases/:id/cancel` | `cancelPurchase(id, user.id)` |

Pola sama untuk sales (`salesListQuerySchema` filter `status`).

**returns (6)** dan **stock-adjustments (6)** — `requireAdmin`, **tanpa PATCH** (dokumen tidak diedit, hanya dibuat/dihapus-draft/posting/batalkan):

| Route | Service |
| --- | --- |
| `GET /api/returns` | `listReturns(query)` (filter `kind`, `status`) |
| `POST /api/returns` | `createReturn(user.id, body)` |
| `GET /api/returns/:id` | `getReturn(id)` |
| `DELETE /api/returns/:id` | `deleteReturn(id)` (hanya DRAFT) |
| `POST /api/returns/:id/post` | `postReturn(id, user.id)` |
| `POST /api/returns/:id/cancel` | `cancelReturn(id, user.id)` |

**stock (2)** — `requireAdmin`, skema query Zod inline:
| Route | Service |
| --- | --- |
| `GET /api/stock/availability?productId=` | `getStockAvailability(productId)` |
| `GET /api/stock/expiry-notifications?page&pageSize&category` | `getExpiryNotifications(query)` (`category: expired\|soon\|safe\|all`) |

### 4.3 `server/services/**` — aturan bisnis per file

| File | Tanggung jawab | Aturan kunci |
| --- | --- | --- |
| `transaction-number.service.ts` | nomor dokumen | `nextDocumentNumber(tx, prefix, model, date)` format `PREFIX-YYYYMMDD-NNNN` (counter = jumlah dokumen prefix-hari itu, direset harian); `withNumberRetry` retry ≤4× saat unique index menolak (race aman) |
| `brand.service.ts` / `category.service.ts` / `unit.service.ts` | CRUD master + `list*Options` | unisitas nama (unit: nama + simbol); delete diblokir `inUseError` bila masih dipakai produk |
| `supplier.service.ts` | CRUD supplier | unisitas `code` bila diisi; delete hard (FK error → `toHttpError`) |
| `product.service.ts` | master produk + barcode | SKU/barcode di-`trim().toUpperCase()`; `assertUniqueCodes` case-insensitive; `checkBarcode` → stok **dihitung agregat `stockBatch.quantityRemain`** di server; `exists:false` bukan error |
| `stock.service.ts` | **mesin stok FIFO** | `FIFO_ORDER = receivedAt asc, id asc`; batch kadaluarsa tidak pernah dialokasikan jual; `allocateFifo` → 409 bila kurang (menyebut stok kadaluarsa); `consumeBatchStock` decrement **bersyarat** (`remain ≥ qty`, kalah race → `false` → wajib rollback transaksi); `restoreBatchStock` increment; `recordMovement` quantity bertanda; expired = `expiredAt < hari ini UTC` (masih boleh dijual di hari H); `getExpiryNotifications` dihitung saat dibuka (tanpa cron), window `runtimeConfig.stockExpiryWarningDays` (default 30) |
| `purchase.service.ts` | siklus pembelian | total dihitung ulang server (`subtotal = Σ(qty×unitCost − diskon item)`, diskon header hanya mengurangi `total`); `create/update/delete` hanya DRAFT; `postPurchase` klaim idempoten `DRAFT→POSTED` lalu buat `StockBatch` per item dengan **biaya satuan bersih** `(qty×unitCost − diskon)/qty` + movement `PURCHASE` (+); `cancelPurchase` hanya POSTED dan **diblokir bila `quantityRemain ≠ quantityInitial`** (stok sudah terpakai → arahkan ke retur/penyesuaian) |
| `sales.service.ts` | siklus penjualan + FIFO + COGS | `assertReferences` (produk harus `isActive`); total dihitung ulang server; `postSales` klaim idempoten → per item `allocateFifo` → `consumeBatchStock` (bersyarat) → tulis `StockAllocation` → hitung cogs baris → movement `SALE` (−); `grossProfit = total − cogs` hanya saat POSTED; `cancelSales` diblokir bila ada retur POSTED; pengembalian stok per batch + movement `SALE_CANCEL` |
| `stock-adjustment.service.ts` | opname | saat posting `systemQty` **dihitung ulang otoritatif**; `difference > 0` → `unitCost` wajib + batch baru `ADJ-…` + movement (+); `difference < 0` → `reason` wajib + konsumsi FIFO (termasuk batch kadaluarsa); cancel mengembalikan ke batch persis yang dikonsumsi (dibaca dari movement negatif) |
| `return.service.ts` | siklus retur (lihat §5.4) | sumber harus POSTED; sisa = qty sumber − Σ qty retur POSTED; harga satuan retur diambil dari biaya batch asli; efek stok hanya di `postReturn` |

### 4.4 `server/utils/**`

| File | Isi |
| --- | --- |
| `api.ts` | `apiError(status, statusMessage, message, details?)`, `notFoundError`, `conflictError(field, message)`, `inUseError`, `toHttpError` (P2025→404, P2002/P2003→409) |
| `auth.ts` | instance Better Auth (Prisma adapter, plugin `username`, `autoSignIn:false`, field `role` server-owned `input:false`) + guard `requireSession` (401 tanpa sesi) & `requireAdmin` (`requireSession` + cek role ADMIN → 403), lihat §2.3 |
| `db.ts` | singleton `PrismaClient` + adapter `PrismaPg`, `process.loadEnvFile()` untuk build produksi, `globalThis` saat dev |
| `money.ts` | `roundMoney` (2 desimal half-up, semua aritmetika uang) + `toMoney` (Decimal → number) |
| `password.ts` | `hashPassword` format `salt:hash` scrypt; `verifyPassword` mencoba parameter baru lalu legacy seed (r=8), perbandingan timing-safe |
| `validation.ts` | `parseWithSchema` (lempar 400 `VALIDATION_ERROR` + `details` per-field), `paginationQuerySchema` (pageSize ≤100), `statusFilterSchema`, `idParamSchema`, `isoDateInputSchema`, `isoDateTimeInputSchema`, `optionalTrimmedText` |

---

## 5. Alur Domain End-to-End

### 5.1 Pembelian (Purchase)

```text
create.vue ──POST /api/purchases──▶ DRAFT
   │  (server: validasi supplier+produk, hitung ulang total, nomor PO-…)
   ▼
[id].vue ──POST …/post──▶ POSTED
   │  (klaim idempoten DRAFT→POSTED;
   │   per item: StockBatch [purchaseItemId unique, unitCost bersih,
   │               quantityInitial=quantityRemain=qty] + movement PURCHASE (+qty))
   ├── POST …/cancel ──▶ CANCELLED   (hanya bila sisa batch belum terpakai;
   │                                   kuras sisa + movement PURCHASE_CANCEL −qty)
   └── DELETE (hanya DRAFT)
```

### 5.2 Penjualan (Sales) — FIFO

```text
create.vue ──POST /api/sales──▶ DRAFT  (nomor INV-…, total dihitung ulang server)
   ▼
[id].vue ──POST …/post──▶ POSTED
   per item, dalam 1 transaksi:
     allocateFifo(productId, qty)        ← batch lama dulu, tanpa batch kadaluarsa
     consumeBatchStock(batch, qty)       ← decrement bersyarat (anti double-spend)
     tulis StockAllocation               ← jejak batch per baris (untuk COGS & retur)
     cogs baris = Σ(unitCost alokasi)
     recordMovement SALE (−qty)
   header: total cogs, grossProfit = total − cogs
   ▼
cancel ──▶ POSTED→CANCELLED (diblokir bila ada retur POSTED)
          restoreBatchStock per alokasi + movement SALE_CANCEL (+)
```

### 5.3 Pembuatan dokumen & nomor

Semua `create*` berjalan dalam `prisma.$transaction` + `withNumberRetry`:
`nextDocumentNumber` menghitung dokumen dengan prefix `PREFIX-YYYYMMDD` pada hari `date` → `NNNN` berikutnya; unique index `number` menjamin tanpa duplikat; retry ≤4× bila kalah race.

### 5.4 Retur (Return) — inti alur "Retur Baru"

**Membuat draft** (`returns/create.vue` → `POST /api/returns`):

```text
1. Pilih jenis: SALE (dari pelanggan) atau PURCHASE (ke supplier)
2. Muat dokumen sumber berstatus POSTED saja
     SALE      → GET /api/sales?status=POSTED
     PURCHASE  → GET /api/purchases?status=POSTED
3. Muat baris item sumber (GET /api/sales|purchases/:id) → isi qty retur per baris
4. POST /api/returns { kind, sourceId, date, reason?, condition?, notes?,
                       items: [{ sourceItemId, quantity, restock? }] }
```

Validasi server (`createReturn`):

| Cek | Hasil bila gagal |
| --- | --- |
| Sumber ada | 404 |
| Sumber `POSTED` | 409 `"Hanya dokumen berstatus posted yang dapat diretur."` |
| `sourceItemId` milik dokumen sumber | 400 detail per item |
| `quantity ≤ remaining`, `remaining = qty sumber − Σ qty retur POSTED` | 400 detail: *"melebihi sisa yang dapat dikembalikan (X dari Y terjual/dibeli)"* |
| Zod: minimal 1 item, qty ≥ 1 int | 400 `VALIDATION_ERROR` + `details` |

Harga satuan draft (dihitung server, bukan dari form):
- **SALE:** rata-rata tertimbang biaya alokasi FIFO baris penjualan (`saleLineWeightedCost`).
- **PURCHASE:** biaya satuan bersih `(qty×unitCost − diskon)/qty` — sama dengan cara batch dibebankan.

**Posting** (`POST /api/returns/:id/post`, hanya ADMIN) — satu transaksi:

```text
klaim idempoten DRAFT→POSTED
cek ulang sisa retur di dalam transaksi (retur POSTED baru bisa muncul) → 409 bila lewat
kind = SALE:
   restock=true  → item dipecah mengikuti alokasi FIFO penjualan aslinya:
                    restoreBatchStock(batch asli, per alokasi) + movement RETURN_IN (+) per batch
   restock=false → write-off: tanpa efek stok (stok sudah keluar saat penjualan)
kind = PURCHASE:
   consumeBatchStock(batch penerimaan asli) → 409 bila stok tidak cukup
   movement RETURN_OUT (−) + batchId diikut sertakan di item
```

**Pembatalan** (`POST /api/returns/:id/cancel`, hanya ADMIN, hanya POSTED) — kompensasi tanpa menghapus riwayat:
- SALE+restock: keluarkan lagi stok dari batch (**diblokir 409 bila hasil retur sudah terjual**) + movement `RETURN_CANCEL` (−).
- SALE tanpa restock: cukup flip status.
- PURCHASE: `restoreBatchStock` ke batch penerimaan + movement `RETURN_CANCEL` (+).

**Penghapusan:** `DELETE /api/returns/:id` hanya DRAFT (hard delete aman — belum ada efek stok).

**List** (`GET /api/returns`) mengembalikan `ReturnSummary` per baris: `number`, `kind`, `status`, `date`, `itemCount`, `totalQty`, `total` (Σ `subtotal` item = nilai inventaris retur), `user`.

### 5.5 Penyesuaian Stok (Opname)

```text
create.vue ──POST /api/stock-adjustments──▶ DRAFT (systemQty = snapshot tampilan)
   ▼
[id].vue ──POST …/post──▶ POSTED
   systemQty dihitung ulang otoritatif → difference = physical − system
   difference = 0 : update baris saja
   difference > 0 : unitCost wajib → batch baru ADJ-… + movement ADJUSTMENT (+)
   difference < 0 : reason wajib → konsumsi FIFO (termasuk batch kadaluarsa),
                    unitCost hasil = rata-rata tertimbang batch terkonsumsi, stok kurang → 409
   cancel : kuras batch buatan adjustment (bersyarat) / kembalikan ke batch
            persis yang dikonsumsi (dibaca dari movement ADJUSTMENT negatif)
   delete : hanya DRAFT
```

### 5.6 Mesin stok (ringkas)

```text
allocateFifo ─ urut receivedAt asc, id asc; lewati batch kadaluarsa; kurang → 409
consumeBatchStock ─ WHERE remain ≥ qty; gagal → rollback transaksi
restoreBatchStock ─ increment kembali (cancel / restock retur / penyesuaian)
recordMovement ── audit tiap perubahan: type, qty bertanda, referenceType/Id, userId
StockAllocation ─ jejak batch per baris penjualan (basis COGS & retur SALE)
```

Tipe `StockMovementType`: `PURCHASE`, `SALE`, `RETURN_IN`, `RETURN_OUT`, `ADJUSTMENT`, `PURCHASE_CANCEL`, `SALE_CANCEL`, `RETURN_CANCEL`, `ADJUSTMENT_CANCEL`.

---

## 6. Lapisan Penunjang per File

### 6.1 Middleware & layout

| File | Peran |
| --- | --- |
| `app/middleware/auth.global.ts` | guard global (lihat §2.2) |
| `app/layouts/default.vue` | shell admin: `AppSidebar` (collapse di `localStorage["babacang-nav-collapsed"]`, state mobile `is-nav-open` + overlay), `AppHeader` (judul dari `usePageTitle`), `<slot>`, `AppToastList` |
| `app/layouts/auth.vue` | dipakai `/login` & `/register`: kartu terpusat tanpa sidebar/header + `AppToastList` |

### 6.2 Composables (`app/composables/`, auto-import, tanpa barrel)

| File | Ekspor & kapan dipakai |
| --- | --- |
| `useAuth.ts` | klien Better Auth Vue (+`usernameClient`); SSR meneruskan cookie request; dipakai middleware, login, register, dashboard |
| `useDebouncedRef.ts` | `useDebouncedRef(source, delay=350)` — semua input pencarian daftar |
| `useNotify.ts` | antrean toast `useState` (`success/error/dismiss`), auto-dismiss 4000 ms, tolak duplikat; dirender `AppToastList` |
| `usePageTitle.ts` | set judul halaman + `useHead`; dibaca `AppHeader` |
| `useTheme.ts` | state terang/gelap, sinkron `.dark` di `<html>` + `localStorage["babacang-theme"]` (klien saja) |

### 6.3 Utils (`app/utils/`, auto-import via `imports.dirs: ["utils/**"]`)

| File | Ekspor |
| --- | --- |
| `api/error.ts` | `getApiErrorPayload(error)` → `ApiErrorPayload { message, details? }` (ambil `data` ofetch, pesan koneksi utk transport error, fallback generik) |
| `format/currency.ts` | `formatCurrency(value, locale="id-ID")` → `Rp 24.580.000`; `"-"` utk nilai tak hingga |
| `format/date.ts` | `formatDate`, `formatDateTime`, `formatDayLabel`, `toLocalDateInputValue`, `toLocalDateTimeInputValue` (input date tanpa geser zona); `"-"` bila invalid |
| `navigation.ts` | `isSafeInternalPath(value)` — tolak URL absolut/`//host`/`/\` (penjaga open-redirect `?redirect=`) |
| `validation/number.ts` | `parseNonNegativeInt`, `parsePositiveInt`, `parseNonNegativeMoney` (kosong/invalid → `null`, tidak pernah NaN diam-diam) |

### 6.4 Komponen (`app/components/`)

| Kelompok | File | Peran |
| --- | --- | --- |
| `ui/` | `BaseButton`, `BaseInput`, `BaseSelect`, `BaseTextarea`, `BaseBadge`, `BaseModal`, `BaseConfirmDialog`, `BasePagination` | primitif form/UI; `BaseSelect` = combobox searchable (`v-model`, `options[{value,label}]`, `error`, `disabled`); `BaseInput` `v-model string\|number` (konversi `Number()` di submit) |
| `layout/` | `AppSidebar`, `AppHeader`, `AppToastList` | shell default |
| `admin/master-data/` | `BrandForm`, `CategoryForm`, `UnitForm`, `SupplierForm`, `ProductForm` | form CRUD dipakai halaman master data (submit ke parent: `Create*Input`) |
| `product/` | `ProductBarcodeScannerModal` | modal html5-qrcode; hasil scan → halaman (verifikasi barcode / pra-isi create / stok opname) |

---

## 7. Tipe Data (`types/`)

Struktur: tiap domain satu subdirektori + `index.ts` barrel satu baris; `types/index.ts` adalah barrel root (dipakai sebagai `import type { … } from "~~/types"`).

| Direktori | Type utama |
| --- | --- |
| `api/` | `ApiErrorPayload { message, details? }`, `PaginationMeta`, `PaginatedResponse<T> { data, meta }`, `CollectionResponse<T> { data }`, `BaseListQuery` |
| `auth/` | `UserRole = "ADMIN" \| "STAFF"`, `SessionUser` |
| `transaction/` | `TransactionStatus = "DRAFT" \| "POSTED" \| "CANCELLED"`, `TransactionUserRef { id, name }` |
| `product/` | `Product`, `ProductListQuery`, `CreateProductInput`, `UpdateProductInput`, `BarcodeCheckResponse { success, exists, data }` |
| `brand/`·`category/`·`unit/`·`supplier/` | `Brand`/`Category`/`Unit`/`Supplier`, `*ListQuery`, `*Option`, `Create*Input`, `Update*Input` |
| `purchase/` | `Purchase` (supplier, subtotal/discount/total), `PurchaseItem`, `PurchaseSummary`, `PurchaseListQuery`, `CreatePurchaseInput` |
| `sales/` | `Sales` (subtotal/discount/tax/total/cogs/`grossProfit?`), `SalesItem` (+`cogs`, `allocations`), `StockAllocationView`, `SalesSummary`, `CreateSalesInput` |
| `returns/` | `ReturnKind`, `Return` (+`sourceNumber`), `ReturnItem` (`unitCost`, `subtotal`, `restock`, `batchId`), `ReturnSummary` (`itemCount`, `totalQty`, **`total`**), `CreateReturnInput { kind, sourceId, date, reason?, condition?, notes?, items[] }`, `ReturnItemInput { sourceItemId, quantity, restock? }` |
| `adjustment/` | `StockAdjustment`, `StockAdjustmentItem` (`systemQty`, `physicalQty`, `difference`, `unitCost`, `reason`), `StockAdjustmentSummary`, `CreateStockAdjustmentInput` |
| `stock/` | `StockBatch` (`quantityInitial/Remain`, `isExpired`), `StockMovement`, `StockAvailability { available, expiredQuantity, systemTotal, batches }`, `ExpiryCategory`, `ExpiryNotification`, `ExpirySummary` |

---

## 8. Database (Prisma)

Datasource **postgresql** (Neon, `sslmode=verify-full`), generator `prisma-client` → `prisma/generated` (preview `relationJoins`).

**Enum:** `TransactionStatus` (DRAFT/POSTED/CANCELLED) · `ReturnKind` (SALE/PURCHASE) · `StockMovementType` (9 varian, lihat §5.6) · `UserRole` (ADMIN/STAFF).

**19 model** (nama → inti relasi):

```text
Category, Brand, Unit ──(Restrict)──▶ Product ◀──(Restrict)── Supplier ──▶ Purchase
Product ─▶ StockBatch ─▶ StockAllocation ◀── SalesItem ◀── Sales
                   └──▶ StockMovement (audit, referenceType/Id)
Purchase ─▶ PurchaseItem ─▶ StockBatch (1:1, unique purchaseItemId)
Sales    ─▶ SalesItem
PurchaseItem / SalesItem ──▶ ReturnItem ◀── Return (kind, status, number RTN-…)
StockBatch ◀── ReturnItem (relasi "ReturnInBatch")
StockAdjustment ─▶ StockAdjustmentItem
User (role) ──▶ Purchase/Sales/Return/StockAdjustment/StockMovement/Session/Account
```

- Uang: `Decimal(14,2)` — selalu lewat `toMoney`/`roundMoney` sebelum dikirim ke client.
- Unique: `sku`, `barcode?`, `number` (semua dokumen), `code?` supplier, `name` master data, `sessions.token`, `users.email/username`.
- `onDelete`: dokumen → item `Cascade`; master/batch → `Restrict`; `StockBatch.purchaseItem` → `SetNull`; audit → tidak pernah dihapus (`Cancel` menghasilkan baris kompensasi).

---

## 9. Konfigurasi & Environment

**`nuxt.config.ts`**
- Tailwind v4 lewat `vite.plugins: [tailwindcss()]` (tanpa `modules`).
- `runtimeConfig`: `stockExpiryWarningDays: 30` → `NUXT_STOCK_EXPIRY_WARNING_DAYS`.
- `components: [~/components/ui, ~/components/layout, ~/components/admin]` (tanpa prefix path).
- `imports.dirs: ["utils/**"]` — auto-import util bersaratan.
- `app.head`: `lang="id"`, judul "Babacang Kelontong — Manajemen Barang", Google Fonts (Bricolage Grotesque, JetBrains Mono, Plus Jakarta Sans), inline script anti-FOUC tema gelap.
- Tanpa `routeRules`/blok `experimental`.

**Environment (`.env`, lihat `.env.example`)**

| Variabel | Keperluan |
| --- | --- |
| `DATABASE_URL` | koneksi PostgreSQL (`sslmode=verify-full`) |
| `BETTER_AUTH_URL` | baseURL Better Auth (sesuaikan port saat uji lokal) |
| `NUXT_SESSION_PASSWORD` | cookie sesi SSR Nuxt |
| `NUXT_STOCK_EXPIRY_WARNING_DAYS` | (opsional) window peringatan kedaluwarsa |

**Perintah penting:** `pnpm dev` · `pnpm build` · `npx eslint . --max-warnings=0` · `npx -p typescript@5.9.3 -p vue-tsc@2.2.10 vue-tsc --noEmit -p .nuxt/tsconfig.app.json` · `npx tsc --noEmit -p .nuxt/tsconfig.server.json`.

---

## 10. Indeks Seluruh File

**app/pages** — lihat tabel §3.6 (24 file).

**app/** pendukung:

| File | Peran |
| --- | --- |
| `middleware/auth.global.ts` | guard global autentikasi |
| `layouts/default.vue` · `layouts/auth.vue` | shell admin · layout masuk |
| `composables/useAuth.ts` | klien Better Auth |
| `composables/useDebouncedRef.ts` | debounce ref pencarian |
| `composables/useNotify.ts` | antrean toast |
| `composables/usePageTitle.ts` | judul halaman |
| `composables/useTheme.ts` | tema terang/gelap |
| `utils/api/error.ts` | normalisasi error API |
| `utils/format/currency.ts` · `utils/format/date.ts` | format rupiah & tanggal |
| `utils/navigation.ts` | penjaga open-redirect |
| `utils/validation/number.ts` | parser angka ketat |
| `components/ui/Base*.vue` (8) | primitif UI |
| `components/layout/App*.vue` (3) | sidebar/header/toast |
| `components/admin/master-data/*Form.vue` (5) | form master data |
| `components/product/ProductBarcodeScannerModal.vue` | scanner barcode |

**server/api** — 58 file, lihat §4.2 (per resource).

**server/services** — 11 file, lihat §4.3.

**server/utils** — 6 file, lihat §4.4.

**types/** — 13 domain, lihat §7.

---

## 11. Catatan Kondisi Saat Ini

Temuan saat penyusunan dokumen ini, dengan status perbaikannya:

1. **Halaman detail retur belum ada.** `returns/index.vue` menautkan nomor dokumen ke `/admin/transactions/returns/:id`, tetapi `app/pages/admin/transactions/returns/[id].vue` belum dibuat → link mati (404). API-nya sudah siap: `GET /api/returns/:id`, `POST …/post`, `POST …/cancel`, `DELETE …/:id` — pola tiruan terdekat: `purchases/[id].vue`.
2. ~~**Endpoint master data tanpa guard server.**~~ **Sudah diperbaiki** (lihat §2.3): seluruh route master data kini dijaga `requireSession` (GET, STAFF boleh baca) dan `requireAdmin` (POST/PATCH/DELETE, ADMIN only). Terverifikasi lewat uji runtime: anonim → 401, STAFF menulis → 403, ADMIN menulis → 201/204.
3. **ID non-UUID menghasilkan 500.** `idParamSchema` hanya cek panjang (bukan format UUID) → `GET /api/brands/abc` masuk ke Prisma dan gagal parse UUID → 500 (bukan 400/404). Berlaku untuk semua resource `:id`, termasuk URL lama `/api/{resource}/options` yang kini jatuh ke route `[id]`. Sebaiknya format UUID divalidasi di `idParamSchema`.
4. **Daftar pembelian/penjualan/retur/penyesuaian** memuat `meta` pagination tetapi template belum menampilkan kontrol `BasePagination` (halaman hanya memuat 10 baris pertama tanpa navigasi halaman).
