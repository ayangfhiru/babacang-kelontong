# Task: Implement Sales, Purchasing, Returns, and Stock Adjustments Using FIFO

Implementasikan modul transaksi dan manajemen stok pada proyek Nuxt.js yang sudah ada. Proyek menggunakan Prisma sebagai ORM dan database yang sudah dikonfigurasi.

Modul yang akan dibuat:

1. Penjualan (Sales)
2. Pembelian (Purchasing)
3. Retur (Returns)
4. Penyesuaian Stok (Stock Adjustments)
5. Notifikasi produk mendekati atau melewati tanggal kedaluwarsa (Expiry Notifications)

Semua modul transaksi hanya boleh diakses oleh pengguna dengan role `admin`.

**Penting:** Lakukan audit terhadap struktur proyek, `AGENTS.md`, skema Prisma, autentikasi dan otorisasi, master data, API, komponen form, serta pola UI yang sudah ada sebelum mulai mengimplementasikan fitur.

Jangan membuat ulang modul master data yang sudah tersedia. Integrasikan fitur baru dengan model Product, Category, Brand, Unit, Supplier, dan modul lain yang relevan.

---

## 1. Ketentuan Umum dan Arsitektur

- Gunakan Nuxt.js, Vue, TypeScript, Prisma, dan Tailwind CSS sesuai konfigurasi proyek.
- Ikuti konvensi penamaan, struktur folder, dan pola komponen yang sudah digunakan.
- Gunakan UUID untuk primary key sesuai konvensi proyek.
- Terapkan `@map("snake_case")` untuk field Prisma yang terdiri dari dua kata atau lebih, dan `@@map` untuk pemetaan nama tabel jika diperlukan.
- Gunakan tipe TypeScript eksplisit untuk data, props, payload, response, dan fungsi.
- Ikuti konvensi fungsi `const namaFungsi = () => {}` jika sesuai dengan pola proyek.
- Gunakan `server/api` untuk endpoint backend.
- Letakkan fungsi bersama di `utils` atau service/composable sesuai arsitektur proyek.
- Gunakan `BaseSelect` yang sudah tersedia, termasuk dukungan Select2, untuk pemilihan produk, supplier, satuan, dan data relasional.
- Untuk form transaksi yang panjang, gunakan halaman tersendiri untuk create dan edit, bukan modal yang membuat field terpotong.
- Pertahankan semua fitur master data yang sudah berjalan.

### Prinsip arsitektur transaksi

Pisahkan tanggung jawab berikut:

- **Master Product:** identitas produk dan informasi umum.
- **Purchase:** pencatatan penerimaan barang dan harga perolehan.
- **Sales:** pencatatan penjualan dan pengurangan stok.
- **Stock Batch:** kelompok stok berdasarkan penerimaan, tanggal kedaluwarsa, dan biaya perolehan.
- **Stock Movement:** riwayat perubahan stok yang dapat diaudit.
- **Returns:** pengembalian barang berdasarkan transaksi asal atau jenis retur yang didukung.
- **Stock Adjustment:** koreksi stok dengan alasan yang jelas.
- **Expiry Notifications:** pendeteksian stok yang mendekati atau melewati tanggal kedaluwarsa.

Jangan hanya menyimpan jumlah stok pada tabel Product tanpa menyimpan detail batch. FIFO memerlukan informasi stok per batch agar harga perolehan dan sisa stok dapat dihitung dengan benar.

---

## 2. Metode FIFO (First In, First Out)

Terapkan FIFO untuk pengeluaran stok dan perhitungan harga pokok penjualan.

### Aturan FIFO

- Barang yang masuk lebih dahulu harus digunakan terlebih dahulu berdasarkan urutan penerimaan stok.
- Setiap penerimaan barang membentuk batch stok yang menyimpan kuantitas, biaya perolehan, tanggal penerimaan, dan tanggal kedaluwarsa jika tersedia.
- Saat penjualan, sistem harus mengambil stok dari batch yang paling awal diterima dan masih memiliki stok yang dapat dijual.
- Jika kuantitas penjualan melebihi stok batch pertama, lanjutkan ke batch berikutnya sampai kebutuhan terpenuhi.
- Satu item penjualan dapat menggunakan beberapa batch.
- Simpan detail alokasi batch yang digunakan untuk setiap item penjualan.
- Hitung harga pokok penjualan (HPP/COGS) dari biaya perolehan aktual batch yang dialokasikan, bukan dari harga jual produk.
- Simpan hasil perhitungan HPP pada detail transaksi atau catatan alokasi agar histori tetap konsisten walaupun data master berubah.
- Jangan mengizinkan stok negatif.
- Gunakan transaksi database Prisma untuk memastikan seluruh pengurangan stok dan penyimpanan transaksi berhasil atau dibatalkan bersama-sama.

### FIFO dan tanggal kedaluwarsa

FIFO tetap menjadi dasar perhitungan biaya, tetapi barang yang kedaluwarsa tidak boleh dijual.

- Jangan mengalokasikan batch yang sudah kedaluwarsa untuk penjualan.
- Untuk batch dengan tanggal kedaluwarsa yang sama atau berbeda, gunakan urutan penerimaan sebagai dasar FIFO biaya.
- Tampilkan peringatan apabila batch yang lebih lama tidak dapat dijual karena kedaluwarsa.
- Jika bisnis memerlukan prioritas barang berdasarkan tanggal kedaluwarsa, pisahkan aturan FEFO (First Expired, First Out) dari FIFO. Jangan diam-diam mengganti algoritma biaya FIFO menjadi FEFO.
- Pastikan tanggal dan zona waktu ditangani secara konsisten.

---

## 3. Perubahan Schema Database

Audit `prisma/schema.prisma` sebelum menambahkan model. Sesuaikan relasi dengan model yang sudah ada dan hindari duplikasi field atau model.

Buat atau sesuaikan model yang diperlukan, misalnya:

- `Purchase` dan `PurchaseItem`
- `Sales` dan `SalesItem`
- `StockBatch`
- `StockMovement`
- `StockAllocation`
- `Return` dan `ReturnItem`
- `StockAdjustment` dan `StockAdjustmentItem`

Nama model dan field boleh menyesuaikan konvensi proyek, tetapi setiap model harus memiliki tanggung jawab yang jelas.

### A. StockBatch

Simpan detail batch penerimaan stok, minimal mencakup:

- ID UUID.
- Relasi ke Product.
- Relasi ke PurchaseItem atau sumber penerimaan yang relevan.
- Nomor batch jika tersedia.
- Tanggal penerimaan.
- Tanggal kedaluwarsa (`expiredAt`) yang nullable jika produk tidak memiliki tanggal kedaluwarsa.
- Kuantitas awal.
- Kuantitas tersisa.
- Biaya per unit atau harga perolehan.
- Timestamp pembuatan dan pembaruan.

Gunakan nama field `camelCase` dan mapping kolom database `snake_case`.

### B. StockMovement

Catat seluruh perubahan stok, minimal:

- Produk dan batch terkait.
- Jenis pergerakan: pembelian, penjualan, retur, penyesuaian, atau pembatalan transaksi yang valid.
- Kuantitas masuk dan keluar, atau representasi bertanda yang konsisten.
- Referensi transaksi sumber.
- Tanggal pergerakan.
- Pengguna yang melakukan tindakan.
- Catatan atau alasan jika diperlukan.

Riwayat pergerakan stok harus dapat digunakan untuk audit dan rekonsiliasi.

### C. StockAllocation

Catat alokasi batch untuk setiap item penjualan:

- SalesItem.
- StockBatch.
- Kuantitas yang diambil dari batch.
- Biaya per unit saat alokasi.
- Total biaya alokasi.

Pastikan total kuantitas alokasi sesuai dengan kuantitas penjualan dan total biaya alokasi sesuai dengan HPP.

### D. Expiry Fields

Jika schema produk saat ini belum mendukung kedaluwarsa, tambahkan informasi kedaluwarsa pada tingkat batch, bukan hanya Product.

Alasannya: satu produk dapat memiliki beberapa batch dengan tanggal kedaluwarsa dan jumlah stok berbeda.

Field `expiredAt` harus nullable agar produk tanpa masa kedaluwarsa tetap dapat digunakan.

### E. Relasi dan Integritas

- Pastikan foreign key sesuai dengan UUID model yang dirujuk.
- Tambahkan index untuk pencarian batch berdasarkan produk, tanggal penerimaan, dan tanggal kedaluwarsa.
- Tambahkan index untuk pencarian transaksi berdasarkan nomor transaksi, status, dan tanggal.
- Terapkan unique constraint untuk nomor transaksi sesuai kebutuhan.
- Tentukan kebijakan `onDelete` secara eksplisit.
- Jangan menghapus histori transaksi atau batch yang sudah digunakan dalam transaksi.
- Jika diperlukan, gunakan status void/cancelled dan catatan pembalik stok daripada menghapus transaksi yang sudah diposting.

**Migrasi database:** Buat migrasi Prisma yang sesuai. Jangan melakukan reset database, menghapus data produksi, atau menjalankan migrasi destruktif secara otomatis. Jelaskan dampak migrasi sebelum menjalankannya pada database berisi data.

---

## 4. Modul Pembelian (Purchasing)

Buat modul untuk mencatat pembelian barang dari Supplier.

### Halaman

- Daftar pembelian.
- Halaman tambah pembelian.
- Halaman detail pembelian.
- Halaman edit hanya untuk transaksi yang masih berstatus draft, jika status draft diterapkan.

### Field transaksi

Header pembelian minimal mencakup:

- Nomor pembelian otomatis dan unik.
- Supplier.
- Tanggal pembelian.
- Status transaksi.
- Catatan.
- Subtotal.
- Diskon atau biaya tambahan jika diperlukan oleh kebutuhan proyek.
- Total transaksi.
- Pengguna yang membuat transaksi.

Detail pembelian mencakup:

- Produk.
- Kuantitas.
- Satuan.
- Harga perolehan per unit.
- Diskon per item jika didukung.
- Tanggal kedaluwarsa batch.
- Nomor batch jika tersedia.
- Subtotal item.

### Alur pembelian

1. Admin membuat transaksi pembelian.
2. Admin memilih Supplier dan menambahkan item produk.
3. Sistem menghitung subtotal dan total.
4. Admin menyimpan transaksi sebagai draft atau memposting transaksi sesuai workflow yang dipilih.
5. Ketika transaksi diposting, sistem membuat batch stok berdasarkan barang yang benar-benar diterima.
6. Sistem menambah stok melalui batch dan mencatat StockMovement.
7. Sistem menyimpan biaya perolehan yang akan digunakan oleh FIFO.
8. Transaksi yang sudah diposting tidak boleh diedit bebas sehingga histori biaya dan stok tetap akurat.

Jangan menambah stok saat transaksi masih draft.

Jika penerimaan barang dilakukan secara bertahap, desain status dan pencatatan kuantitas diterima harus mendukung penerimaan parsial atau jelaskan batasan versi pertama secara eksplisit.

Pastikan transaksi pembelian yang dibatalkan tidak menyebabkan stok atau saldo batch menjadi tidak konsisten.

---

## 5. Modul Penjualan (Sales)

Buat modul penjualan yang sesuai untuk aplikasi pengelolaan penjualan produk dan hanya dapat digunakan admin.

### Halaman

- Daftar penjualan.
- Halaman tambah penjualan.
- Halaman detail penjualan.
- Halaman cetak struk atau invoice jika sesuai dengan pola proyek.
- Halaman edit hanya untuk transaksi draft, jika draft digunakan.

### Fitur form penjualan

Header transaksi:

- Nomor transaksi otomatis dan unik.
- Tanggal dan waktu transaksi.
- Status transaksi.
- Catatan.
- Subtotal.
- Diskon.
- Pajak jika memang dikonfigurasi dan diperlukan.
- Total akhir.
- Total HPP.
- Laba kotor sebagai informasi internal jika HPP tersedia.
- Pengguna admin yang membuat transaksi.

Detail item:

- Pencarian dan pemilihan produk.
- SKU atau kode produk jika tersedia.
- Nama produk.
- Harga jual.
- Kuantitas.
- Satuan.
- Diskon item jika didukung.
- Subtotal item.
- Informasi ketersediaan stok.
- Informasi batch yang dialokasikan jika relevan untuk halaman detail.

### Perilaku penjualan

- Admin dapat menambahkan banyak produk dalam satu transaksi.
- Admin dapat mengubah kuantitas dan menghapus item sebelum transaksi diposting.
- Harga jual diambil dari master Product sebagai nilai awal, tetapi harus divalidasi di server.
- Jika admin dapat mengubah harga jual atau diskon, terapkan validasi dan catat nilai aktual yang digunakan dalam transaksi.
- Hitung subtotal, diskon, pajak, dan total secara konsisten.
- Jangan mempercayai total atau HPP yang dikirim dari frontend. Hitung ulang di server.
- Validasi bahwa kuantitas harus positif.
- Tolak transaksi jika stok yang dapat dijual tidak mencukupi.
- Jangan mengurangi stok untuk transaksi draft.
- Saat transaksi diposting, lakukan alokasi FIFO, kurangi batch, catat StockMovement, simpan HPP, dan perbarui status transaksi dalam satu transaksi database.
- Jika salah satu langkah gagal, rollback seluruh perubahan.
- Pastikan dua transaksi bersamaan tidak dapat mengurangi batch yang sama melebihi stok tersisa. Gunakan mekanisme transaksi, locking atau conditional update yang sesuai dengan kemampuan database.
- Produk dari batch yang sudah kedaluwarsa tidak boleh dialokasikan.
- Simpan snapshot nama produk, SKU, harga jual, dan biaya yang diperlukan pada detail transaksi agar histori tidak berubah ketika master data diperbarui.
- Jika semua item valid, tampilkan ringkasan transaksi sebelum posting jika sesuai dengan workflow yang digunakan.

### Harga pokok dan laba kotor

Hitung HPP berdasarkan alokasi FIFO:

`HPP = jumlah seluruh (kuantitas batch yang dialokasikan × biaya per unit batch)`

Hitung laba kotor berdasarkan nilai transaksi aktual:

`Laba kotor = pendapatan bersih penjualan − HPP`

Pastikan diskon dan pajak diperlakukan secara konsisten. Jika pajak dicatat terpisah dari pendapatan, jangan memasukkannya sebagai pendapatan tanpa aturan yang jelas.

### Pembatalan dan pengembalian

- Jangan menghapus transaksi penjualan yang sudah diposting.
- Jika pembatalan diperbolehkan, buat mekanisme pembalik stok dan StockMovement yang dapat diaudit.
- Jangan mengembalikan stok secara otomatis ke batch yang tidak diketahui asalnya.
- Gunakan alokasi batch asli untuk menentukan batch yang perlu dipulihkan ketika memungkinkan.
- Jika transaksi sudah memiliki retur, hitung kuantitas yang telah dikembalikan agar tidak terjadi pengembalian ganda.

---

## 6. Modul Retur (Returns)

Sediakan mekanisme retur untuk pembelian dan penjualan dengan alur yang jelas.

### A. Retur Penjualan

Tujuannya mencatat barang yang dikembalikan pelanggan.

Fitur minimal:

- Pilih transaksi penjualan asal.
- Pilih item yang akan diretur.
- Masukkan kuantitas retur.
- Catat tanggal dan alasan retur.
- Catat kondisi barang.
- Tentukan apakah barang layak masuk kembali ke stok.
- Simpan pengguna admin yang memproses retur.

Ketentuan:

- Kuantitas retur tidak boleh melebihi kuantitas yang telah terjual dikurangi retur sebelumnya.
- Jika barang layak dijual kembali, masukkan ke batch asal atau buat batch retur yang mempertahankan informasi biaya dan tanggal kedaluwarsa yang valid.
- Jika barang rusak atau kedaluwarsa, jangan masukkan ke stok yang dapat dijual.
- Catat StockMovement dan referensi transaksi retur.
- Gunakan biaya batch asal untuk mengembalikan nilai persediaan secara konsisten dengan FIFO.
- Jika tanggal kedaluwarsa tidak dapat dipastikan, jangan menganggap barang layak jual secara otomatis.

### B. Retur Pembelian

Tujuannya mencatat barang yang dikembalikan kepada Supplier.

Fitur minimal:

- Pilih transaksi pembelian asal.
- Pilih item dan kuantitas yang akan diretur.
- Catat alasan dan tanggal retur.
- Simpan referensi batch asal.
- Catat nilai barang yang diretur.

Ketentuan:

- Kuantitas retur tidak boleh melebihi kuantitas yang tersedia untuk diretur berdasarkan transaksi pembelian dan histori retur sebelumnya.
- Kurangi stok dari batch asal yang relevan.
- Jangan mengurangi stok yang sudah tidak tersedia.
- Jika barang dari batch pembelian sudah terjual atau telah digunakan, tangani kondisi tersebut secara eksplisit dan jangan menghasilkan stok negatif.
- Catat StockMovement dan histori retur.
- Jangan menghapus transaksi pembelian asal.

### Status retur

Gunakan status yang jelas, misalnya draft, posted, dan cancelled, jika sesuai dengan workflow aplikasi.

Perubahan stok hanya dilakukan saat retur diposting. Retur yang sudah diposting harus dibatalkan melalui mekanisme kompensasi yang dapat diaudit, bukan dengan menghapus histori.

---

## 7. Modul Penyesuaian Stok (Stock Adjustments)

Sediakan modul untuk menyesuaikan stok berdasarkan hasil stock opname atau koreksi yang memiliki alasan valid.

### Fitur

- Daftar penyesuaian stok.
- Halaman tambah penyesuaian.
- Halaman detail.
- Status draft, posted, atau cancelled jika sesuai.
- Tanggal penyesuaian.
- Nomor transaksi otomatis.
- Produk.
- Batch jika penyesuaian dilakukan pada batch tertentu.
- Stok sistem.
- Stok fisik.
- Selisih.
- Alasan penyesuaian.
- Catatan.
- Pengguna admin.

### Aturan

- Selisih dihitung berdasarkan stok fisik dikurangi stok sistem.
- Penyesuaian harus tercatat sebagai StockMovement.
- Penambahan stok harus mempunyai sumber dan biaya perolehan yang jelas. Jika tidak diketahui, gunakan mekanisme biaya penyesuaian yang eksplisit dan dapat diaudit.
- Pengurangan stok harus menggunakan batch yang relevan dan tidak boleh menghasilkan stok negatif.
- Untuk pengurangan stok yang melibatkan beberapa batch, ikuti kebijakan FIFO yang digunakan aplikasi dan catat batch yang terkena dampak.
- Jangan mengubah kuantitas batch secara langsung tanpa riwayat StockMovement.
- Transaksi draft tidak mengubah stok.
- Transaksi yang sudah diposting tidak boleh diedit atau dihapus tanpa mekanisme pembalik yang jelas.

---

## 8. Notifikasi Produk Mendekati atau Sudah Kedaluwarsa

Implementasikan notifikasi berbasis stok batch, bukan hanya tanggal kedaluwarsa pada master Product.

### Kategori notifikasi

Sediakan setidaknya tiga kategori:

1. **Kedaluwarsa:** tanggal kedaluwarsa sudah lewat dan batch masih memiliki stok.
2. **Segera kedaluwarsa:** tanggal kedaluwarsa berada dalam rentang peringatan yang dapat dikonfigurasi.
3. **Aman:** tanggal kedaluwarsa masih berada di luar rentang peringatan.

Gunakan rentang default yang masuk akal, misalnya 30 hari sebelum tanggal kedaluwarsa, dan buat agar nilai tersebut mudah diubah melalui konfigurasi.

Jangan menganggap produk tanpa `expiredAt` sebagai produk kedaluwarsa. Produk tersebut harus diperlakukan sebagai tidak memiliki tanggal kedaluwarsa yang diketahui.

### Tampilan notifikasi

Sediakan halaman atau bagian notifikasi yang menampilkan:

- Nama produk.
- SKU jika tersedia.
- Nomor batch.
- Supplier atau referensi pembelian jika tersedia.
- Tanggal kedaluwarsa.
- Sisa hari hingga kedaluwarsa.
- Kuantitas batch yang masih tersedia.
- Status kedaluwarsa.
- Tindakan untuk melihat detail batch atau transaksi terkait.

Tambahkan ringkasan jumlah batch yang sudah kedaluwarsa dan mendekati kedaluwarsa pada dashboard admin jika dashboard sudah tersedia dan perubahan tersebut sesuai dengan desain proyek.

### Logika tanggal

- Gunakan tanggal server dan zona waktu yang konsisten.
- Pastikan produk dengan tanggal kedaluwarsa hari ini diperlakukan sesuai aturan bisnis yang ditentukan.
- Tampilkan jumlah hari secara akurat dan hindari perbedaan hasil karena jam atau zona waktu.
- Hanya tampilkan batch yang masih memiliki kuantitas tersisa.
- Batch kedaluwarsa harus dikecualikan dari stok yang dapat dijual.

### Cara memperbarui notifikasi

Untuk versi pertama, notifikasi boleh dihitung berdasarkan query batch saat halaman dibuka sehingga tidak membutuhkan cron job atau worker baru.

Jika proyek sudah memiliki mekanisme scheduled task, boleh gunakan kembali untuk notifikasi persisten. Jangan menambahkan layanan baru tanpa kebutuhan yang jelas.

---

## 9. Otorisasi Admin

Semua halaman dan API modul baru hanya boleh diakses oleh admin.

- Periksa sistem autentikasi dan role yang sudah digunakan proyek.
- Gunakan mekanisme otorisasi server-side yang sudah tersedia.
- Lindungi halaman melalui middleware jika sesuai, tetapi jangan mengandalkan middleware frontend sebagai satu-satunya perlindungan.
- Validasi role admin pada setiap endpoint transaksi dan endpoint notifikasi.
- Jangan menganggap pengguna yang sudah login otomatis merupakan admin.
- Tolak request tanpa autentikasi atau role yang sesuai dengan status HTTP yang benar.
- Jangan menerima `userId` pembuat transaksi dari payload sebagai sumber otoritatif. Ambil identitas pengguna dari sesi server yang sudah diverifikasi.
- Jangan mengubah mekanisme autentikasi yang sudah ada hanya untuk menambahkan modul ini.
- Jangan membocorkan detail internal server dalam respons error.

---

## 10. Keamanan, Transaksi, dan Konsistensi Data

Perhatikan aspek berikut:

- Gunakan validasi server-side untuk semua input.
- Jangan mempercayai kuantitas stok, harga, total transaksi, atau HPP dari frontend.
- Gunakan transaksi Prisma untuk operasi yang mengubah beberapa tabel.
- Cegah stok negatif dan pengurangan stok ganda.
- Tangani request berulang dengan mekanisme idempotensi atau pemeriksaan status transaksi yang sesuai.
- Pastikan nomor transaksi unik.
- Pastikan stok, batch, alokasi FIFO, dan StockMovement selalu konsisten.
- Simpan histori transaksi yang sudah diposting.
- Hindari hard delete pada data yang sudah menjadi bagian dari histori transaksi.
- Terapkan error handling yang aman dan informatif pada API serta frontend.
- Gunakan pagination dan pencarian server-side untuk daftar transaksi jika pola tersebut sudah tersedia.
- Jangan melakukan operasi stok langsung dari frontend.

---

## 11. UI dan Pengalaman Pengguna

Ikuti tampilan admin yang sudah ada.

Setiap modul harus memiliki:

- Halaman daftar.
- Pencarian dan pagination jika sesuai dengan modul lain.
- Halaman tambah dan detail.
- Halaman edit hanya untuk status yang mengizinkan.
- Konfirmasi sebelum posting, pembatalan, atau tindakan yang mengubah stok.
- Loading state dan pesan error.
- Notifikasi sukses setelah operasi benar-benar berhasil.

Untuk form transaksi:

- Gunakan halaman tersendiri untuk pembelian, penjualan, retur, dan penyesuaian stok.
- Gunakan `BaseSelect` yang sudah tersedia untuk pemilihan data relasional.
- Buat input item transaksi yang dapat menambah dan menghapus baris.
- Tampilkan ringkasan subtotal, total, dan kuantitas.
- Tampilkan informasi stok tersedia sebelum transaksi diposting.
- Jangan menampilkan batch kedaluwarsa sebagai stok yang tersedia untuk penjualan.
- Pastikan tampilan responsif dan tidak memotong field atau dropdown.

---

## 12. Urutan Implementasi

Kerjakan secara bertahap agar integritas stok tetap terjaga:

1. Audit schema, master data, auth, API, dan UI yang ada.
2. Rancang model batch, stock movement, dan alokasi FIFO.
3. Buat schema Prisma dan migrasi yang aman.
4. Implementasikan service perhitungan dan alokasi FIFO.
5. Implementasikan modul pembelian dan penerimaan batch.
6. Implementasikan modul penjualan dan HPP FIFO.
7. Implementasikan retur pembelian dan penjualan.
8. Implementasikan penyesuaian stok.
9. Implementasikan notifikasi kedaluwarsa.
10. Implementasikan halaman, navigasi, dan otorisasi admin.
11. Jalankan pemeriksaan dan pengujian seluruh alur transaksi.

Jangan membuat UI transaksi yang tampak berfungsi jika backend dan mekanisme stok belum konsisten. Jika perlu, selesaikan fondasi database dan service sebelum melanjutkan ke UI.

---

## 13. Pengujian Wajib

Buat atau jalankan pengujian yang mencakup:

### FIFO

- Pembelian batch A sebanyak 10 unit dengan biaya 10.000 per unit.
- Pembelian batch B sebanyak 10 unit dengan biaya 12.000 per unit.
- Penjualan sebanyak 15 unit.

Hasil yang diharapkan:

- Batch A terpakai 10 unit.
- Batch B terpakai 5 unit.
- HPP total 160.000.
- Sisa batch A 0 unit.
- Sisa batch B 5 unit.

### Stok tidak mencukupi

- Coba menjual lebih banyak dari stok yang tersedia.
- Sistem harus menolak transaksi dan tidak mengubah stok.

### Kedaluwarsa

- Batch yang sudah kedaluwarsa tidak boleh dijual.
- Batch yang mendekati kedaluwarsa muncul pada notifikasi.
- Batch tanpa tanggal kedaluwarsa tidak dianggap kedaluwarsa.

### Retur

- Retur penjualan tidak boleh melebihi jumlah yang telah terjual dikurangi retur sebelumnya.
- Barang yang tidak layak jual tidak boleh masuk ke stok yang dapat dijual.
- Retur pembelian tidak boleh menyebabkan stok negatif.

### Penyesuaian

- Selisih stok dicatat dengan benar.
- Setiap penyesuaian menghasilkan StockMovement.
- Kegagalan transaksi tidak boleh meninggalkan stok dan histori dalam kondisi berbeda.

### Otorisasi

- Admin dapat mengakses modul.
- Pengguna non-admin ditolak pada halaman dan API.
- Request tanpa autentikasi ditolak.

### Konsistensi

- Posting transaksi tidak boleh dilakukan dua kali untuk mengurangi stok berulang.
- Operasi database yang gagal harus di-rollback.
- Transaksi yang sudah diposting tidak dapat diubah tanpa mekanisme kompensasi yang valid.

---

## 14. Laporan Akhir

Setelah implementasi, berikan laporan:

1. Schema dan migrasi yang ditambahkan atau diubah.
2. Model batch, StockMovement, dan StockAllocation.
3. Algoritma FIFO dan cara perhitungan HPP.
4. Modul pembelian, penjualan, retur, dan penyesuaian yang selesai.
5. Implementasi notifikasi kedaluwarsa.
6. Endpoint API dan halaman yang dibuat.
7. Mekanisme otorisasi admin.
8. Hasil pengujian FIFO, retur, penyesuaian, dan kedaluwarsa.
9. Hasil type checking, lint, dan build.
10. Risiko migrasi, asumsi bisnis, atau fitur yang belum selesai.

**Batasan utama:** Jangan menghapus data yang sudah ada, jangan mereset database, jangan mengizinkan stok negatif, dan jangan mengklaim FIFO berfungsi sebelum pengujian alokasi batch dan perhitungan HPP berhasil.
