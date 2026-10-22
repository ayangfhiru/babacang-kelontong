# Task: Fix PATCH and DELETE TypeScript Errors and Error Handling

Periksa dan perbaiki seluruh implementasi API `PATCH` dan `DELETE` pada proyek Nuxt.js ini. Jangan hanya memperbaiki endpoint `brands`; lakukan audit terhadap semua modul dan komponen yang menggunakan metode tersebut.

## 1. Perbaiki TypeScript Error pada `$fetch`

Contoh error:

```ts
await $fetch(`/api/brands/${editing.value.id}`, {
  method: "PATCH",
  body: values,
});
```

Error:

```text
Type '"PATCH"' is not assignable to type '"get" | "GET" | undefined'.
```

```text
Type '"DELETE"' is not assignable to type '"get" | "GET" | undefined'.
```

Kemungkinan penyebabnya adalah tipe HTTP method yang diinferensikan dari konfigurasi endpoint, tipe generik `$fetch`, atau deklarasi API yang tidak sesuai.

Ketentuan:

- Periksa versi Nuxt, ofetch, dan tipe API yang digunakan proyek.
- Periksa seluruh handler pada `server/api`, terutama endpoint dengan metode `PATCH` dan `DELETE`.
- Pastikan handler server menggunakan deklarasi HTTP method yang benar, misalnya `defineEventHandler` bersama `readBody`, `getRouterParam`, dan utilitas H3 yang sesuai dengan versi proyek.
- Periksa apakah endpoint sudah memiliki deklarasi tipe yang terlalu sempit sehingga hanya menerima `GET`.
- Perbaiki akar masalahnya, bukan sekadar menyembunyikan error dengan `as any`, `@ts-ignore`, atau menonaktifkan pemeriksaan TypeScript.
- Jangan mengubah semua request menjadi `GET` atau menghapus validasi tipe.
- Pertahankan tipe request dan response yang eksplisit serta konsisten dengan pola proyek.

Contoh request frontend yang harus tetap dapat digunakan:

```ts
await $fetch(`/api/brands/${editing.value.id}`, {
  method: "PATCH",
  body: values,
});
```

```ts
await $fetch(`/api/brands/${id}`, {
  method: "DELETE",
});
```

Contoh tersebut merupakan target perilaku, bukan asumsi bahwa semua endpoint harus menggunakan implementasi server yang sama. Sesuaikan dengan struktur proyek yang sebenarnya.

## 2. Audit Semua Modul

Periksa seluruh fitur CRUD yang sudah dibuat, termasuk tetapi tidak terbatas pada:

- Product
- Category
- Brand
- Unit
- Supplier
- Modul lain yang memiliki fitur update atau delete.

Cari seluruh penggunaan:

- `$fetch` dengan `method: "PATCH"`
- `$fetch` dengan `method: "DELETE"`
- Pemanggilan API melalui composable atau service
- Handler server yang menangani pembaruan dan penghapusan
- Tipe request/response yang berkaitan dengan operasi tersebut.

Perbaiki semua error yang memiliki akar masalah sama tanpa merusak modul yang sudah berfungsi.

## 3. Tambahkan Penanganan Error untuk PATCH dan DELETE

Pastikan setiap operasi update dan delete menangani kondisi berhasil maupun gagal.

Contoh pola penanganan pada frontend:

```ts
try {
  await $fetch(`/api/brands/${editing.value.id}`, {
    method: "PATCH",
    body: values,
  });

  // Jalankan notifikasi sukses dan pembaruan data
  // menggunakan mekanisme yang sudah ada di proyek.
} catch (error: unknown) {
  // Ubah error menjadi pesan yang aman dan informatif.
  // Tampilkan menggunakan mekanisme notifikasi proyek.
}
```

Untuk delete:

```ts
try {
  await $fetch(`/api/brands/${id}`, {
    method: "DELETE",
  });

  // Jalankan notifikasi sukses dan pembaruan data
  // menggunakan mekanisme yang sudah ada di proyek.
} catch (error: unknown) {
  // Tampilkan pesan error yang sesuai.
}
```

Jangan menyalin contoh di atas secara membabi buta. Integrasikan dengan composable, komponen notifikasi, dan pola pengelolaan state yang sudah digunakan.

### Ketentuan pesan error

- Gunakan pesan dari respons server apabila tersedia dan aman ditampilkan.
- Jika terjadi validasi gagal, tampilkan pesan validasi yang mudah dipahami.
- Jika data tidak ditemukan, tampilkan pesan yang sesuai.
- Jika terjadi konflik constraint atau relasi database, tampilkan pesan yang relevan tanpa membocorkan detail internal database.
- Jika jaringan bermasalah, tampilkan pesan koneksi yang sesuai.
- Jika penyebabnya tidak diketahui, gunakan pesan fallback yang ramah pengguna.
- Jangan menampilkan stack trace, query SQL, kredensial, atau detail internal server kepada pengguna.
- Gunakan `catch (error: unknown)` dan lakukan pemeriksaan tipe error secara aman. Jika proyek menggunakan `FetchError` dari ofetch, manfaatkan tipe tersebut sesuai versi yang terpasang.
- Jangan menggunakan `error.message` secara langsung tanpa memeriksa struktur error dan kesesuaian pesannya untuk pengguna.
- Pastikan notifikasi error tidak menampilkan pesan yang sama berkali-kali.
- Jangan menampilkan notifikasi sukses jika request gagal.

## 4. Periksa API Server

Untuk semua endpoint `PATCH` dan `DELETE`, pastikan:

- Parameter ID divalidasi sebelum query database.
- Data request divalidasi menggunakan mekanisme validasi yang sudah digunakan proyek.
- Operasi update dan delete menghasilkan status HTTP yang sesuai.
- Error database ditangani secara konsisten.
- Endpoint mengembalikan response yang sesuai dengan pola proyek.
- Jika menggunakan UUID, validasi format ID harus sesuai dengan skema database.
- Relasi dan constraint database tetap dihormati.
- Jangan menangkap error lalu mengembalikan status sukses secara keliru.

## 5. Konsistensi dan Reusability

Jika proyek sudah memiliki helper atau composable untuk:

- Menampilkan notifikasi
- Mengambil pesan error
- Menangani error `$fetch`
- Mengirim request API

Gunakan kembali implementasi tersebut.

Jika belum tersedia dan beberapa modul memerlukan logika identik, pertimbangkan membuat helper terpusat di `utils` atau composable sesuai struktur proyek. Hindari duplikasi kode di setiap halaman.

Ikuti konvensi `AGENTS.md`, termasuk penggunaan TypeScript eksplisit, struktur folder, dan ekspor melalui `index.ts` jika memang diwajibkan oleh proyek.

## 6. Verifikasi

Setelah perbaikan:

1. Jalankan pemeriksaan tipe TypeScript/Vue yang tersedia.
2. Jalankan lint dan build jika tersedia.
3. Validasi skema Prisma jika perubahan menyentuh skema.
4. Pastikan semua pemanggilan `PATCH` dan `DELETE` tidak lagi menghasilkan error tipe.
5. Pastikan error server benar-benar ditampilkan pada UI.
6. Uji skenario berhasil, validasi gagal, data tidak ditemukan, konflik database, dan kegagalan jaringan jika memungkinkan.

Jangan menyatakan pengujian berhasil jika belum dijalankan.

## Batasan

- Jangan menggunakan `any`, `@ts-ignore`, atau type assertion hanya untuk menghilangkan error.
- Jangan menonaktifkan pemeriksaan TypeScript.
- Jangan mengubah perilaku `GET`, `POST`, atau fitur lain yang tidak berkaitan.
- Jangan menghapus validasi atau mengubah status HTTP hanya untuk membuat build lolos.
- Jangan melakukan refactor besar di luar ruang lingkup.

## Laporan Akhir

Berikan ringkasan:

1. Akar penyebab error tipe HTTP method.
2. File yang diperbaiki.
3. Modul yang sudah diaudit.
4. Cara penanganan error `PATCH` dan `DELETE` yang diterapkan.
5. Hasil pemeriksaan TypeScript, lint, dan build.
6. Error yang masih tersisa jika ada.
