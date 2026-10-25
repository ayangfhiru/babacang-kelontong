# TASK: Perbaikan BaseSelect dan Optimalisasi UI Item Pembelian untuk Smartphone

Lakukan analisis dan implementasi perbaikan UI/UX pada seluruh halaman yang menggunakan `BaseSelect`, serta desain ulang bagian `Item Pembelian` pada halaman:

`pages/admin/transactions/purchases/create`

Gunakan struktur folder, komponen, style, dan pola arsitektur yang sudah diterapkan pada proyek.

Tujuan utama:

1. Memastikan dropdown `BaseSelect` dapat digunakan dengan nyaman pada smartphone.
2. Mengatasi dropdown yang terpotong atau tidak dapat di-scroll akibat `overflow-hidden` pada elemen parent.
3. Membuat penambahan item pembelian lebih praktis untuk pengguna smartphone.
4. Mempertahankan kenyamanan penggunaan pada desktop dan tablet.
5. Mempertahankan integrasi dengan API, database, validasi, dan aturan bisnis yang sudah ada.

Jangan hanya memberikan rekomendasi. Lakukan pemeriksaan kode, implementasikan perubahan, kemudian verifikasi hasilnya.

---

## A. ANALISIS AWAL

Sebelum melakukan perubahan:

1. Baca `AGENTS.md` dan seluruh aturan proyek.
2. Periksa implementasi `BaseSelect.vue`, termasuk versi atau implementasi Select2 yang saat ini digunakan.
3. Cari seluruh halaman dan komponen yang menggunakan `BaseSelect`.
4. Identifikasi penyebab dropdown tidak bisa di-scroll pada smartphone.
5. Periksa struktur layout, modal, card, drawer, dan container yang menggunakan:
   - `overflow-hidden`
   - `overflow-auto`
   - `overflow-y-auto`
   - `overflow-clip`
   - `position: relative`
   - `position: absolute`
   - `z-index`
   - CSS transform yang memengaruhi stacking context
6. Periksa apakah dropdown berada di dalam modal, drawer, form, tabel, atau container lain yang membatasi area tampilnya.
7. Periksa implementasi halaman `pages/admin/transactions/purchases/create`.
8. Identifikasi seluruh field item pembelian berdasarkan kode, validasi, API, Prisma schema, dan aturan bisnis yang sudah ada.
9. Periksa bagaimana subtotal, total kuantitas, pajak, diskon, dan total pembelian dihitung saat ini, jika fitur tersebut memang tersedia.
10. Periksa apakah proyek sudah memiliki komponen modal, toast, form, tombol, dan state-management yang bisa digunakan kembali.

Jangan menebak nama field atau membuat struktur data baru sebelum memeriksa implementasi yang ada.

Hindari membuat duplikasi komponen apabila komponen yang dibutuhkan sudah tersedia.

---

## B. PERBAIKAN GLOBAL BASESELECT

### 1. Masalah utama

Saat ini `BaseSelect` dapat digunakan dengan baik pada desktop dan tablet, tetapi dropdown bermasalah pada smartphone ketika daftar opsi panjang dan parent menggunakan `overflow-hidden`.

Perbaiki akar masalahnya agar tidak perlu membuat workaround berbeda pada setiap halaman.

### 2. Strategi implementasi

Evaluasi penggunaan Vue Teleport untuk merender dropdown di luar container yang membatasi overflow.

Jika sesuai dengan implementasi komponen yang ada:

- Gunakan `Teleport` ke `body` untuk dropdown yang perlu keluar dari batas container.
- Pastikan dropdown tidak terpotong oleh parent dengan `overflow-hidden`.
- Pertahankan hubungan antara input dan dropdown.
- Hitung posisi dropdown berdasarkan posisi aktual input.
- Sesuaikan posisi ketika halaman di-scroll atau ukuran viewport berubah.
- Pastikan dropdown tetap berada di dalam viewport.
- Jika ruang di bawah input tidak cukup, pertimbangkan menampilkan dropdown di atas input.
- Pastikan dropdown tidak tertutup oleh modal, drawer, sidebar, atau elemen lain.
- Kelola event listener dan observer dengan benar.
- Bersihkan event listener saat komponen di-unmount.
- Hindari manipulasi DOM yang tidak diperlukan.

Jangan langsung mengganti implementasi dengan native HTML `<select>` apabila hal tersebut menghilangkan fitur pencarian, Select2, styling, atau perilaku yang saat ini sudah digunakan.

Pilih solusi paling sesuai dengan teknologi yang sudah ada.

### 3. Perbaikan scroll dropdown

Dropdown harus memiliki batas tinggi yang mengikuti viewport.

Persyaratan:

- Gunakan `max-height` dinamis atau pendekatan lain yang sesuai.
- Gunakan `overflow-y-auto` pada elemen daftar opsi.
- Pastikan pengguna dapat melakukan scroll vertikal menggunakan sentuhan.
- Gunakan `overscroll-behavior` secara tepat agar scroll dropdown tidak selalu diteruskan ke halaman di belakangnya.
- Pastikan daftar opsi tetap dapat diakses ketika keyboard smartphone muncul.
- Pastikan opsi terakhir tetap dapat dijangkau.
- Jangan membuat dropdown lebih tinggi daripada ruang yang tersedia.
- Jangan menyebabkan seluruh halaman ikut bergeser secara tidak terkendali ketika pengguna menggulir daftar opsi.

Jika dropdown menggunakan pencarian, pastikan input pencarian tetap terlihat dan daftar opsi yang difilter dapat di-scroll.

### 4. Kompatibilitas

Pastikan:

- Dropdown dapat dibuka dan ditutup dengan benar.
- Pemilihan opsi memperbarui nilai model.
- `v-model` tetap berfungsi.
- Opsi yang dipilih tetap ditampilkan dengan benar.
- Fitur pencarian tetap berfungsi.
- Loading state, empty state, dan error state tetap bekerja jika tersedia.
- Navigasi keyboard dan aksesibilitas tetap terjaga.
- Klik di luar dropdown menutup dropdown tanpa mengganggu interaksi yang sah.
- Dropdown bekerja di dalam modal dan drawer.
- Tidak ada konflik antar-`BaseSelect` jika terdapat beberapa instance pada satu halaman.
- Tidak terjadi masalah saat form berada di dalam container yang memiliki scroll sendiri.

Jangan menghapus `overflow-hidden` dari semua parent secara global hanya untuk memperbaiki dropdown.

Perubahan layout harus dilakukan hanya jika memang diperlukan dan tidak merusak tampilan komponen lainnya.

### 5. Audit seluruh penggunaan BaseSelect

Setelah memperbaiki komponen utama:

- Periksa seluruh halaman yang menggunakan `BaseSelect`.
- Pastikan dropdown tidak terpotong pada berbagai struktur layout.
- Periksa penggunaan pada halaman create, edit, filter, modal, dan drawer jika tersedia.
- Perbaiki konfigurasi khusus hanya jika diperlukan.
- Hindari menambahkan kode workaround berulang pada masing-masing halaman.

Prioritaskan satu implementasi `BaseSelect` yang stabil dan dapat digunakan kembali.

---

## C. REDESAIN BAGIAN ITEM PEMBELIAN

Halaman utama:

`pages/admin/transactions/purchases/create`

Buat pengalaman pengguna yang lebih praktis, terutama pada smartphone, tanpa menghilangkan kenyamanan desktop dan tablet.

### 1. Pertahankan halaman transaksi utama

Jangan memindahkan seluruh form transaksi pembelian ke dalam modal.

Halaman utama tetap menjadi tempat untuk mengisi informasi transaksi dan meninjau seluruh item pembelian.

Pisahkan proses pengisian detail item ke dalam modal agar pengguna dapat menambahkan item satu per satu.

### 2. Desktop dan tablet

Pada layar yang memiliki ruang memadai:

- Pertahankan struktur halaman dan header yang sudah ada.
- Tampilkan bagian `Item Pembelian` sebagai section tersendiri.
- Tampilkan jumlah item yang sudah ditambahkan.
- Sediakan tombol `+ Tambah Item`.
- Tampilkan item dalam tabel apabila lebar viewport mencukupi.
- Pertahankan informasi penting seperti produk, kuantitas, harga beli, dan subtotal.
- Sesuaikan kolom dengan field yang benar-benar tersedia pada aplikasi.
- Sediakan aksi edit dan hapus untuk setiap item.
- Pastikan tabel tidak menyebabkan seluruh halaman melebar tanpa batas.

Gunakan modal berukuran proporsional untuk menambahkan atau mengedit item.

Jangan memaksakan modal layar penuh pada semua ukuran layar jika dialog biasa lebih nyaman digunakan pada desktop.

### 3. Smartphone

Pada layar kecil, gunakan layout satu kolom.

Bagian `Item Pembelian` harus menggunakan daftar kartu, bukan tabel dengan banyak kolom yang memaksa pengguna melakukan scroll horizontal.

Setiap kartu item menampilkan informasi utama yang mudah dipindai, seperti:

- Nama produk.
- SKU atau kode produk jika tersedia.
- Kuantitas.
- Satuan.
- Harga beli per unit.
- Subtotal item.
- Informasi batch atau kedaluwarsa jika memang relevan dengan implementasi saat ini.
- Tombol edit.
- Tombol hapus.

Jangan memaksakan seluruh informasi ke satu baris.

Gunakan susunan vertikal dengan label dan nilai yang jelas.

Nama produk yang panjang harus dapat membungkus baris tanpa merusak layout.

Tombol aksi harus mudah disentuh dan tidak saling berdekatan.

Hindari scroll horizontal pada kartu.

### 4. Modal tambah dan edit item

Buat alur penambahan item menggunakan modal yang responsif.

Pada smartphone:

- Modal memenuhi viewport atau menggunakan pola full-screen sheet yang sesuai.
- Gunakan area form yang dapat di-scroll secara vertikal.
- Pertimbangkan safe area perangkat.
- Pastikan tombol utama tidak tertutup keyboard virtual.
- Sediakan header yang jelas dengan judul `Tambah Item Pembelian` atau `Edit Item Pembelian`.
- Sediakan tombol kembali atau tutup.
- Tampilkan validasi dekat dengan field terkait.
- Hindari modal bertingkat yang tidak diperlukan.

Pada desktop dan tablet:

- Gunakan modal dengan lebar dan tinggi yang proporsional.
- Jika konten lebih tinggi daripada viewport, scroll hanya area konten modal.
- Pertahankan header dan footer modal agar aksi utama tetap mudah ditemukan jika memungkinkan.

Gunakan komponen modal proyek yang sudah tersedia jika sesuai.

Jangan membuat komponen modal baru apabila komponen yang ada sudah mendukung kebutuhan ini.

### 5. Field form item

Gunakan field yang benar-benar diperlukan berdasarkan implementasi pembelian saat ini.

Periksa apakah form membutuhkan:

- Produk.
- Kuantitas.
- Satuan.
- Harga beli.
- Diskon.
- Batch atau tanggal kedaluwarsa.
- Field lain yang sudah digunakan dalam skema database.

Jangan menambahkan field bisnis baru hanya karena terlihat berguna.

Untuk pemilihan produk, gunakan `BaseSelect` yang sudah diperbaiki.

Jika data produk yang dipilih memengaruhi satuan, harga, atau informasi lainnya, pertahankan atau perbaiki perilaku otomatis yang sudah ada.

Pastikan tipe input sesuai dengan data yang diharapkan, khususnya input numerik dan tanggal.

Jangan mengandalkan `placeholder` sebagai satu-satunya label input.

---

## D. STATE SEMENTARA ITEM PEMBELIAN

Ini merupakan bagian penting dari implementasi.

Item yang ditambahkan belum boleh langsung disimpan secara permanen ke database.

### 1. Alur tambah item

Ketika pengguna membuka modal dan mengisi form:

1. Form menggunakan state sementara untuk data item yang sedang diedit.
2. Validasi dilakukan sebelum item dimasukkan ke daftar.
3. Ketika pengguna menekan `Simpan Item`, validasi dijalankan.
4. Jika validasi berhasil, data item dimasukkan atau diperbarui di state daftar item pembelian.
5. Modal ditutup.
6. Ringkasan item, jumlah kuantitas, dan subtotal diperbarui.
7. Pengguna dapat menekan `+ Tambah Item` untuk menambahkan item lainnya.

Gunakan state management yang konsisten dengan pola Vue/Nuxt yang digunakan proyek.

Jangan mengubah objek form secara tidak sengaja ketika pengguna membuka atau membatalkan proses edit.

### 2. Alur edit item

Ketika pengguna memilih edit:

- Buka modal dengan data item yang dipilih.
- Salin data item ke state form sementara.
- Jangan langsung mengubah item asli saat pengguna mengetik.
- Ketika pengguna menekan `Simpan Item`, validasi dan perbarui item terkait.
- Ketika pengguna membatalkan, pertahankan data item asli.
- Jangan menambahkan item duplikat hanya karena pengguna mengedit item yang sudah ada.

Gunakan identitas sementara yang stabil untuk membedakan item, bukan mengandalkan posisi indeks array saja jika perubahan urutan atau penghapusan dapat terjadi.

### 3. Alur hapus item

Ketika pengguna menghapus item:

- Hapus item dari state sementara.
- Perbarui jumlah item dan ringkasan transaksi.
- Jika pola UI proyek menggunakan dialog konfirmasi untuk tindakan destruktif, gunakan pola yang sama.
- Jangan memanggil API penghapusan detail transaksi untuk item yang belum pernah disimpan ke database.

### 4. Perhitungan otomatis

Pastikan perhitungan berikut menggunakan logika bisnis yang sudah diterapkan:

- Subtotal item.
- Total kuantitas.
- Total seluruh item.
- Diskon dan pajak apabila tersedia.
- Total akhir pembelian.

Hindari duplikasi rumus pada beberapa komponen.

Gunakan helper atau computed state yang sesuai.

Pastikan perubahan kuantitas, harga, diskon, atau penghapusan item memperbarui ringkasan dengan benar.

Tangani nilai kosong dan input numerik secara aman.

Jangan sampai `Number("")` menghasilkan nilai yang membuat validasi keliru.

### 5. Simpan transaksi utama

Ketika pengguna menekan tombol simpan transaksi pembelian:

- Validasi informasi utama transaksi.
- Validasi seluruh item.
- Pastikan minimal satu item tersedia jika aturan bisnis mengharuskannya.
- Kirim seluruh item dan informasi transaksi melalui mekanisme API yang sudah digunakan proyek.
- Ikuti aturan backend mengenai transaksi database, stok, dan batch pembelian.
- Tampilkan loading state selama penyimpanan.
- Cegah pengiriman berulang ketika proses masih berjalan.
- Tampilkan notifikasi keberhasilan atau kegagalan.
- Arahkan pengguna ke halaman yang sesuai dengan pola aplikasi setelah transaksi berhasil.

Jangan membuat API atau mengubah kontrak payload tanpa memeriksa implementasi backend terlebih dahulu.

Jika API yang ada belum mendukung payload seluruh item dalam satu transaksi, identifikasi kebutuhan tersebut dan sesuaikan secara konsisten dengan validasi serta transaksi database yang benar.

Jangan mengirim item yang belum dikonfirmasi oleh pengguna.

---

## E. RINGKASAN DAN TOTAL TRANSAKSI

Buat ringkasan yang mudah dibaca pada halaman pembelian.

Informasi yang dapat ditampilkan jika sesuai dengan implementasi yang ada:

- Jumlah item.
- Total kuantitas.
- Subtotal.
- Diskon.
- Pajak.
- Total akhir.

Pada smartphone:

- Gunakan layout vertikal.
- Tampilkan total akhir dengan penekanan visual yang jelas.
- Hindari ringkasan yang menutupi kartu item.
- Jika menggunakan sticky footer, pastikan konten tidak tertutup dan area safe area perangkat diperhitungkan.
- Tombol simpan transaksi harus mudah ditemukan dan dijangkau.

Pada desktop dan tablet:

- Pertahankan susunan ringkasan yang sesuai dengan desain aplikasi.
- Jangan mengubah perhitungan bisnis yang sudah berjalan.

Pastikan nilai ringkasan dihitung dari state item yang sedang aktif.

---

## F. RESPONSIVE DESIGN DAN AKSESIBILITAS

Uji implementasi pada beberapa lebar viewport:

- Smartphone kecil: 320–375 px.
- Smartphone umum: 390–430 px.
- Tablet: sekitar 768 px.
- Desktop: 1024 px ke atas.

Angka tersebut merupakan target pengujian, bukan alasan untuk menambahkan breakpoint secara berlebihan.

Gunakan breakpoint Tailwind CSS yang sudah menjadi standar proyek.

Pastikan:

- Tidak ada elemen yang keluar dari viewport.
- Tidak ada scroll horizontal yang tidak diperlukan.
- Form menggunakan satu kolom pada smartphone.
- Teks panjang tidak merusak layout.
- Dropdown `BaseSelect` dapat di-scroll.
- Modal dapat di-scroll ketika kontennya panjang.
- Tombol tidak tertutup keyboard virtual.
- Tombol memiliki area sentuh yang memadai, idealnya sekitar 44 × 44 CSS pixel.
- Focus state tetap terlihat.
- Label dan pesan error dapat dibaca.
- Pengguna dapat membedakan tombol simpan, batal, edit, dan hapus.
- Tampilan desktop dan tablet yang sudah baik tidak mengalami regresi.

Jangan menggunakan `overflow-hidden` pada container form atau modal tanpa memahami dampaknya terhadap interaksi dan scroll.

---

## G. STANDAR KODE PROYEK

Ikuti ketentuan berikut:

1. Gunakan Vue 3, Nuxt.js, TypeScript, dan Tailwind CSS sesuai implementasi yang sudah ada.
2. Gunakan arrow function untuk fungsi baru.
3. Letakkan deklarasi `interface` dan `type` pada folder tipe terpisah sesuai standar proyek.
4. Pertahankan penggunaan alias `~` dan struktur export `index.ts` sesuai `AGENTS.md`.
5. Gunakan komponen bersama jika memang sudah tersedia.
6. Jangan menggunakan `any` untuk mengatasi masalah tipe.
7. Hindari duplikasi logika perhitungan.
8. Hindari menambahkan dependensi baru jika solusi dapat diterapkan dengan dependensi yang sudah ada.
9. Jangan mengubah struktur database jika perubahan tersebut tidak diperlukan.
10. Jika perubahan API atau database memang diperlukan, jelaskan alasannya dan sesuaikan seluruh implementasi terkait.
11. Pertahankan nama field, format payload, dan aturan validasi yang kompatibel dengan backend.
12. Jangan menghapus fitur yang sudah berjalan hanya untuk menyederhanakan UI.

---

## H. PENGUJIAN DAN VERIFIKASI

Setelah implementasi:

### Pengujian BaseSelect

- Buka dropdown pada smartphone.
- Scroll daftar opsi yang panjang.
- Pilih opsi paling bawah.
- Uji pencarian jika tersedia.
- Uji dropdown di dalam modal.
- Uji dropdown di dalam container `overflow-hidden`.
- Uji ketika halaman digulir.
- Uji ketika keyboard virtual muncul.
- Pastikan dropdown tidak terpotong dan tidak tertutup elemen lain.
- Periksa halaman lain yang menggunakan komponen ini.

### Pengujian pembelian

- Buka halaman create purchase.
- Tambahkan satu item.
- Tambahkan beberapa item.
- Edit item yang sudah ditambahkan.
- Batalkan edit dan pastikan data awal tidak berubah.
- Hapus item.
- Pastikan subtotal dan total diperbarui.
- Coba simpan item dengan input tidak valid.
- Pastikan item belum disimpan ke database hanya karena tombol `Simpan Item` ditekan.
- Simpan transaksi utama dan pastikan payload sesuai kontrak API.
- Uji respons ketika API gagal.
- Pastikan pengguna tidak kehilangan data form akibat interaksi yang tidak disengaja.

### Pengujian teknis

Jalankan pemeriksaan yang relevan dan tersedia di proyek, seperti:

- TypeScript atau `vue-tsc`.
- ESLint.
- Unit test jika tersedia.
- Build Nuxt.

Jangan mengklaim pemeriksaan berhasil jika perintahnya belum dijalankan.

Jika ditemukan error, perbaiki error yang disebabkan perubahan ini dan jelaskan jika terdapat error lama yang tidak berkaitan.

---

## I. OUTPUT YANG DIHARAPKAN

Setelah selesai, berikan ringkasan:

1. Penyebab utama masalah scroll `BaseSelect`.
2. Solusi teknis yang diterapkan.
3. Daftar halaman atau komponen yang diperbaiki.
4. Perubahan UX pada bagian `Item Pembelian`.
5. Cara state sementara item dikelola.
6. Perubahan API atau database jika memang diperlukan.
7. Hasil pemeriksaan TypeScript, lint, test, dan build.
8. Masalah yang masih belum terselesaikan, jika ada.

Prioritaskan solusi yang dapat digunakan kembali, mudah dirawat, dan nyaman pada smartphone.

Jangan hanya mengubah tampilan tanpa memperbaiki akar masalah interaksi.

Jangan merombak keseluruhan aplikasi di luar ruang lingkup tugas ini.
