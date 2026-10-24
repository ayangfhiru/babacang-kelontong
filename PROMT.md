# Perbaikan Modul Stok, FIFO, dan Integrasi Barcode Scanner

## 1. Tujuan Pengerjaan

Lakukan audit dan perbaikan pada modul Stock atau Stok di aplikasi manajemen toko kelontong.

Saat ini masih terdapat error ketika melakukan penyesuaian stok. Selain itu, saya ingin proses penambahan jumlah stok dapat dilakukan menggunakan barcode scanner agar lebih cepat dan mengurangi kesalahan input produk.

Aplikasi menggunakan metode FIFO (First In, First Out). Oleh karena itu, setiap perubahan stok harus tetap konsisten dengan mekanisme FIFO yang sudah diterapkan pada sistem.

Fitur barcode scanner sebelumnya sudah dibuat dalam bentuk modal pop-up. Pertahankan implementasi dan desain modal tersebut jika sudah berfungsi dengan baik. Lakukan penyempurnaan pada indikator keberhasilan scan dan integrasinya dengan modul stok.

**Jangan membangun ulang aplikasi dari awal. Periksa kode yang sudah ada dan lakukan perubahan seminimal mungkin sesuai kebutuhan.**

## 2. Audit dan Perbaikan Error Penyesuaian Stok

Periksa seluruh implementasi penyesuaian stok, termasuk:

- Halaman penyesuaian stok.
- Form penyesuaian stok.
- Komponen modal dan komponen form terkait.
- API untuk penyesuaian stok.
- Validasi request.
- Service atau helper pengelolaan stok.
- Prisma schema dan relasi database.
- Transaksi database yang digunakan.
- Implementasi FIFO.
- Penanganan error di frontend dan backend.

Cari penyebab error yang sebenarnya sebelum melakukan perubahan.

Jangan hanya menyembunyikan pesan error atau mengganti notifikasi. Perbaiki akar permasalahannya.

Periksa kemungkinan masalah berikut apabila relevan dengan kode yang ditemukan:

1. Ketidaksesuaian tipe data frontend dan backend.
2. Validasi jumlah stok yang tidak sesuai.
3. Perhitungan stok fisik dan stok sistem yang keliru.
4. Kesalahan relasi antara produk dan batch stok.
5. Kesalahan pembaruan jumlah stok.
6. Kesalahan penggunaan Prisma.
7. Transaksi database yang tidak konsisten.
8. Kesalahan perhitungan selisih stok.
9. Kesalahan penanganan produk yang belum memiliki batch.
10. Kesalahan integrasi dengan mekanisme FIFO.
11. Kesalahan pada endpoint PATCH atau POST.
12. Kesalahan penanganan respons dan error API.

Sesuaikan pemeriksaan dengan implementasi aktual. Jangan menganggap semua kemungkinan tersebut pasti merupakan penyebab error.

### Ketentuan perbaikan

- Pertahankan fitur stok yang sudah berjalan dengan benar.
- Jangan menghapus riwayat penyesuaian stok.
- Jangan mengubah jumlah stok tanpa mencatat alasan dan pergerakannya.
- Tampilkan pesan error yang mudah dipahami pengguna.
- Catat detail teknis error di server tanpa mengekspos stack trace kepada pengguna.
- Gunakan transaksi database apabila operasi melibatkan beberapa perubahan yang harus berhasil atau gagal secara bersamaan.

Setelah diperbaiki, pastikan penyesuaian stok tidak menyebabkan selisih antara jumlah stok yang tercatat, jumlah stok fisik, dan jumlah stok dalam batch FIFO.

## 3. Penyesuaian Stok Harus Tetap Konsisten dengan FIFO

Periksa implementasi FIFO yang sudah digunakan dalam aplikasi.

Jangan membuat mekanisme FIFO baru apabila mekanisme yang sekarang sudah tersedia dan masih dapat digunakan.

Pastikan penyesuaian stok dibedakan berdasarkan jenis pergerakannya.

### A. Penambahan Stok

Ketika jumlah stok fisik lebih besar daripada stok sistem:

- Catat penambahan stok.
- Simpan alasan penyesuaian.
- Catat tanggal dan waktu transaksi.
- Catat pengguna yang melakukan penyesuaian jika sistem menyediakan informasi pengguna.
- Pastikan jumlah stok sistem diperbarui secara konsisten.
- Tentukan perlakuan terhadap batch FIFO sesuai model data yang sudah digunakan.

Jika stok tambahan berasal dari barang yang identitas batch dan tanggal kedatangannya tidak diketahui, jangan mengarang informasi batch atau tanggal penerimaan.

Gunakan kebijakan penyesuaian yang konsisten dengan desain inventaris saat ini. Jika perlu membuat batch penyesuaian baru, tandai sumbernya sebagai penyesuaian stok dan jangan menyamakannya dengan pembelian yang benar-benar terjadi.

### B. Pengurangan Stok

Ketika stok fisik lebih sedikit daripada stok sistem:

- Catat jumlah stok yang berkurang.
- Wajibkan alasan penyesuaian.
- Catat waktu dan pengguna yang melakukan penyesuaian jika tersedia.
- Pastikan pengurangan dialokasikan ke batch yang benar sesuai kebijakan inventaris.
- Pertahankan histori stok dan histori batch.

Jangan menghapus batch lama hanya untuk menyesuaikan jumlah stok.

Jika pengurangan stok perlu dialokasikan ke batch tertentu, gunakan aturan yang konsisten dan dapat diaudit.

### C. Aturan Penting FIFO

- Batch dengan tanggal penerimaan lebih awal harus diprioritaskan dalam pengeluaran stok.
- Batch yang sudah habis tidak boleh digunakan untuk pengeluaran berikutnya.
- Jangan menggunakan stok batch lain jika jumlah stoknya tidak mencukupi tanpa memperhitungkan batch tersebut.
- Jangan mengubah harga modal historis batch lama hanya karena ada penyesuaian stok.
- Pastikan perhitungan HPP dan histori pergerakan stok tetap konsisten dengan implementasi FIFO yang digunakan.
- Jika sistem memiliki tanggal kedaluwarsa, pertahankan informasi tersebut pada setiap batch yang relevan.
- Jangan mengubah tanggal penerimaan atau tanggal kedaluwarsa batch lama secara otomatis.

Jika struktur data saat ini belum mendukung suatu aturan, jelaskan keterbatasannya sebelum mengubah schema.

## 4. Penambahan Stok Menggunakan Barcode Scanner

Tambahkan fitur barcode scanner pada modul stok untuk mempercepat pencarian produk ketika pengguna melakukan penambahan stok.

Gunakan modal barcode scanner yang sudah tersedia.

Jangan membuat modal kedua yang menduplikasi fungsi scanner sebelumnya. Jika komponen scanner masih terikat langsung pada halaman produk, refactor seperlunya agar dapat digunakan kembali oleh modul stok tanpa merusak fitur yang sudah ada.

### Alur yang diinginkan

1. Pengguna membuka menu Stok.
2. Pengguna memilih tindakan penambahan stok.
3. Pengguna menekan tombol "Scan Barcode".
4. Modal scanner terbuka.
5. Kamera membaca barcode produk.
6. Sistem menampilkan hasil scan yang berhasil dibaca.
7. Pengguna memverifikasi barcode tersebut.
8. Sistem mencari produk berdasarkan barcode melalui API.
9. Jika produk ditemukan, sistem menampilkan informasi produk dan form penambahan stok.
10. Pengguna memasukkan jumlah stok tambahan dan data lain yang diwajibkan.
11. Pengguna memeriksa kembali data yang akan disimpan.
12. Pengguna menekan tombol Simpan.
13. Backend memvalidasi data dan menyimpan perubahan stok secara konsisten dengan FIFO.
14. Sistem menampilkan notifikasi keberhasilan atau kegagalan.

Jangan langsung menyimpan perubahan stok hanya karena barcode berhasil dipindai.

Barcode digunakan untuk mengidentifikasi produk. Penambahan stok tetap memerlukan input jumlah dan validasi data transaksi.

### Informasi produk yang ditampilkan

Setelah barcode berhasil dipindai dan produk ditemukan, tampilkan informasi yang tersedia dari database, seperti:

- Nama produk.
- Barcode.
- Kategori.
- Merek.
- Satuan.
- Stok saat ini.
- Jumlah yang akan ditambahkan.
- Informasi batch jika relevan dengan proses penambahan stok.
- Tanggal kedaluwarsa jika diwajibkan untuk batch tersebut.

Jangan menampilkan informasi yang tidak tersedia dalam schema atau tidak relevan dengan proses transaksi.

Jika barcode tidak ditemukan, tampilkan pesan bahwa produk belum terdaftar.

Jangan otomatis membuat produk atau batch stok hanya karena scanner berhasil membaca barcode.

## 5. Indikator Validasi Keberhasilan Barcode Scanner

Modal scanner saat ini sudah tersedia, tetapi belum memberikan penanda yang cukup jelas bahwa barcode benar-benar berhasil dipindai.

Sempurnakan modal dengan menambahkan status scan yang terlihat jelas.

### A. Status Awal: Menunggu Scan

Ketika modal dibuka:

- Tampilkan area kamera.
- Tampilkan teks "Arahkan kamera ke barcode produk".
- Tampilkan indikator bahwa scanner sedang menunggu barcode.
- Jangan menampilkan status berhasil sebelum scanner menghasilkan kode yang valid.

### B. Status Berhasil Scan

Ketika library scanner berhasil membaca barcode, ubah status modal secara langsung.

Tampilkan:

- Ikon centang atau indikator keberhasilan.
- Label "Barcode berhasil dipindai".
- Nilai barcode yang berhasil dibaca.
- Field input barcode yang terisi otomatis.
- Tombol "Verifikasi Barcode".
- Tombol "Scan Ulang" jika diperlukan.

Gunakan tampilan yang konsisten dengan desain aplikasi.

Contoh tampilan:

[ Ikon centang hijau ]

Barcode berhasil dipindai

Barcode:
[ 8991234567890 ]

[ Verifikasi Barcode ] [ Scan Ulang ]

Angka barcode pada contoh hanya ilustrasi.

**Penting:** status "Barcode berhasil dipindai" berarti scanner telah memperoleh hasil pembacaan yang valid. Status ini belum berarti produk ditemukan di database.

Pisahkan kedua kondisi tersebut.

### C. Status Verifikasi Produk

Setelah pengguna menekan tombol "Verifikasi Barcode":

- Kirim kode barcode ke API.
- Tampilkan indikator loading.
- Nonaktifkan tombol verifikasi selama request berlangsung.
- Cegah request ganda.
- Setelah API merespons, tampilkan hasil yang sesuai.

Jika produk ditemukan:

Tampilkan status "Produk ditemukan" disertai nama produk, barcode, dan stok saat ini.

Jika produk tidak ditemukan:

Tampilkan status "Produk tidak ditemukan" dan jangan membuka form penambahan stok untuk produk tersebut.

Jika API gagal:

Tampilkan status "Gagal memverifikasi barcode" beserta pesan yang sesuai.

Jangan menganggap kegagalan API sebagai bukti bahwa produk tidak ditemukan.

### D. Scan Ulang dan Edit Barcode

- Tombol Scan Ulang menghapus hasil scan sebelumnya dan mengaktifkan scanner kembali.
- Field barcode harus mengikuti aturan validasi yang sama dengan hasil scan.
- Jika barcode dapat diketik secara manual, bedakan status barcode hasil scan dan barcode input manual.
- Jangan menampilkan status "Berhasil dipindai" untuk barcode yang hanya diketik manual.
- Barcode yang diketik manual tetap dapat diverifikasi melalui API jika fitur tersebut memang diizinkan.
- Setelah pengguna mengganti kode barcode, batalkan hasil verifikasi sebelumnya dan lakukan verifikasi ulang.
- Jangan mempertahankan informasi produk lama setelah barcode diganti.

### E. Pencegahan Scan Berulang

Pastikan scanner tidak memproses kode yang sama berkali-kali dalam waktu singkat.

Setelah hasil scan diterima:

- Hentikan sementara pemrosesan hasil scanner.
- Hindari beberapa request API untuk satu hasil scan.
- Izinkan pengguna memulai scan ulang melalui tindakan yang jelas.
- Pastikan kamera berhenti ketika modal ditutup.
- Bersihkan stream kamera dan resource terkait saat komponen di-unmount.

## 6. Validasi Penambahan Stok

Pastikan form penambahan stok melakukan validasi sebelum data disimpan.

Ketentuan:

- Produk harus valid dan terdaftar.
- Jumlah penambahan harus berupa angka yang valid dan lebih besar dari nol.
- Gunakan tipe data yang sesuai dengan satuan produk dan schema database.
- Jangan menggunakan `Number()` tanpa memvalidasi input kosong.
- Validasi ulang seluruh data pada backend.
- Jangan mempercayai stok yang dikirim dari frontend sebagai nilai stok terbaru.
- Ambil data stok terbaru dari database ketika memproses transaksi.
- Tangani kondisi produk dihapus atau diubah ketika form masih terbuka.
- Cegah penyimpanan ganda akibat tombol Simpan ditekan berulang kali.

Jika proses penambahan stok memerlukan batch baru, pastikan data batch dibuat sesuai aturan inventaris.

Jangan mengubah penambahan stok menjadi transaksi pembelian palsu hanya untuk memperbarui jumlah stok.

Apabila penambahan stok berasal dari pembelian, gunakan alur pembelian yang sudah tersedia agar harga modal, supplier, batch, tanggal penerimaan, dan tanggal kedaluwarsa tetap konsisten.

## 7. Konsistensi Transaksi Database

Periksa operasi database yang terlibat dalam penyesuaian dan penambahan stok.

Jika suatu operasi mengubah beberapa tabel, pastikan seluruh perubahan yang saling bergantung diproses secara atomik menggunakan transaksi Prisma.

Contoh data yang mungkin terlibat, sesuai schema aktual:

- Jumlah stok produk.
- Batch stok.
- Riwayat pergerakan stok.
- Riwayat penyesuaian.
- Alokasi batch.
- Informasi transaksi terkait.

Jangan memperbarui sebagian data jika operasi lain yang diwajibkan gagal.

Periksa kemungkinan dua pengguna mengubah stok produk yang sama secara bersamaan. Gunakan strategi transaksi, locking, atau kontrol konkurensi yang sesuai dengan database dan implementasi Prisma saat ini.

Pastikan operasi yang gagal tidak meninggalkan data stok yang tidak konsisten.

Jangan menerapkan strategi locking atau isolation level tertentu tanpa memeriksa dukungan database dan konsekuensinya.

## 8. Standar Implementasi Kode

Ikuti konvensi proyek yang sudah ada.

- Gunakan Nuxt.js, Vue, TypeScript, Tailwind CSS, dan Prisma sesuai implementasi saat ini.
- Gunakan arrow function dengan `const`.
- Hindari deklarasi fungsi konvensional jika tidak diperlukan.
- Pisahkan `interface` dan `type` ke folder tipe yang sesuai dengan standar proyek.
- Gunakan alias `~` jika sesuai dengan konfigurasi.
- Pertahankan pola `index.ts` untuk barrel export pada folder yang menggunakannya.
- Gunakan komponen form dan notifikasi yang sudah tersedia.
- Hindari penggunaan `any`.
- Hindari duplikasi logic FIFO.
- Hindari membuat helper yang fungsinya sudah tersedia.
- Pertahankan batas tanggung jawab antara UI, API, validasi, dan service bisnis.
- Jangan menambahkan dependency jika fitur dapat dibuat dengan library yang sudah terpasang.
- Jika perlu menggunakan scanner yang sudah ada, manfaatkan komponen tersebut.

## 9. Pengujian Wajib

Lakukan pengujian untuk skenario berikut.

### Penyesuaian Stok

1. Menambah stok melalui penyesuaian.
2. Mengurangi stok melalui penyesuaian.
3. Menolak jumlah penyesuaian yang tidak valid.
4. Menangani produk yang belum memiliki batch.
5. Memastikan histori penyesuaian tercatat.
6. Memastikan kegagalan transaksi tidak menghasilkan perubahan sebagian.
7. Memastikan stok produk dan jumlah batch tetap konsisten.

### FIFO

8. Memastikan batch yang lebih lama diprioritaskan sesuai aturan FIFO.
9. Memastikan batch yang habis tidak digunakan lagi.
10. Memastikan pengurangan stok tidak membuat jumlah batch menjadi negatif.
11. Memastikan harga modal historis tidak berubah akibat penyesuaian stok.
12. Memastikan pergerakan stok tidak tercatat dua kali.

### Barcode

13. Membuka modal scanner dari modul stok.
14. Memindai barcode produk yang terdaftar.
15. Memastikan indikator scan berhasil tampil.
16. Memastikan barcode hasil scan ditampilkan dengan benar.
17. Memastikan informasi produk diperoleh dari database.
18. Memindai barcode yang tidak terdaftar.
19. Menangani kegagalan API saat verifikasi.
20. Memulai scan ulang.
21. Menutup modal dan memastikan kamera berhenti.
22. Memastikan satu hasil scan tidak menghasilkan beberapa request.
23. Memastikan barcode yang diedit tidak menggunakan hasil verifikasi lama.

### Penambahan Stok

24. Menambahkan stok menggunakan barcode.
25. Memastikan jumlah stok bertambah sesuai input.
26. Memastikan batch FIFO diperbarui atau dibuat sesuai aturan bisnis.
27. Memastikan data transaksi dan riwayat stok konsisten.
28. Mencegah penyimpanan ganda.
29. Memastikan validasi backend tetap berjalan meskipun frontend dimanipulasi.

Jalankan pemeriksaan TypeScript, lint, dan pengujian yang tersedia.

Jika ada pengujian yang tidak dapat dijalankan, jelaskan penyebabnya secara spesifik.

## 10. Batasan Pengerjaan

- Fokus pada perbaikan modul stok dan integrasi barcode.
- Jangan membangun ulang seluruh modul inventaris.
- Jangan merusak modul produk, pembelian, penjualan, atau retur.
- Jangan mengubah aturan FIFO tanpa alasan teknis yang jelas.
- Jangan menghapus histori transaksi.
- Jangan melakukan perubahan schema yang tidak diperlukan.
- Jangan menambahkan data dummy ke database produksi.
- Jangan menganggap semua error disebabkan oleh frontend.
- Jangan menyatakan masalah sudah selesai sebelum melakukan verifikasi.

## 11. Hasil Akhir

Setelah selesai, berikan laporan singkat yang berisi:

1. Penyebab utama error penyesuaian stok.
2. Perubahan kode yang dilakukan.
3. Penjelasan bagaimana FIFO tetap konsisten.
4. Cara kerja penambahan stok menggunakan barcode.
5. Perbedaan status scan berhasil dan produk berhasil diverifikasi.
6. File yang dibuat dan diubah.
7. Perubahan schema atau migration jika ada.
8. Hasil pemeriksaan TypeScript, lint, dan pengujian.
9. Masalah yang belum dapat diselesaikan beserta alasannya.

Mulai dengan mengaudit kode dan mereproduksi error yang ada. Setelah menemukan penyebabnya, lakukan perbaikan secara bertahap dan verifikasi hasilnya.
