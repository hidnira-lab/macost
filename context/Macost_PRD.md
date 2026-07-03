# Product Requirements Document — Macost

**Zephyπa • Kelompok 3 (D)**
*03/07/2026 – Product Requirements Document – Final*

> Sistem Informasi Manajemen (MIS) saku yang membantu mahasiswa mengubah pengeluaran tanpa tujuan menjadi tabungan terencana melalui alokasi cerdas dan wawasan berbasis AI.

| Field | Detail |
|---|---|
| **Version** | Final |
| **Date** | 3 Juli 2026 |
| **Team** | Zephyra: Hidayat Nur Hijrah (24523201) · Fertika Indri Dhamaningrum (24523160) · Khaliza Zarra Hayatha Setyo (24523191) · Khayyiratri Anindita (24523125) |
| **Product Owner** | Zephyra Team |
| **Client / Stakeholder** | Mahasiswa (*end-user*) |
| **Status** | *Approved* |

### About This Document

PRD ini menjelaskan **Macost**, sebuah *Pocket Management Information System* yang membantu mahasiswa, khususnya yang memiliki kombinasi *fixed allowance* (uang bulanan) dan masukan tambahan atau *side income* (freelance/part-time) dalam mengelola keuangannya secara lebih terarah. Dokumen ini merumuskan masalah yang diselesaikan, objektif produk, metrik keberhasilan, batasan ruang lingkup (MVP), *functional & non-functional requirements*, alur kerja krusial pengguna (*user workflows*), pertimbangan desain (UI/UX), model data, hingga rencana rilis. Seluruh keputusan dalam dokumen ini berbasis pada Problem Validation yang telah dilakukan (desk research + field research, n=62).

---

# Part I · Problem, Objectives, & Scope

## I. Problem Statement

### I.I. Background & Context

Side income mahasiswa cenderung melebur ke pengeluaran tidak produktif bukan karena kurangnya separasi tempat penyimpanan (*allowance* vs *side income* bisa saja sudah dipisah secara fisik/rekening), melainkan karena tidak adanya *goal* yang konkret dan personal yang membuat uang tersebut untuk digunakan ke mana. Tanpa tujuan yang jelas, uang yang disisihkan tidak memiliki alasan kuat untuk tidak diambil kembali saat ada keinginan/kebutuhan jangka pendek, artinya uang yang ada hanya tertunda sesaat.

Temuan ini didukung kuat oleh Problem Validation yang telah tim kami lakukan:

- Dalam temuan *desk research* (6 *paper*) yang telah kami lakukan, memvalidasi bahwa literasi keuangan bukan prediktor utama perilaku konsumtif (berdasarkan sumber Putri et al., 2025 menyatakan hanya ~7,6% pengaruh); gaya hidup berpengaruh lebih besar dari literasi (Rachman et al., 2024); *mental accounting* dan goal konkret terbukti menjadi penentu kemampuan mengelola keuangan (Candrakusuma & Dewinda, 2024).
- Dalam temuan *field research* (survey, n=62) yang telah kami lakukan, sebanyak 95,1% responden mengaku punya niat menyisihkan uang tapi tetap terpakai untuk hal lain dengan mayoritas karena kebutuhan mendadak (74,1%).

### I.II. Problem Statement

Mahasiswa, khususnya yang memiliki kombinasi *fixed allowance* (uang bulanan) dan *side income* (freelance/part-time), kesulitan mengelola keuangannya secara sehat. Uang yang masuk, terutama *side income* yang sifatnya fleksibel, jarang dialokasikan secara sadar untuk tujuan produktif (nabung terarah, goal jangka panjang, eksplorasi investasi pemula). Sebaliknya, uang itu cenderung melebur ke pengeluaran harian tanpa disadari, bukan karena keputusan sadar, tapi karena tidak adanya kebiasaan dan sistem pendukung yang membuat alokasi itu terasa mudah dan jelas.

Mengapa masalah ini bertahan padahal sudah banyak aplikasi finance tracker? Dua alasan yang dikonfirmasi survey:

1. **Pencatatan manual terlalu effortful.** 57,4% responden pernah mencoba aplikasi keuangan, tetapi 64,9% di antaranya berhenti karena alasan utama, yaitu input yang terlalu kompleks (~47%).
2. **Data tanpa arah.** Laporan hanya menunjukkan rekapan angka tanpa menerjemahkannya menjadi keputusan konkret (~19% berhenti karena laporan tidak memberikan informasi yang mempunyai efek signifikan).

### I.III. Who is Affected?

**Pengguna utama:** Mahasiswa aktif berusia ~18–23 tahun dengan kombinasi sumber pemasukan *fixed allowance* bulanan (uang tetap dari orang tua/keluarga) dan *side income* tidak tetap (freelance/part-time). Berikut karakteristik pengguna yang telah dikonfirmasi oleh survey oleh tim kami lakukan (n=62):

- *Allowance* mencukupi kebutuhan dasar dengan *side income* mempunyai ruang yang lebih besar untuk dialokasikan ke hal-hal produktif, namun dengan catatan bahwa dalam praktiknya jarang demikian.
- 63,9% responden pernah memiliki side income dalam 3 bulan terakhir.
- Pernah mencoba aplikasi pencatatan keuangan, tetapi berhenti memakainya.
- Punya niat menabung tetapi tanpa goal konkret, sehingga niat itu sering tidak terealisasi.

## II. Objectives

### II.I. Business Objectives

| # | Objective | Why it Matters | Success Indicator |
|---|---|---|---|
| 1 | Membantu mahasiswa mengelola *fixed allowance* dan *side income* secara lebih terarah. | Mahasiswa sering kesulitan mengalokasikan pemasukan (terutama *side income*) untuk tujuan produktif. | Persentase pengguna yang berhasil membuat dan mengelola minimal satu *financial goal*. |
| 2 | Membantu pengguna mengambil keputusan keuangan melalui rekomendasi *Smart Allocation*. | Aplikasi pencatatan umumnya hanya menampilkan data tanpa memberikan arahan. | Persentase pengguna yang menggunakan rekomendasi *Smart Allocation* saat menerima pemasukan baru. |
| 3 | Meningkatkan kebiasaan pengelolaan keuangan melalui visualisasi progres goal. | Visualisasi progres diharapkan meningkatkan motivasi dan konsistensi (didukung Rosalina et al., 2021). | Persentase pengguna yang tetap aktif menggunakan aplikasi selama periode tertentu. |

### II.II. User Objectives

| Actor | What they need to accomplish | What stops them today |
|---|---|---|
| Mahasiswa | Mencatat transaksi dengan mudah dari berbagai sumber pemasukan. | Input transaksi manual membutuhkan waktu sehingga sering diabaikan. |
| Mahasiswa | Menetapkan dan memantau goal keuangan yang jelas. | Belum memiliki sistem yang membantu menentukan dan memantau target keuangan. |
| Mahasiswa | Mengalokasikan side income secara lebih produktif. | Side income sering habis untuk pengeluaran sehari-hari tanpa perencanaan. |
| Mahasiswa | Memahami kondisi keuangan melalui insight yang mudah dipahami. | Sebagian besar aplikasi hanya menampilkan laporan tanpa rekomendasi tindakan. |

## III. Success Metrics

| Metric | Baseline | Target (3 Bulan) | How it is measured |
|---|---|---|---|
| **Smart Allocation Acceptance Rate** [persentase saran alokasi yang disetujui pengguna] | 0% (belum ada sistem) | ≥ 75% saran alokasi (F5) disetujui (tidak diabaikan/ditolak) | Jumlah klik konfirmasi pada pop-up *suggested allocation* ÷ total saran yang dimunculkan |
| **Automated Input Adoption** [rasio penggunaan input otomatis (scan struk & e-statement) vs manual] | 100% manual (kebiasaan awal) | ≥ 60% transaksi dicatat lewat fitur ekstraksi AI/otomatis (F1) | Jumlah transaksi berlabel sumber scan/e-statement ÷ total transaksi masuk per bulan |
| **Goal Adherence / Progress Rate** [persentase pengguna aktif yang rutin mengalokasikan uang ke goal] | N/A (belum ada pencatatan berbasis goal) | ≥ 80% pengguna aktif memiliki minimal 1 goal (F3) dengan progres saldo bertambah tiap bulan | Dashboard MIS: pengecekan status progress gap pada tabel goal pengguna |
| **Tingkat retensi pengguna** [persentase pengguna yang masih aktif setelah periode awal] | Tingkat abandonment tinggi (studi Shifa & Hwihanus, 2025) | ≥ 50% pengguna masih aktif di minggu ke-4 | Session log: DAU/WAU per kohort minggu pertama; aktif jika input ≥ 1 transaksi per minggu |
| **Completion rate input transaksi** [persentase sesi input yang selesai tersimpan] | N/A (tidak ada sistem sebelumnya) | ≥ 85% sesi input berhasil tersimpan | TPS log (F1): transaksi dengan status *saved* ÷ total sesi input dimulai |

## IV. Scope

### IV.I. In Scope & Out of Scope (MVP)

| ✓ In Scope (MVP) | ✗ Out of Scope (v1) | Alasan di luar batasan |
|---|---|---|
| Input transaksi manual, scan struk, dan upload e-statement dengan AI parsing otomatis (F1). | Fitur edukasi & simulasi investasi pemula (reksadana, emas, dll.) (F8). | Menambah kompleksitas konten finansial di luar masalah inti, namun tetap menjadi catatan untuk pengembangan lanjutan. |
| Dashboard keuangan: breakdown kategori pengeluaran, tren bulanan, progres goal, dll. (F2). | Goal-locking berbasis Web3 / on-chain (F9). | Bersifat eksploratif, bukan kebutuhan dari *problem statement* dan dapat berisiko menyita waktu *sprint*. |
| Goal setting & tracking: nama goal, nominal target, deadline, progres per goal (F3). | Fitur komunitas / berbagi progres goal antar pengguna (F10). | Dalam riset Shifa & Hwihanus, 2025 menemukan pengaruh sosial tidak signifikan terhadap pengendalian diri finansial. |
| Goal prioritization dengan metode MADM/SAW (F4). | Integrasi API resmi perbankan atau e-wallet. | Akses API resmi butuh proses partnership/biaya; tidak feasible dalam timeline. Digantikan upload e-statement. |
| Smart Allocation suggestion: rekomendasi alokasi side income (*suggest & confirm*, bukan *auto-execute*) (F5). | Sinkronisasi otomatis transaksi real-time tanpa input pengguna. | Bergantung pada integrasi API bank/e-wallet yang sudah di luar scope. |
| AI Financial Assistant: insight berbahasa natural satu arah dari data MIS (F6). | Chat interaktif multi-turn dengan AI Assistant. | Menambah kompleksitas *conversation state* & context; insight satu arah sudah cukup menjawab masalah data yang tidak memberikan informasi apa-apa. |
| Quick Access Panel di tampilan Home (setelah login): shortcut visual ke fitur utama (tambah transaksi, scan struk, lihat goal aktif teratas, ringkasan saldo) — terinspirasi dari pola navigasi cepat Livin by Mandiri. Panel ini bagian dari Home screen dan dikerjakan sebagai Should Have. (F8-QA) | - | - |
| Visual progress pixel-art sebagai representasi motivasi progres goal (F7). | Multi-currency support. | Target pengguna (mahasiswa Indonesia) bertransaksi dalam Rupiah; multi-currency tidak relevan untuk MVP. |
| - | AI Agent Chatbot (F11): antarmuka percakapan berbasis AI yang memungkinkan pengguna mengeksekusi aksi keuangan (catat transaksi, scan struk, tanya kondisi keuangan) langsung via chat; dapat diakses dari Quick Access Panel. Dikembangkan setelah MVP jadi (stretch goal post-MVP). | Secara arsitektur jauh lebih kompleks dari insight satu arah (F6) karena membutuhkan conversation state, tool-calling ke API internal, dan orkestrasi multiturn. Masuk stretch goal pasca-MVP agar tidak membebani sprint inti. |

### IV.II. Assumption & Constraints

| Type | Description |
|---|---|
| Assumption | Pengguna adalah mahasiswa aktif berusia 18–23 tahun dengan minimal satu sumber pemasukan tambahan di luar *allowance* rutin. |
| Assumption | Pengguna memiliki smartphone dengan kamera yang dapat digunakan untuk fitur scan struk (F1). |
| Assumption | Pengguna bersedia menginput transaksi secara manual untuk transaksi tanpa dokumen fisik (cash). |
| Assumption | Smart Allocation (F5) hanya bersifat rekomendasi; keputusan akhir alokasi tetap di tangan pengguna (*suggest & confirm*). |
| Constraint | Fitur scan struk dan AI Financial Assistant bergantung pada kualitas & availability layanan AI vision/LLM pihak ketiga. Harus tersedia fallback manual jika API gagal. |
| Constraint | MVP harus siap untuk demo pada Project EXPO 14 Juli 2026, dengan MVP Release pada 9–10 Juli 2026. |
| Constraint | Bobot kriteria MADM (F4) sudah diturunkan dari survey n=62; opsi adjust bobot manual tetap tersedia sebagai fallback individual. |

---

# Part II · Functional Requirements & Workflows

## V. Functional Requirements

### V.I. FR Table: Mahasiswa (Pengguna Utama)

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
|---|---|---|---|---|---|
| FR-001 | Mahasiswa | Memungkinkan pengguna menyimpan data transaksi (pemasukan/pengeluaran) secara manual. | Saat pengguna menekan 'Simpan' pada form input transaksi. | Critical | M |
| FR-002 | Sistem | Mengekstrak data transaksi (nominal, tanggal, merchant) secara otomatis dari foto struk yang diunggah. | Saat pengguna memfoto/mengunggah struk pada fitur Scan Struk. | High | M |
| FR-003 | Sistem | Mengekstrak & mengklasifikasikan data transaksi dari file e-statement yang diunggah. | Saat pengguna mengunggah file e-statement (PDF). | High | M |
| FR-004 | Mahasiswa | Memungkinkan pengguna mengoreksi hasil ekstraksi otomatis sebelum data tersimpan. | Saat sistem menampilkan hasil ekstraksi dari scan struk atau e-statement. | High | M |
| FR-005 | Sistem | Memisahkan & melabeli pemasukan secara otomatis sebagai *allowance* atau *side income* berdasarkan kategori yang dipilih. | Saat transaksi pemasukan baru tersimpan. | High | M |
| FR-006 | Sistem | Menampilkan dashboard keuangan: breakdown kategori pengeluaran, tren bulanan, total saldo, dan alert overspending. | Saat pengguna membuka tab Dashboard. | Critical | M |
| FR-007 | Mahasiswa | Memungkinkan pengguna membuat goal keuangan baru (nama, nominal target, deadline). | Saat pengguna menekan 'Buat Goal Baru'. | Critical | M |
| FR-008 | Sistem | Menampilkan progres terkini setiap goal (nominal terkumpul vs target). | Saat pengguna membuka halaman Goal Tracking. | High | M |
| FR-009 | Sistem | Menghasilkan urutan prioritas goal secara otomatis menggunakan algoritma SAW berdasarkan 5 kriteria (urgency, progress gap, nominal, personal importance, kemampuan menabung). | Saat ada pemasukan baru atau saat pengguna memperbarui data goal. | High | M |
| FR-010 | Sistem | Menampilkan saran alokasi pemasukan baru ke goal yang diprioritaskan berdasarkan hasil FR-009. | Saat pemasukan baru (terutama side income) berhasil dicatat. | Critical | M |
| FR-011 | Mahasiswa | Memungkinkan pengguna mengonfirmasi, mengubah nominal, atau mengabaikan saran alokasi sebelum dana dialokasikan. | Saat sistem menampilkan saran alokasi dari FR-010. | Critical | M |
| FR-012 | Sistem | Menghasilkan insight & rekomendasi keuangan berbahasa natural (satu arah) berdasarkan data MIS pengguna. | Saat pengguna membuka AI Financial Assistant. | High | M |
| FR-013 | Mahasiswa | Memungkinkan pengguna memilih strategi prioritas goal (Quick Win default / Importance-First). | Saat pengguna mengakses pengaturan Goal Prioritization. | Medium | S |
| FR-014 | Mahasiswa | Memungkinkan pengguna menyesuaikan bobot kriteria prioritas goal secara manual. | Saat pengguna mengakses pengaturan Goal Prioritization. | Medium | S |
| FR-015 | Sistem | Menampilkan visualisasi progres goal dalam bentuk pixel art yang berkembang sesuai persentase progress. | Saat persentase progres suatu goal berubah. | Medium | S |
| FR-018 | Sistem | Menampilkan Quick Access Panel di halaman Home (setelah login) yang berisi shortcut ke: tambah transaksi, scan struk, goal aktif teratas (nama + progress %), dan ringkasan saldo terkini. | Saat pengguna membuka halaman Home setelah login. | Medium | S |
| FR-019 | Sistem | Menyediakan antarmuka AI Agent Chatbot yang memungkinkan pengguna mengeksekusi aksi keuangan (catat transaksi, scan struk, tanya kondisi keuangan) via percakapan natural berbahasa Indonesia. Dapat diakses sebagai salah satu shortcut di Quick Access Panel (FR-018). | Saat pengguna membuka fitur AI Agent dari Quick Access Panel. | Low | C |

### V.II. FR Table: Sistem (Background Processes)

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
|---|---|---|---|---|---|
| FR-016 | Sistem | Menyimpan data transaksi secara lokal (cache) saat koneksi terputus dan menyinkronkannya ke server saat koneksi kembali. | Saat pengguna menyimpan transaksi dalam kondisi offline. | High | S |
| FR-017 | Sistem | Menyediakan fallback input manual atau template response apabila API AI vision/LLM gagal merespons dalam batas waktu. | Saat API AI vision (scan) >10 detik atau API LLM (assistant) >15 detik tidak merespons. | High | M |

### MoSCoW Summary

| MoSCoW | FR ID | Description |
|---|---|---|
| Must Have (M) | FR-001 s.d. FR-012, FR-017 | Seluruh alur inti pencatatan transaksi (manual / scan / e-statement), pelabelan allowance vs side income, dashboard & tren (MIS), goal setting & tracking, goal prioritization (SAW), Smart Allocation suggest & confirm, AI Assistant, serta fallback API. |
| Should Have (S) | FR-013 (toggle strategi Quick Win/Importance-First), FR-014 (adjust bobot manual), FR-015 (pixel art visual progress), FR-016 (offline sync), FR-018 (Quick Access Panel di Home) | Meningkatkan kualitas pengalaman & retensi, namun tidak memblokir fungsi inti. |
| Could / Won't Have (MVP) | Fitur Stretch F8–F10 (edukasi & simulasi investasi, goal-locking Web3, komunitas), FR-019 (AI Agent Chatbot — dikembangkan setelah MVP jadi, stretch goal post-MVP) | Di luar *scope* MVP. |

## VI. User Workflows

### VI.I. Workflow: Input Transaksi Side Income & Smart Allocation

| | |
|---|---|
| **Actor** | Mahasiswa dengan side income aktif. |
| **Goal** | Mencatat pemasukan side income dan mengalokasikannya ke goal dengan cepat tanpa friction. |
| **FRs Covered** | FR-001, FR-005, FR-009, FR-010, FR-011, FR-015. |

**Ideal Path**

| # | Step Description |
|---|---|
| 1 | User menerima pembayaran dari klien freelance. User membuka Macost dan mengetuk tombol tambah transaksi (+). |
| 2 | User memilih metode input Manual. User mengisi nominal, memilih kategori Pemasukan, dan menandai sumber sebagai Side Income. |
| 3 | User mengetuk Simpan. Sistem mencatat transaksi dan memperbarui dashboard MIS (total saldo, breakdown side income). |
| 4 | Sistem memicu *smart allocation engine* (FR-010). Dalam ≤ 2 detik muncul pop-up: "*Side income Rp500.000 masuk. Alokasikan ke [Laptop Baru] (prioritas tertinggi)? Saran: Rp175.000 (≈35%).*" |
| 5 | User meninjau saran alokasi. User dapat mengonfirmasi, mengubah nominal, atau menolak. User mengetuk Konfirmasi. |
| 6 | Sistem mengalokasikan dana ke goal Laptop Baru, memperbarui progres goal & visual pixel-art. Notifikasi singkat muncul: "*Rp175.000 dialokasikan ke Laptop Baru.*" |

**Decision Points**

| Decision Point | YES / Success PATH | No / Error PATH |
|---|---|---|
| Transaksi ber-tag Side Income? | Trigger smart allocation engine otomatis. | Tidak ada pop-up alokasi. Transaksi dicatat biasa. |
| Ada goal aktif yang telah di-ranking? | Tampilkan saran alokasi ke goal prioritas teratas. | Tampilkan prompt untuk membuat goal terlebih dahulu sebelum alokasi. |
| User mengonfirmasi saran alokasi? | Alokasikan dana, perbarui progres goal & visual. | Tidak ada alokasi. Transaksi tetap tercatat sebagai pemasukan; user dapat alokasi manual kapan saja. |

**Edge Cases**

| Edge Case | What the system must do |
|---|---|
| Saran alokasi melebihi sisa dana tersedia. | Sistem otomatis menyesuaikan saran agar tidak melebihi saldo tersedia. |
| User memiliki lebih dari 5 goal aktif. | Tampilkan hanya 3 goal teratas berdasarkan ranking SAW di pop-up, dengan opsi "Lihat semua goal". |
| Pop-up alokasi diabaikan (ditutup tanpa aksi). | Saran disimpan sebagai *pending suggestion*, dapat diakses kembali dari halaman notifikasi dalam 24 jam. |
| Default alokasi (≈30–40%). | Sistem menyarankan ≈35% dari nominal side income (berdasar survei n=62, rata-rata skala 3,33/5), bukan 100% paksa nabung. |

### VI.II. Workflow: Input Transaksi Manual

| | |
|---|---|
| **Actor** | Pengguna yang ingin mencatat transaksi tanpa dokumen fisik (mis. bayar cash, transfer antar teman). |
| **Goal** | Mencatat transaksi pengeluaran atau pemasukan secara cepat lewat form manual. |
| **FRs Covered** | FR-001, FR-005, FR-006 |

**Ideal Path**

| # | Step Description |
|---|---|
| 1 | User baru saja membayar kos secara tunai. User membuka Macost dan mengetuk tombol tambah transaksi (+). |
| 2 | Sistem menampilkan pilihan metode input. User memilih Input Manual. |
| 3 | User mengisi form: nominal (wajib), jenis transaksi (Pengeluaran/Pemasukan), kategori (mis. Tempat Tinggal), tanggal (default: hari ini), dan catatan opsional. |
| 4 | Jika jenis transaksi adalah Pemasukan, user juga memilih sumber: Allowance atau Side Income. |
| 5 | User mengetuk Simpan. Sistem memvalidasi form (minimal: nominal & jenis transaksi terisi). |
| 6 | Sistem menyimpan transaksi, memperbarui dashboard MIS, dan kembali ke halaman utama. Jika transaksi Side Income, sistem memicu smart allocation engine (lihat Workflow 6.1). |

**Decision Points**

| Decision Point | YES / Success PATH | No / Error PATH |
|---|---|---|
| Form valid? (nominal terisi, jenis transaksi dipilih). | Simpan transaksi & perbarui dashboard. | Tampilkan *inline error* pada field kosong. Tombol Simpan nonaktif hingga field wajib terisi. |
| Jenis = Pemasukan & sumber = Side Income? | Trigger smart allocation engine setelah disimpan. | Transaksi disimpan biasa tanpa memicu alokasi. |

**Edge Cases**

| Edge Case | What the system must do |
|---|---|
| User menutup aplikasi di tengah pengisian form. | Simpan draft form secara lokal (auto-save) agar data tidak hilang. |
| User memasukkan nominal format tidak valid (huruf/simbol). | Field nominal hanya menerima angka; blokir input non-numerik real-time. |
| Tanggal yang dipilih di masa depan. | Tampilkan peringatan "Tanggal transaksi di masa depan. Yakin ingin menyimpan?" dan minta konfirmasi. |
| Transaksi sama dicatat dua kali dalam waktu singkat. | Deteksi kemungkinan duplikat (nominal & kategori sama dalam 1 menit); minta konfirmasi sebelum menyimpan entri kedua. |

### VI.III. Workflow: Scan Struk & Verifikasi Transaksi

| | |
|---|---|
| **Actor** | Pengguna yang ingin mencatat pengeluaran dari struk fisik. |
| **Goal** | Mencatat transaksi pengeluaran dengan effort minimal menggunakan kamera. |
| **FRs Covered** | FR-002, FR-004, FR-017 |

**Ideal Path**

| # | Step Description |
|---|---|
| 1 | User baru berbelanja dan memegang struk. User membuka Macost, mengetuk tambah transaksi, lalu memilih metode Scan Struk. |
| 2 | Aplikasi mengaktifkan kamera. User memotret struk. Sistem mengunggah gambar ke AI vision API untuk diproses. |
| 3 | Dalam 5–10 detik, sistem menampilkan hasil ekstraksi: merchant, total nominal, tanggal, daftar item (jika terdeteksi). Sistem auto-suggest kategori berdasarkan merchant. |
| 4 | User meninjau data ekstraksi. User dapat mengedit field yang salah langsung di form yang sama. |
| 5 | User mengetuk Simpan. Sistem menyimpan transaksi & memperbarui dashboard MIS. |

**Decision Points**

| Decision Point | YES / Success PATH | No / Error PATH |
|---|---|---|
| AI vision berhasil mengekstraksi data dari struk? | Tampilkan form pra-isi dengan data ekstraksi untuk ditinjau. | Tampilkan pesan error & fallback ke input manual (FR-017). Form kosong untuk diisi pengguna. |
| Data ekstraksi akurat menurut user? | User mengetuk Simpan langsung. | User mengedit field yang salah sebelum menyimpan. |

**Edge Cases**

| Edge Case | What the system must do |
|---|---|
| Foto struk buram/terpotong. | Tampilkan peringatan kualitas gambar & opsi foto ulang sebelum parsing. |
| Struk dalam bahasa daerah/format tidak standar. | Ekstraksi sebanyak mungkin data terbaca; field tak terdeteksi dibiarkan kosong untuk diisi manual; alur tidak diblokir. |
| API vision timeout (>10 detik). | Tampilkan "Gagal memproses struk. Coba lagi?" dengan tombol retry & opsi input manual (FR-017). |
| Struk duplikat (sudah pernah di-scan). | Deteksi kemungkinan duplikat (nominal, merchant, tanggal); minta konfirmasi sebelum menyimpan. |

### VI.IV. Workflow: Upload E-Statement & Bulk Import Transaksi

| | |
|---|---|
| **Actor** | Pengguna yang ingin mengimpor riwayat transaksi dalam jumlah besar dari e-statement bank/e-wallet. |
| **Goal** | Mengisi data transaksi historis sekaligus tanpa input satu per satu. |
| **FRs Covered** | FR-003, FR-004, FR-005 |

**Ideal Path**

| # | Step Description |
|---|---|
| 1 | User ingin mengimpor riwayat bulan lalu. User sudah mengunduh e-statement PDF dari aplikasi/website bank. User membuka Macost, mengetuk tambah transaksi, lalu memilih Upload E-Statement. |
| 2 | Sistem menampilkan panduan singkat format yang didukung. User memilih file PDF & mengunggahnya. |
| 3 | Sistem memproses file dengan AI parsing. *Loading indicator* ditampilkan (estimasi 10–30 detik tergantung jumlah baris). |
| 4 | Sistem menampilkan daftar transaksi terekstraksi dalam tabel preview: tanggal, deskripsi, nominal, kategori auto-suggest. User meninjau tiap baris. |
| 5 | User dapat mengedit kategori/menghapus baris tak relevan (mis. transfer antar rekening sendiri), serta mengedit label sumber (Allowance/Side Income) untuk baris pemasukan. |
| 6 | User mengetuk Impor Semua (atau Impor yang Dipilih). Sistem menyimpan transaksi secara batch & memperbarui dashboard MIS. |

**Decision Points**

| Decision Point | YES / Success PATH | No / Error PATH |
|---|---|---|
| File berhasil di-parse (≥1 transaksi terdeteksi)? | Tampilkan tabel preview hasil ekstraksi. | Tampilkan pesan error format tidak didukung & fallback ke input manual/scan. |
| Ada transaksi duplikat dengan data di database? | Tandai baris duplikat dengan label 'Sudah ada' & *uncheck* default. | Tidak ada duplikat dengan seluruh baris ter-*check* default. |
| User mengonfirmasi impor? | Simpan batch & perbarui dashboard; tampilkan ringkasan "X transaksi berhasil diimpor". | Batalkan proses; tidak ada data tersimpan. |

**Edge Cases**

| Edge Case | What the system must do |
|---|---|
| Format e-statement tidak dikenali. | Tampilkan "Format tidak dikenali" + daftar format yang didukung; tawarkan input manual/scan. |
| E-statement berisi ratusan transaksi (file besar). | Proses asinkron dengan progress bar; user dapat menutup layar & kembali; notifikasi saat selesai. |
| E-statement diproteksi password. | Deteksi proteksi & tampilkan field password dokumen; password hanya untuk membuka file, tidak disimpan. |
| Koneksi terputus saat upload. | Tampilkan error upload gagal & opsi ulang upload; file tidak perlu dipilih ulang. |

### VI.V. Workflow: Onboarding (First-Time User)

| | |
|---|---|
| **Actor** | Pengguna baru Macost. |
| **Goal** | Membuat akun, memahami fitur inti, dan menetapkan goal pertama agar aplikasi siap dipakai. |
| **FRs Covered** | FR-007 |

**Ideal Path**

| # | Step Description |
|---|---|
| 1 | User mengunduh/membuka aplikasi & mengetuk 'Daftar'. Sistem menampilkan form akun (Nama, Email, Password). |
| 2 | User mengisi form & mengetuk 'Buat Akun'. Sistem menyimpan data & menampilkan tour fitur singkat (3–4 slide: input mudah, goal, AI insight, visual progress). |
| 3 | Sistem menawarkan pembuatan goal pertama (opsional). User dapat membuat goal atau melewati. |
| 4 | Bila membuat goal: user mengisi nama goal, nominal target, deadline (tersedia template quick-start: Dana Darurat, Liburan, Kesehatan, Laptop/Gadget). |
| 5 | Sistem mengarahkan user ke entry point utama: layar Input Transaksi. |

**Decision Points**

| Decision Point | YES / Success PATH | No / Error PATH |
|---|---|---|
| User membuat goal saat onboarding? | Simpan goal & arahkan ke Input Transaksi. | Lewati; user tetap diarahkan ke Input Transaksi, dengan nudge goal muncul kembali saat side income pertama masuk. |

**Edge Cases**

| Edge Case | What the system must do |
|---|---|
| User menutup aplikasi di tengah onboarding. | Saat dibuka kembali, lanjutkan dari langkah terakhir (akun sudah tersimpan, tidak mengulang dari awal). |
| User mencatat side income tapi belum punya goal. | Tampilkan prompt buat goal saat itu juga (sebelum lanjut), dengan opsi "Lewati untuk sekarang". |

---

# Part III · Design, Data, & Planning

## VII. System Architecture

### VII.I. High-level Architecture

Macost terdiri dari empat lapisan utama yang saling terhubung: aplikasi klien (Tauri/PWA), backend API (FastAPI), basis data & autentikasi (Supabase), serta layanan AI eksternal (vision & LLM).

**Alur arsitektur:**

```
[Client layer]
  Macost app (Tauri Android & PWA)
        │  HTTPS REST
        ▼
[Backend layer]
  FastAPI (REST API & SAW engine)
        │  Query & write
        ├──────────────► [Data layer]      Supabase (PostgreSQL & auth)
        └──────────────► [AI services]     Vision API (OCR dokumen) · LLM API (AI assistant)

Jalur autentikasi (garis putus): Client layer ⇠⇢ Supabase
```

**Catatan:**

- Next.js dikonfigurasi sebagai *static export* (`output: 'export'`) karena Tauri tidak mendukung mode server-based. Seluruh business logic (termasuk SAW engine & allocation) berada di FastAPI, bukan di Next.js API routes.
- Autentikasi dapat diakses klien langsung ke Supabase Auth, sementara seluruh operasi data sensitif tetap melewati FastAPI.
- Layanan AI eksternal (vision & LLM) selalu disertai jalur *fallback* (lihat NFR-06 & FR-017) agar kegagalan API tidak memblokir alur pengguna.

### VII.II. Deployment Architecture

| Komponen | Platform | Mekanisme Deploy |
|---|---|---|
| Frontend (web/PWA) | Vercel | Otomatis saat push ke `main` (native Git integration) |
| Backend (FastAPI) | Render | Otomatis saat push ke `main` (Git-push-to-deploy); free tier ada *spin-down* saat idle |
| Database & Auth | Supabase | Cloud (tidak perlu deploy); sama untuk dev & production |
| APK + auto-update (`latest.json`) | GitHub Releases | Otomatis via GitHub Actions saat push ke `main` |
| Local development | Docker Compose | Frontend + backend container; Supabase tetap cloud |

## VIII. Design Considerations

### VIII.I. Accessibility Standard

Antarmuka Macost harus memenuhi standar WCAG 2.1 Level AA, terutama rasio kontras teks untuk elemen numerik krusial (total saldo, nominal goal, persentase progres alokasi). Karena aplikasi memakai elemen pixel art dinamis pada Visual Progress (F7), semua angka finansial penting harus tetap terbaca jelas dengan *background overlay* atau *stroke* memadai agar tidak tenggelam di balik elemen visual gamifikasi.

### VIII.II. Platform Requirement

Seluruh *workflows* harus responsif & berfungsi penuh pada orientasi *portrait* dengan lebar layar minimal 360px (*Android-first approach*). Elemen pixel art pada Visual Progress harus dioptimasi agar ringan & tidak menyebabkan lag pada perangkat mid-range. Fitur Scan Struk (F1) harus mendukung akses kamera langsung dari dalam aplikasi. Mengingat MVP berbasis Tauri (target Android) dengan *fallback* PWA, aplikasi harus tetap berfungsi baik pada rentang layar 360px hingga 1440px.

### VIII.III. UX Goal

Pengguna baru harus dapat menyelesaikan *onboarding* (pembuatan goal pertama & pencatatan transaksi pertama) tanpa panduan eksternal, divalidasi via *unmoderated usability test*. Friction pada form input transaksi harian ditekan seminimal mungkin — saat proses dimulai dari membuka form hingga "Simpan" ditargetkan < 20 detik. Saran alokasi dari Smart Allocation (F5) harus ditampilkan sebagai *suggest & confirm*, bukan *auto-execute*, agar pengguna tidak merasa kontrol keuangannya diambil alih sistem (sesuai mitigasi R6 di Project Brief).

### VIII.IV. Branding Constraint

Antarmuka Macost memiliki *dual-identity* yang harus dijaga konsistensinya. Untuk area Visual Progress (F7), desain memakai estetika pixel art yang *playful* sebagai pendorong motivasi. Namun untuk elemen fungsional (form input, dashboard MIS, tabel progres goal, tampilan AI Assistant), antarmuka harus *clean* & modern dengan *whitespace* cukup. Pemisahan ini menjaga agar gamifikasi terasa *rewarding* tanpa mengorbankan keterbacaan data finansial yang krusial.

### VIII.V. User Persona & UX Requirements

**Raka, 20 Tahun**
*Mahasiswa dengan Allowance + Side Income di Yogyakarta*

**Profile:** Aktif mengambil proyek desain grafis paruh waktu di samping kuliah. Pernah mencoba beberapa aplikasi pencatatan keuangan tapi selalu berhenti dalam 2 minggu karena input manual terasa melelahkan dan laporan yang ada tidak memberi arahan konkret. Punya niat menabung tapi uang side income selalu habis tanpa tujuan yang jelas.

**UX Requirements:** Proses input transaksi harus seminimal mungkin tap-nya; scan struk harus menjadi *shortcut* utama yang mudah dijangkau dari dashboard. Saran alokasi dari Smart Allocation harus muncul otomatis saat side income masuk, bukan harus dicari sendiri. Progres goal harus terlihat secara visual di halaman utama agar ada rasa pencapaian setiap membuka aplikasi.

**Refs:** FR-001, FR-002, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-015, FR-018

## IX. Non-Functional Requirements

| NFR ID | Description |
|---|---|
| **NFR-01** [Performance] | Rata-rata waktu input transaksi manual (dari membuka form hingga data tersimpan) harus ≤ 20 detik, diverifikasi melalui pengujian pada *environment staging* dengan minimal 5 partisipan. |
| **NFR-02** [Performance] | Pop-up Smart Allocation (FR-010) harus tampil dalam ≤ 2 detik setelah transaksi pemasukan side income dikonfirmasi, diverifikasi via pengukuran *response time* end-to-end pada staging. |
| **NFR-03** [Usability] | Alur input transaksi manual (Workflow 6.2) harus dapat diselesaikan pengguna baru tanpa onboarding dalam ≤ 3 langkah utama, dan mencapai skor *System Usability Scale* (SUS) ≥ 70 ketika diuji oleh minimum 5 mahasiswa aktif. |
| **NFR-04** [Security] | Seluruh data pengguna (transaksi, foto struk, file e-statement, riwayat goal) harus dienkripsi memakai TLS 1.2+ saat transit dan AES-256 saat tersimpan, diverifikasi via *penetration testing* dasar sebelum rilis MVP. |
| **NFR-05** [Security] | Sistem harus mengunci akun selama 30 menit setelah 5 kali percobaan login gagal berturut-turut, diverifikasi via uji manual. |
| **NFR-06** [Reliability] | Sistem harus menampilkan *fallback* input manual atau template response bila API AI vision (scan) tidak merespons dalam 10 detik atau API LLM (assistant) dalam 15 detik (FR-017), tanpa membuat alur pengguna terhenti. |
| **NFR-07** [Availability] | Sistem harus memiliki *uptime* ≥ 99% di luar jadwal maintenance, dipantau via *monitoring tools* dengan laporan mingguan hingga Project EXPO. Khusus backend (Render free tier), endpoint di-*ping* sebelum sesi demo untuk menghindari *spin-down delay*. |
| **NFR-08** [Accuracy] | Hasil ekstraksi AI vision/OCR atas nominal pada foto struk yang jelas harus mencapai akurasi ≥ 90% dibanding nilai aktual, diverifikasi pada sampel uji minimum 50 struk. |
| **NFR-09** [Portability] | Aplikasi harus dapat diakses & berfungsi responsif pada lebar layar 360px (smartphone entry-level) hingga 1440px (laptop/desktop), mengingat MVP berbasis Tauri (Android) dengan fallback PWA. |

## X. Data Entity

Model data Macost terdiri dari **6 entitas** (sesuai ERD final). Catatan penting terkait algoritma SAW disertakan di bawah tabel.

### X.I. Entitas 1: Pengguna

| Atribut | Tipe | Keterangan |
|---|---|---|
| id_pengguna | PK · unique | ID unik pengguna |
| nama | Varchar | Nama lengkap pengguna |
| email | Varchar | Alamat surel untuk login/notifikasi |
| pekerjaan | Varchar | Profesi/status pengguna (opsional) |
| password | Varchar (hashed) | Kombinasi huruf & angka (hash) |

**⚠ Business Constraints:**
- Unique: email
- Not Null: nama, email

### X.II. Entitas 2: Dompet

| Atribut | Tipe | Keterangan |
|---|---|---|
| id_dompet | PK · unique | ID unik dompet |
| nama_dompet | Varchar | Label dompet (mis. "Gopay", "Kantong Utama") |
| saldo | Decimal | Jumlah uang dalam dompet |
| Pengguna_id_pengguna | FK → Pengguna | ID pemilik dompet |

**⚠ Business Constraints:**
- FK Pengguna_id_pengguna (ON DELETE CASCADE)
- Not Null: nama_dompet, saldo
- Default: saldo = 0.00

### X.III. Entitas 3: Kategori

| Atribut | Tipe | Keterangan |
|---|---|---|
| id_kategori | PK · unique | ID unik kategori |
| nama_kategori | Varchar | Nama kategori (mis. "Freelance", "Makan") |
| tipe | Varchar | Pemasukan atau Pengeluaran |
| flag_pemasukan | Varchar | Fixed Routine / Flexible Side Income |
| flag_pengeluaran | Varchar | Kebutuhan / Keinginan |

**⚠ Business Constraints:**
- Check tipe IN ('Pemasukan','Pengeluaran')
- Check flag_pemasukan IN ('Fixed Routine','Flexible Side Income')
- Check flag_pengeluaran IN ('Kebutuhan','Keinginan')
- Cross-column: jika tipe='Pemasukan' → flag_pemasukan wajib terisi & flag_pengeluaran kosong; jika tipe='Pengeluaran' → sebaliknya

### X.IV. Entitas 4: Transaksi

| Atribut | Tipe | Keterangan |
|---|---|---|
| id_transaksi | PK · unique | ID unik bukti transaksi |
| tipe_transaksi | Varchar | Uang masuk atau keluar |
| nominal | Decimal | Jumlah uang ditransaksikan |
| tanggal_transaksi | Date | Waktu terjadinya transaksi |
| metode_input | Varchar | Manual / Scan Struk / Upload E-Statement |
| Pengguna_id_pengguna | FK → Pengguna | ID pengguna pelaku transaksi |
| Dompet_dompet_id | FK → Dompet | Dompet yang digunakan |
| Kategori_kategori_id | FK → Kategori | Kategori transaksi |

**⚠ Business Constraints:**
- FK Pengguna (CASCADE), FK Dompet (CASCADE), FK Kategori (RESTRICT — kategori tak bisa dihapus jika dipakai)
- Check nominal > 0
- Check tipe_transaksi IN ('Pemasukan','Pengeluaran')
- Check metode_input IN ('Manual','Scan Struk','Upload E-Statement')
- Default: metode_input='Manual', tanggal_transaksi=CURRENT_TIMESTAMP

### X.V. Entitas 5: Goal

| Atribut | Tipe | Keterangan |
|---|---|---|
| id_goal | PK · unique | ID unik tujuan finansial |
| nama_goal | Varchar | Nama target (mis. "Beli Laptop") |
| nominal_target | Decimal | Total dana yang ingin dikumpulkan |
| deadline | Date | Batas waktu mencapai target |
| skor_keinginan | Decimal | Skala *personal importance* menurut pengguna (untuk SAW) |
| skor_kepentingan | Decimal | Skala urgensi/kedekatan waktu (untuk SAW) |
| Pengguna_id_pengguna | FK → Pengguna | ID pemilik goal |

**⚠ Business Constraints:**
- FK Pengguna (CASCADE)
- Check nominal_target > 0
- Check deadline > CURRENT_DATE
- Check skor_keinginan 1–5
- Check skor_kepentingan 1–5

### X.VI. Entitas 6: Alokasi

| Atribut | Tipe | Keterangan |
|---|---|---|
| id_alokasi | PK · unique | ID unik riwayat penyisihan dana |
| nominal_alokasi | Decimal | Jumlah uang dimasukkan ke target |
| tanggal_alokasi | Date | Waktu dana disisihkan |
| Transaksi_id_transaksi | FK → Transaksi | Transaksi pemasukan (side income) asal dana |
| Goal_id_goal | FK → Goal | Target finansial penerima dana |

**⚠ Business Constraints:**
- FK Transaksi (CASCADE), FK Goal (CASCADE)
- Check nominal_alokasi > 0
- Default: tanggal_alokasi = CURRENT_TIMESTAMP

### X.VII. Catatan Implementasi MADM (SAW Mapping 5 Kriteria ke Data)

Algoritma SAW (FR-009) memakai 5 kriteria. Hanya 2 yang disimpan langsung sebagai kolom di entitas Goal; 3 sisanya bersifat *derived* (dihitung dari data lain saat runtime). Ini perlu dipahami tim backend agar perhitungan konsisten:

| Kriteria SAW | Bobot (Survey n = 62) | Arah | Sumber Data |
|---|---|---|---|
| Personal importance | 22,5% | Benefit | Kolom `skor_keinginan` (Goal) dengan input user 1–5 |
| Progress gap | 21,9% | Cost | *Derived*: `nominal_target − Σ nominal_alokasi` (dari Alokasi), dinormalisasi |
| Kemampuan menabung | 21,5% | Benefit | *Derived*: dihitung dari rata-rata pemasukan bersih pengguna (agregasi Transaksi) |
| Urgency / sisa waktu | 17,8% | Cost | Kolom `skor_kepentingan` (Goal) atau *derived* dari `deadline − CURRENT_DATE` |
| Nominal kebutuhan | 16,2% | Benefit* | *Derived*: dari `nominal_target` (Goal) |

*Arah Nominal = Benefit dikonfirmasi survei: 52,5% responden memilih mendahulukan goal bernominal besar.

Strategi default Quick Win memberi bobot lebih pada progress gap & nominal sisa (goal yang hampir tercapai naik peringkat). Toggle Importance-First (FR-013) menggeser dominasi ke personal importance & urgency. FOMO tidak dimasukkan sebagai kriteria SAW (mean ~2,0, tidak signifikan), namun dapat dipakai sebagai *flag* peringatan di AI Assistant (F6/FR-012).

## XI. Dependencies & Integration Points

Tabel berikut merangkum ketergantungan eksternal Macost beserta dampak & strategi mitigasi bila layanan tersebut gagal/tidak tersedia. Ini penting karena beberapa fitur inti (F1, F6) bergantung pada layanan pihak ketiga.

| Dependency | Dipakai untuk | Jenis | Dampak bila gagal | Mitigasi |
|---|---|---|---|---|
| AI Vision API | Ekstraksi data dari foto struk & e-statement (F1 / FR-002, FR-003) | Eksternal, berbayar/free-tier | Scan struk & upload e-statement tidak berfungsi | Fallback ke input manual (FR-017); user tetap bisa mencatat transaksi |
| LLM API | AI Financial Assistant insight (F6 / FR-012) | Eksternal, berbayar/free-tier | Insight AI tidak muncul | Template response/fallback (NFR-06); dashboard MIS tetap menampilkan data mentah |
| Supabase | Database (PostgreSQL) & autentikasi | Eksternal, free-tier | Aplikasi tidak dapat menyimpan/membaca data | Bergantung pada uptime Supabase; offline cache (FR-016) menampung transaksi sementara saat koneksi terputus |
| Vercel | Hosting frontend (web/PWA) | Eksternal, free-tier | Versi web tidak dapat diakses | Versi Tauri (APK) tetap berfungsi independen selama backend hidup |
| Render | Hosting backend FastAPI | Eksternal, free-tier | Seluruh operasi API terhenti | Ping endpoint sebelum demo (NFR-07); pertimbangkan upgrade tier saat hari Expo |
| GitHub (Actions + Releases) | CI/CD & distribusi APK + auto-update | Eksternal | Build/deploy & auto-update terhenti | Build & distribusi APK manual sebagai fallback |

## XII. Release & Roadmap Planning

### XII.I. Milestone Schedule

| Week / Tanggal | Milestone | Owner | Acceptance Criterion |
|---|---|---|---|
| 19–23 Juni 2026 | M1: Discovery, Validasi & PRD | Hidayat, Fertika, Zarra | Problem Validation (desk + field) selesai; Project Brief & PRD disetujui; BPMN & ERD tanpa konflik relasi |
| 23–27 Juni 2026 | M2: UI/UX Design System | Khayyiratri, Hidayat | Desain antarmuka (termasuk aset pixel art F7) selesai & memenuhi UX Goal awal |
| 28–29 Juni 2026 | M3: Setup, Tauri Mobile Spike & Checkpoint | Hidayat | Project setup (monorepo, Docker, CI/CD) |
| 30 Juni – 7 Juli 2026 | M4: Code Sprint Core (TPS + MIS) lalu DSS/AI/Visual | Seluruh Anggota Tim | F1+F6 (dashboard) solid; F3, F4 (SAW), F5 berfungsi; F2 ekstraksi AI; F7 visual ter-embed |
| 8–10 Juli 2026 | M5: Integrasi, QC & MVP Release | Hidayat | Seluruh FR Must-Have terimplementasi & terverifikasi; tanpa critical bug; SUS ≥ 70; deploy final |
| 9–12 Juli 2026 | M6: Persiapan Presentasi (Video & Speaking) | Hidayat, Fertika | Materi pitching, video demo, dan narasi presentasi siap |
| 14 Juli 2026 | M7: Project EXPO | Seluruh Anggota Tim | Aplikasi siap demo; backend di-ping (warm) sebelum sesi juri |

### XII.II. Definition of Done

| # | Description |
|---|---|
| 1 | Semua *acceptance criteria* pada milestone telah terpenuhi. |
| 2 | Tidak ada *critical bug* aktif pada build yang akan dirilis. |
| 3 | Seluruh FR prioritas Must-Have telah diimplementasikan & diverifikasi. |
| 4 | NFR performa (input ≤ 20 detik, pop-up alokasi ≤ 2 detik), keamanan (TLS 1.2+ & AES-256), dan reliabilitas (fallback API) telah diuji. |
| 5 | Tampilan UI memenuhi Design Constraints & standar aksesibilitas WCAG 2.1 Level AA. |
| 6 | Setiap perubahan kontrak API telah diperbarui di dokumentasi internal & catatan rilis. |

---

## Glossary

Istilah teknis & domain yang dipakai di dokumen ini, agar PRD dapat dipahami pembaca lintas latar belakang.

| Istilah | Penjelasan |
|---|---|
| **TPS** (Transaction Processing System) | Lapisan sistem yang menangani pencatatan transaksi harian sebagai sumber data mentah yang terdapat di Macost diwakili fitur input transaksi (F1). |
| **MIS** (Management Information System) | Inti sistem yang mengubah data transaksi menjadi informasi manajemen (dashboard, KPI, tren) yang mudah dibaca (F2). |
| **DSS** (Decision Support System) | Lapisan yang membantu pengambilan keputusan, dalam Macost DSS ini berupa goal prioritization (F4) & smart allocation (F5). |
| **MADM** (Multi-Attribute Decision Making) | Kelompok metode pengambilan keputusan berdasarkan banyak kriteria sekaligus. |
| **SAW** (Simple Additive Weighting) | Metode MADM yang dipakai Macost: normalisasi nilai tiap kriteria → kali bobot → jumlahkan. Dipilih karena transparan & mudah dijelaskan ke user. |
| **Allowance** | Uang bulanan rutin yang diterima mahasiswa dari orang tua/keluarga (pemasukan tetap). |
| **Side income** | Pemasukan tambahan tidak tetap dari freelance/part-time, sifatnya fleksibel. |
| **e-Statement** | Riwayat transaksi digital (umumnya PDF) yang dapat diunduh pengguna dari aplikasi/website bank atau e-wallet. |
| **Smart Allocation** | Fitur (F5) yang menyarankan alokasi pemasukan baru ke goal terprioritaskan, dengan mekanisme *suggest & confirm*. |
| **Suggest & confirm** | Pola interaksi di mana sistem memberi saran, namun keputusan akhir tetap di tangan user (bukan eksekusi otomatis). |
| **Quick Win** | Strategi prioritasi goal default yang mendahulukan goal paling dekat tercapai, untuk momentum motivasi. |
| **Importance-First** | Strategi alternatif yang mendahulukan goal paling penting/mendesak menurut user. |
| **Progress gap** | Selisih antara nominal target goal dengan total dana yang sudah teralokasi (seberapa jauh goal dari tercapai). |
| **Derived attribute** | Atribut yang tidak disimpan sebagai kolom database, melainkan dihitung dari data lain saat *runtime*. |
| **Goal adherence** | Tingkat kepatuhan/konsistensi pengguna dalam mengalokasikan dana ke goal yang ditetapkan. |
| **PWA** (Progressive Web App) | Aplikasi web yang dapat di-"install" ke home screen & berperilaku mirip aplikasi native. |
| **Tauri** | Framework untuk repackage aplikasi web menjadi aplikasi desktop/mobile native. |
| **FOMO** (Fear of Missing Out) | Dorongan psikologis untuk ikut tren/pengeluaran karena takut tertinggal. |
| **MoSCoW** | Metode prioritasi requirement: Must have, Should have, Could have, Won't have. |
| **Quick Access Panel** | Komponen UI di halaman Home yang menampilkan shortcut visual ke fitur-fitur utama Macost (tambah transaksi, scan struk, goal aktif teratas, ringkasan saldo), terinspirasi dari pola navigasi cepat pada aplikasi perbankan seperti Livin by Mandiri. Masuk scope Should Have (FR-018). |
| **AI Agent Chatbot** | Fitur stretch goal pasca-MVP berupa antarmuka percakapan berbasis AI yang memungkinkan pengguna mengeksekusi aksi keuangan secara natural via chat. Berbeda dari AI Financial Assistant (F6) yang hanya memberikan insight satu arah — AI Agent dapat menerima perintah dan mengeksekusi aksi (tool-calling) ke sistem Macost. Masuk scope Could Have (FR-019), dikerjakan setelah MVP selesai. |

---

## Revision History

| Version | Date | Author | Changes |
|---|---|---|---|
| v0.1 | 26 Juni 2026 | Zephyra Team | Initial PRD draft. |
| v1.0 | 27 Juni 2026 | Zephyra Team | Penyusunan ulang PRD berbasis Project Brief, ERD final, dan hasil Problem Validation (desk + field research n=62) |
| v1.1 | 28 Juni 2026 | Zephyra Team | Penambahan System Architecture, Dependencies & Integration Points, Glossary, kolom alasan pada tabel Out of Scope, melengkapi Data Entity, serta finalisasi dokumen PRD. |
| Final | 3 Juli 2026 | Zephyra Team | Penambahan Quick Access Panel (F8-QA / FR-018) sebagai Should Have dan AI Agent Chatbot (F11 / FR-019) sebagai stretch goal pasca-MVP (Could Have), berdasarkan masukan dosen. Update tabel In Scope / Out of Scope, FR table, MoSCoW summary, User Persona refs, dan Glossary. |

---

*Hidayat Nur Hijrah · Fertika Indri Dhamaningrum · Khaliza Zarra Hayatha Setyo · Khayyiratri Anindita*
