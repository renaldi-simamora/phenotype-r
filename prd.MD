# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# Phenotype Monitoring System

**Judul Penelitian:** "Rancang Bangun Perangkat IoT Multi-Sensor Berbasis Support Vector Machine untuk Mendukung Identifikasi Karakteristik Fenotip Individu"

**Versi Dokumen:** 2.0 (Rinci — dibagi per sisi: Website/Sistem, IoT, Machine Learning)
**Tanggal:** 4 September 2026

## DAFTAR ISI

1. Pendahuluan
2. Rumusan Masalah & Tujuan Penelitian
3. Ruang Lingkup Sistem (3 Pilar)
4. **BAGIAN A — SISI WEBSITE / SISTEM INFORMASI (INOVASI)**
5. **BAGIAN B — SISI PERANGKAT IoT (HARDWARE & AKUISISI DATA)**
6. **BAGIAN C — SISI MACHINE LEARNING (SUPPORT VECTOR MACHINE)**
7. Integrasi Tiga Pilar (End-to-End Flow)
8. Business Rules Global
9. Non-Functional Requirements Global
10. Roadmap Implementasi
11. Kriteria Keberhasilan (Acceptance Criteria)
12. Batasan, Risiko, dan Prinsip Etis Penelitian
13. Glosarium

---

## 1. PENDAHULUAN

Phenotype Monitoring System merupakan sistem pendukung penelitian tugas akhir yang dirancang untuk membuktikan kelayakan penggunaan **perangkat IoT multi-sensor** yang diproses melalui algoritma **Support Vector Machine (SVM)** guna mendukung identifikasi karakteristik fenotip individu. Sistem ini terdiri dari tiga komponen utama yang saling terintegrasi namun memiliki tanggung jawab yang jelas dan terpisah:

| Pilar | Peran |
|---|---|
| **Website / Sistem Informasi** | Antarmuka manajemen, visualisasi hasil, dan kontrol akses berbasis peran (inovasi pada sisi presentasi & orkestrasi data) |
| **Perangkat IoT** | Akuisisi data mentah dari sensor fisik secara terstandarisasi dan aman |
| **Machine Learning (SVM)** | Mengubah data sensor menjadi prediksi karakteristik fenotip yang terukur, disertai tingkat keyakinan (confidence) |

Dokumen ini merinci requirement pada **ketiga sisi tersebut secara terpisah** agar setiap komponen dapat dirancang, dibangun, dan diuji sesuai kontribusinya pada penelitian, sekaligus menunjukkan bagaimana ketiganya terhubung menjadi satu sistem utuh.

> **Catatan penting:** Sistem ini **bukan alat medis** dan **tidak melakukan diagnosis medis** atau membaca data genetik/DNA secara langsung. Seluruh output disebut sebagai *karakteristik terukur*, *pola data*, atau *karakteristik fenotip yang diteliti*, sesuai kaidah etik penelitian.

## 2. RUMUSAN MASALAH & TUJUAN PENELITIAN

### 2.1 Rumusan Masalah

1. Bagaimana merancang perangkat IoT multi-sensor yang mampu mengakuisisi data karakteristik fisik individu secara konsisten dan akurat?
2. Bagaimana membangun pipeline pemrosesan data (preprocessing, feature extraction) yang sesuai untuk input model SVM?
3. Bagaimana merancang dan melatih model SVM yang mampu mengklasifikasikan karakteristik fenotip dengan tingkat akurasi yang dapat dipertanggungjawabkan secara ilmiah?
4. Bagaimana menyajikan hasil akuisisi data dan hasil prediksi SVM kepada pengguna (admin, operator, subjek) secara aman, informatif, dan sesuai kewenangan masing-masing?

### 2.2 Tujuan

1. Merancang dan membangun perangkat IoT berbasis ESP32-S3 dengan 4 jenis sensor untuk akuisisi data karakteristik individu.
2. Membangun pipeline pemrosesan data end-to-end dari sensor hingga database.
3. Merancang, melatih, dan mengevaluasi model SVM untuk klasifikasi karakteristik fenotip.
4. Membangun sistem informasi berbasis web dengan role-based access control untuk mengelola seluruh proses pengukuran, penyimpanan, dan visualisasi hasil.

## 3. RUANG LINGKUP SISTEM (3 PILAR)

```
┌───────────────────────┐     ┌───────────────────────┐     ┌───────────────────────┐
│   BAGIAN B: IoT        │     │  BAGIAN A: WEBSITE /   │     │  BAGIAN C: MACHINE     │
│                        │     │  SISTEM INFORMASI      │     │  LEARNING (SVM)        │
│  ESP32-S3 + 4 sensor   │────▶│  REST API + Dashboard  │◀───▶│  Preprocessing +       │
│  akuisisi data mentah  │     │  RBAC (Admin/Operator/ │     │  Feature Extraction +  │
│                        │     │  User) + Visualisasi   │     │  SVM Model + Evaluasi  │
└───────────────────────┘     └───────────────────────┘     └───────────────────────┘
```

Ketiga bagian di bawah ini ditulis **berdiri sendiri** (masing-masing punya tujuan, requirement fungsional, requirement non-fungsional, dan kriteria uji sendiri), lalu disatukan di Bagian 7 (Integrasi).

---

# BAGIAN A — SISI WEBSITE / SISTEM INFORMASI (INOVASI)

## A.1 Tujuan Bagian Ini

Menyediakan sistem informasi berbasis web yang menjadi **pusat kendali dan visualisasi** dari seluruh proses penelitian: mengelola pengguna & device, menjalankan alur pengukuran, menampilkan hasil prediksi SVM secara real-time, dan menyediakan analitik performa model — semuanya dengan kontrol akses berbasis peran yang ketat.

**Letak nilai inovasi pada sisi ini:** orkestrasi otomatis dari akuisisi data IoT → pemrosesan ML → penyajian hasil, tanpa intervensi manual, dilengkapi audit trail penuh dan RBAC 3 level.

## A.2 Arsitektur Sisi Website

```
Next.js Dashboard (Client) ──REST API──▶ Express.js Backend ──▶ Supabase PostgreSQL
        ▲                                       │
        └──────────── Supabase Realtime ◀───────┘
```

- Frontend **tidak pernah** mengakses Supabase/ML Service secara langsung untuk data sensitif — selalu melalui REST API backend.
- Backend bertindak sebagai **orchestrator**: menerima request dari frontend/IoT, memvalidasi, meneruskan ke Supabase dan/atau ML Service, lalu mengembalikan hasil terformat.

## A.3 Technology Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 15+, React, TypeScript, App Router, Tailwind CSS, shadcn/ui, Lucide React Icons, React Hook Form, Zod, Recharts, TanStack Query |
| Backend | Node.js, Express.js, TypeScript, Zod, JWT/session (Supabase Auth), CORS, Helmet, rate limiting, centralized error handling, structured logging |
| Database & Auth | Supabase PostgreSQL, Supabase Auth, Row Level Security (RLS), Supabase Realtime |

## A.4 Role & Hak Akses (RBAC)

### A.4.1 ADMIN
- Kelola seluruh user & operator (CRUD, aktivasi/nonaktivasi)
- Kelola seluruh device (registrasi, aktivasi/nonaktivasi)
- Lihat seluruh measurement, hasil SVM, analytics, model SVM, audit log
- Lihat status & statistik sistem secara global
- **Dilarang** mengubah hasil prediction SVM secara manual

### A.4.2 OPERATOR
- Lihat device tersedia & statusnya
- Memilih user (subjek), membuat & memulai sesi pengukuran
- Memantau proses pengukuran real-time, melihat data sensor selama sesi
- Melihat hasil SVM & histori pengukuran yang ditangani sendiri
- **Dilarang**: mengubah role, menghapus audit log, mengelola model SVM, mengakses pengaturan sistem sensitif

### A.4.3 USER (Subjek Penelitian)
- Melihat dashboard pribadi, status & hasil pengukuran miliknya
- Melihat histori dan profil miliknya
- Melakukan sesi pengukuran bila diizinkan sistem
- **Dilarang**: melihat data user lain, seluruh device, analytics admin, mengubah hasil pengukuran/prediksi

## A.5 Authentication & Authorization

- Menggunakan **Supabase Auth**. Halaman: `/login`, `/register`, `/forgot-password`, `/reset-password`.
- **Register** (Full Name, Email, Password, Confirm Password): email valid & unik, password ≥ 8 karakter, confirm password cocok. Role default = `USER`, redirect ke `/dashboard`.
- Role ADMIN/OPERATOR **tidak bisa** dibuat via register publik — hanya admin yang bisa membuat/menetapkan operator.
- **Backend wajib memverifikasi ulang** authentication & authorization di setiap request (proteksi route frontend saja tidak cukup).

## A.6 Functional Requirements — Modul Website

### A.6.1 Landing Page
Gaya: technology / IoT / AI / research — clean, modern, minimal (bukan gaya "rumah sakit"). Section: Navbar (Logo, Home, Technology, How It Works, About, Login, Register) → Hero (*"Multi-Sensor IoT Monitoring with Machine Learning"*) → System Architecture → Technology → Device Preview → How It Works → CTA → Footer.

### A.6.2 User Dashboard (`/dashboard`)
Welcome card (nama, status akun) · Statistics (total measurement, latest prediction, average confidence, last measurement) · Device Status · Latest Measurement · Recent History · CTA "Start Measurement".

### A.6.3 Operator Dashboard (`/operator/dashboard`)
Active/Available Devices · Active/Completed Measurements Today · Device Monitor (Device ID, Online/Offline, Measuring, Error, Last Seen) · Active Measurement (Measurement ID, User ID, Device ID, Progress, Sensor Status, API Connection, ML Processing Status) · Quick action "Start New Measurement".

### A.6.4 Admin Dashboard (`/admin/dashboard`)
Statistics (Total Users, Operators, Devices Online/Offline, Total Measurements, Measurements Today, Completed, ML Predictions Generated). 5 Chart: Measurement Trend, Prediction Distribution, Device Activity, Measurement Status, Confidence Distribution. Recent Measurements table & Device Status table.

### A.6.5 Measurement Flow (`/measurement`) — 7 Langkah

| Step | Nama | Detail |
|---|---|---|
| 1 | Select User | Pilih pseudonymous ID (USER-001, dst.) |
| 2 | Select Device | Pilih device (DEVICE-001, dst.) |
| 3 | Device Check | Cek ESP32 connected, Wi-Fi, backend, ketersediaan sensor, status device |
| 4 | Ready | Tampilkan "Ready for measurement", instruksi posisi (±5 cm, tolerance dikonfigurasi) |
| 5 | Measuring | Tampilkan progress, elapsed time, status device & sensor |
| 6 | Data Processing | Tampilkan "Processing sensor data..." — pipeline Raw → Cleaning → Normalization → Feature Extraction → SVM |
| 7 | Result | Measurement ID, timestamp, prediction, confidence, processing time, model version |

### A.6.6 Measurement Result Page (`/measurement/[id]`)
General Information, Sensor Summary, ML Result (Model Name/Version, Prediction, Confidence, Processing Time), Feature Information.

**Disclaimer wajib tampil:**
> "Hasil merupakan analisis model berdasarkan data pengukuran perangkat dan bukan merupakan diagnosis medis atau penetapan genetik individu."

### A.6.7 History (`/history`)
Scope sesuai role (User: milik sendiri; Operator: yang ditangani; Admin: semua). Filter: date range, device, prediction, status. Search: Measurement ID / pseudonymous user ID. Pagination.

### A.6.8 Device Management (`/devices`, `/devices/[id]`)
Admin: full access · Operator: read access · User: tidak perlu akses. Data: Device ID/Name, Status (ONLINE/OFFLINE/MEASURING/ERROR), IP, Firmware Version, Last Seen, Sensor Health, Telemetry (data terakhir, uptime, jumlah measurement).

### A.6.9 Analytics (`/admin/analytics`) — Admin Only
Measurement Trend, Prediction Distribution, Confidence Distribution, Device Usage, Sensor Data Statistics, ML Model Performance (Accuracy, Precision, Recall, F1-score, Confusion Matrix — dihitung dari **evaluation dataset**, bukan data produksi).

### A.6.10 Audit Log (`/admin/audit-logs`) — Admin Only
Mencatat: login/logout, registrasi, measurement created/completed, device connected/disconnected, prediction generated, role changed, device activated/deactivated. Field: timestamp, user_id, action, resource, resource_id, status, metadata. **Tidak dapat dihapus lewat UI.**

### A.6.11 Profile
Name, email, ubah password — sama untuk ketiga role.

## A.7 Arsitektur Kode Frontend (Struktur Folder & Komponen)

**Pola:** Next.js App Router — Server Component untuk fetch data awal (non-sensitif), Client Component untuk bagian interaktif (form, realtime subscription, chart, stepper measurement).

**Struktur folder:**

```
/app
  /(public)
    page.tsx                → Landing Page
    /login/page.tsx
    /register/page.tsx
    /forgot-password/page.tsx
    /reset-password/page.tsx

  /(dashboard)               → area USER (dilindungi middleware auth)
    /dashboard/page.tsx
    /measurement/page.tsx
    /measurement/[id]/page.tsx
    /history/page.tsx
    /profile/page.tsx
    /settings/page.tsx

  /operator                  → area OPERATOR
    /dashboard/page.tsx
    /measurement/page.tsx
    /devices/page.tsx
    /history/page.tsx

  /admin                     → area ADMIN
    /dashboard/page.tsx
    /users/page.tsx
    /operators/page.tsx
    /devices/page.tsx
    /devices/[id]/page.tsx
    /measurements/page.tsx
    /analytics/page.tsx
    /ml-models/page.tsx
    /audit-logs/page.tsx

  middleware.ts              → cek sesi & role sebelum render route terproteksi

/components
  /ui                         → komponen shadcn/ui (button, dialog, table, dst.)
  StatusBadge.tsx              → mapping warna status (ONLINE/OFFLINE/MEASURING/ERROR)
  DataTable.tsx                → tabel generik (TanStack Table) untuk history/users/devices/audit-log
  MeasurementStepper.tsx       → komponen 7-langkah measurement flow
  ConfidenceGauge.tsx
  SensorReadingCard.tsx
  DeviceStatusCard.tsx
  EmptyState.tsx / ErrorState.tsx / LoadingSkeleton.tsx

/lib
  supabase-client.ts          → inisialisasi Supabase client (browser)
  api-client.ts               → wrapper fetch ke backend REST API (base URL, header auth otomatis)

/hooks
  useAuth.ts                  → ambil session & role user saat ini
  useMeasurement.ts            → TanStack Query hook untuk data measurement
  useRealtimeChannel.ts         → subscribe Supabase Realtime & invalidate query terkait

/services                    → fungsi pemanggil endpoint per domain (authService, deviceService, measurementService, mlService, analyticsService)
/types                       → tipe TypeScript & Zod schema (idealnya di-share konsep/kontraknya dengan backend)
/utils                       → date formatter, formatter angka/confidence, dll.
```

**State & data-fetching:**
- **TanStack Query** dipakai untuk seluruh data dari REST API (caching, refetch, retry).
- **Supabase Realtime** dipasang di layout dashboard per role, subscribe channel spesifik (mis. `measurements:id=eq.{id}`, `devices:status`), lalu invalidate query TanStack Query terkait saat ada event — bukan menyimpan state realtime terpisah.
- **React Hook Form + Zod** untuk semua form (register, create measurement, device form), dengan schema yang sama kontraknya dengan validasi di backend.

**Route protection:** `middleware.ts` mengecek sesi Supabase Auth + role dari `profiles` sebelum me-render halaman `(dashboard)`, `/operator/*`, `/admin/*`. Ini hanya guard UX — otorisasi sesungguhnya tetap divalidasi di backend (lihat A.13).

## A.8 Arsitektur Kode Backend (Struktur Folder & Layer)

**Pola layered architecture:**

```
Route → Middleware (auth, validate) → Controller → Service → Repository → Supabase
```

**Struktur folder:**

```
/src
  /routes
    auth.routes.ts
    users.routes.ts
    devices.routes.ts
    iot.routes.ts
    measurements.routes.ts
    ml.routes.ts
    analytics.routes.ts
    audit.routes.ts

  /controllers               → parsing request, panggil service, format response standar
    auth.controller.ts
    users.controller.ts
    devices.controller.ts
    iot.controller.ts
    measurements.controller.ts
    ml.controller.ts
    analytics.controller.ts
    audit.controller.ts

  /services                  → business logic murni (tidak tahu detail HTTP)
    auth.service.ts
    user.service.ts
    device.service.ts
    measurement.service.ts
    ml.service.ts             → pemanggil internal ke ML Service Python
    analytics.service.ts
    audit.service.ts

  /repositories               → satu-satunya layer yang query ke Supabase
    user.repository.ts
    device.repository.ts
    measurement.repository.ts
    sensorReading.repository.ts
    mlPrediction.repository.ts
    auditLog.repository.ts

  /middlewares
    authenticate.ts            → verifikasi Supabase JWT
    authorize.ts                → cek role (RBAC) per endpoint
    validate.ts                  → validasi body/query dengan Zod schema
    deviceAuth.ts                 → khusus endpoint /iot/* — cek device_id + device_key
    errorHandler.ts                → centralized error handler (paling akhir di chain)
    rateLimiter.ts

  /validators                  → skema Zod per domain (authSchema, deviceSchema, measurementSchema, dst.)
  /utils                       → response formatter, logger, helper tanggal
  /config                      → koneksi Supabase, env loader
  /types                       → tipe TypeScript request/response per domain
```

**Kenapa dipisah per layer:** business rule (mis. "measurement completed tidak boleh diedit") hidup di `service`, sehingga mudah di-unit-test tanpa mock HTTP/DB, dan `controller` tetap tipis (hanya orkestrasi request/response).

## A.9 REST API Contract (Detail Lengkap per Endpoint)

Base URL: `/api`. Format response standar:

```json
// Sukses
{ "success": true, "message": "...", "data": {} }
// Error
{ "success": false, "message": "...", "error": { "code": "...", "details": {} } }
```

Auth header: `Authorization: Bearer <supabase_jwt>` untuk endpoint user-facing. Endpoint `/iot/*` memakai header khusus `x-device-id` + `x-device-key` (lihat Bagian B.7). Pagination list endpoint: query `?page=&limit=`, response menyertakan `meta: { page, limit, total }`.

### A.9.1 Auth

| Endpoint | Role | Deskripsi |
|---|---|---|
| `POST /auth/register` | Public | Registrasi user baru, role default `USER` |
| `POST /auth/login` | Public | Login, mengembalikan session/JWT dari Supabase Auth |
| `POST /auth/logout` | Semua role login | Invalidate session |
| `GET /auth/me` | Semua role login | Ambil profil & role user yang sedang login |

**Contoh — `POST /auth/register`**

```json
// Request
{ "full_name": "Budi Santoso", "email": "budi@example.com", "password": "********", "confirm_password": "********" }
// Response 201
{ "success": true, "message": "Registration successful",
  "data": { "id": "uuid", "full_name": "Budi Santoso", "email": "budi@example.com", "role": "USER" } }
// Error 400 (email sudah terpakai)
{ "success": false, "message": "Email already registered", "error": { "code": "EMAIL_TAKEN", "details": {} } }
```

### A.9.2 Users

| Endpoint | Role | Deskripsi |
|---|---|---|
| `GET /users` | Admin | List seluruh user (pagination, filter role/status) |
| `GET /users/:id` | Admin, atau user itu sendiri | Detail satu user |
| `POST /users` | Admin | Buat user/operator baru (di luar register publik) |
| `PATCH /users/:id` | Admin, atau user itu sendiri (field terbatas) | Update profil/role/status |
| `DELETE /users/:id` | Admin | Nonaktifkan/hapus user |

**Contoh — `PATCH /users/:id` (admin menetapkan operator)**

```json
// Request
{ "role": "OPERATOR" }
// Response 200
{ "success": true, "message": "User role updated", "data": { "id": "uuid", "role": "OPERATOR" } }
```

### A.9.3 Devices

| Endpoint | Role | Deskripsi |
|---|---|---|
| `GET /devices` | Admin (full), Operator (read) | List device & status |
| `GET /devices/:id` | Admin, Operator | Detail device + telemetry |
| `POST /devices` | Admin | Registrasi device baru (generate `device_id` + `device_key`) |
| `PATCH /devices/:id` | Admin | Update nama/status/firmware |
| `DELETE /devices/:id` | Admin | Nonaktifkan device |

**Contoh — `POST /devices`**

```json
// Request
{ "device_name": "Sensor Unit A", "firmware_version": "1.0.0" }
// Response 201
{ "success": true, "message": "Device registered",
  "data": { "id": "uuid", "device_code": "DEVICE-003", "device_key": "generated-secret", "status": "OFFLINE" } }
```

### A.9.4 IoT (detail lengkap lihat Bagian B)

| Endpoint | Auth | Deskripsi |
|---|---|---|
| `POST /iot/measurements` | Device auth | Kirim payload sensor hasil pengukuran |
| `POST /iot/heartbeat` | Device auth | Tanda device masih online |
| `POST /iot/device-status` | Device auth | Update status (ONLINE/ERROR/dsb.) |
| `GET /iot/devices/:deviceId/status` | Admin, Operator | Cek status device terakhir |

### A.9.5 Measurements

| Endpoint | Role | Deskripsi |
|---|---|---|
| `POST /measurements` | Operator, User (bila diizinkan) | Buat sesi measurement baru (status `PENDING`) |
| `GET /measurements` | Sesuai scope role | List measurement (filter date/device/prediction/status) |
| `GET /measurements/:id` | Sesuai scope role | Detail measurement + hasil ML |
| `PATCH /measurements/:id/status` | Operator | Update status sesi (mis. ke `IN_PROGRESS`) |
| `GET /measurements/:id/sensors` | Sesuai scope role | Data sensor mentah pada measurement tsb. |

**Contoh — `POST /measurements`**

```json
// Request
{ "user_id": "uuid", "device_id": "uuid" }
// Response 201
{ "success": true, "message": "Measurement created",
  "data": { "id": "uuid", "measurement_code": "MEAS-00031", "status": "PENDING", "created_at": "2026-09-04T08:00:00Z" } }
// Error 409 (device sedang offline)
{ "success": false, "message": "Device is offline", "error": { "code": "DEVICE_OFFLINE", "details": { "device_id": "..." } } }
```

### A.9.6 ML (detail lengkap lihat Bagian C)

| Endpoint | Role | Deskripsi |
|---|---|---|
| `POST /ml/predict` | Internal (dipanggil backend, bukan diekspos ke frontend) | Minta prediksi ke ML Service |
| `GET /ml/predictions/:measurementId` | Sesuai scope role | Ambil hasil prediksi measurement tertentu |
| `GET /ml/models` | Admin | List versi model yang tersedia |
| `GET /ml/models/:id` | Admin | Detail satu versi model + metrik evaluasi |

### A.9.7 Analytics — Admin Only

| Endpoint | Deskripsi |
|---|---|
| `GET /analytics/measurements` | Statistik & tren measurement |
| `GET /analytics/predictions` | Distribusi hasil prediksi |
| `GET /analytics/devices` | Statistik penggunaan device |
| `GET /analytics/model-performance` | Accuracy/precision/recall/F1/confusion matrix per model |

### A.9.8 Audit — Admin Only

| Endpoint | Deskripsi |
|---|---|
| `GET /audit-logs` | List seluruh log aktivitas (filter action/resource/date, pagination) |

**Aturan berlaku di semua endpoint di atas:** authentication, authorization (role check), validation (Zod), try/catch, status code HTTP yang tepat, dan structured error response sesuai format A.9.

## A.10 Skema Database (Supabase PostgreSQL)

| Tabel | Kolom Utama |
|---|---|
| `profiles` | id, auth_user_id, full_name, email, role, status, created_at, updated_at |
| `devices` | id, device_code, device_name, status, firmware_version, ip_address, last_seen, created_at, updated_at |
| `measurements` | id, measurement_code, user_id, operator_id, device_id, status, started_at, completed_at, created_at |
| `sensor_readings` | id, measurement_id, sensor_type, payload_json, recorded_at |
| `ml_predictions` | id, measurement_id, model_name, model_version, prediction, confidence, processing_time_ms, created_at |
| `ml_models` | id, model_name, version, status, accuracy, precision, recall, f1_score, dataset_version, feature_version, trained_at |
| `audit_logs` | id, user_id, action, resource, resource_id, status, metadata_json, created_at |

Foreign key antar tabel terkait wajib digunakan. Index pada: `measurement_code`, `device_id`, `user_id`, `created_at`, `model_version`. **Row Level Security (RLS)** aktif di seluruh tabel.

## A.11 Realtime

Gunakan Supabase Realtime/WebSocket untuk: status device, status & progress measurement, measurement selesai, ketersediaan prediction — tanpa refresh manual. Alur status: `MEASURING → PROCESSING → PREDICTING → COMPLETED`.

## A.12 UI/UX Requirements

Desain professional, modern, technology/research, clean, minimal. Layout desktop-first tapi responsive. Komponen dashboard: sidebar, topbar, cards, tables, chart, status badge, modal, toast, loading skeleton, empty state, error state. Status color coding konsisten di seluruh halaman.

## A.13 Security (Sisi Website)

- Supabase Auth + RLS wajib aktif.
- Backend authorization di setiap endpoint (bukan hanya proteksi route frontend) — dua lapis: middleware `authorize()` + RLS Supabase.
- Input validation (Zod) di semua form & endpoint, skema yang sama antara frontend dan backend.
- HTTPS di production, environment variables untuk secrets, tidak ada kredensial database/service-role key di client (`NEXT_PUBLIC_*` hanya untuk anon key & base URL).
- CORS restriction, Helmet, rate limiting per-IP, error sanitization (detail error server tidak diekspos ke client di production).

## A.14 Error Handling (Sisi Website)

Centralized error handler di backend memetakan error ke format standar:

| Kondisi | HTTP Status | error.code |
|---|---|---|
| Validasi gagal (Zod) | 400 | `VALIDATION_ERROR` |
| Tidak login/token invalid | 401 | `UNAUTHORIZED` |
| Role tidak diizinkan | 403 | `FORBIDDEN` |
| Resource tidak ditemukan | 404 | `NOT_FOUND` |
| Device auth gagal | 401 | `DEVICE_UNAUTHORIZED` |
| Device offline saat create measurement | 409 | `DEVICE_OFFLINE` |
| ML service timeout/unavailable | 200 (data tetap tersimpan) | status measurement → `ML_PROCESSING_FAILED` |
| Error server tak terduga | 500 | `INTERNAL_ERROR` |

**Aturan khusus:** jika ML gagal, data measurement **tetap disimpan**, status `ML_PROCESSING_FAILED`, tampilkan "Measurement data saved. ML analysis is currently unavailable." — data tidak boleh hilang.

## A.15 Kriteria Uji Sisi Website

- [ ] RBAC berjalan konsisten di frontend maupun backend untuk ketiga role.
- [ ] Seluruh halaman dashboard menampilkan data sesuai scope akses role.
- [ ] Dashboard update realtime tanpa refresh manual.
- [ ] Audit log mencatat seluruh aksi penting dan tidak bisa dihapus dari UI.
- [ ] Disclaimer non-medis tampil di halaman hasil pengukuran.

---

# BAGIAN B — SISI PERANGKAT IoT (HARDWARE & AKUISISI DATA)

## B.1 Tujuan Bagian Ini

Merancang perangkat IoT multi-sensor berbasis **ESP32-S3** yang mampu mengakuisisi data karakteristik fisik individu secara **konsisten, tervalidasi, dan aman**, lalu mengirimkannya ke backend melalui REST API terautentikasi.

## B.2 Komponen Hardware

| Komponen | Fungsi |
|---|---|
| **ESP32-S3** | Microcontroller utama — akuisisi sensor, validasi dasar, komunikasi Wi-Fi/HTTPS |
| **AS7341** | Sensor spektral (spectral channels) — data karakteristik optik |
| **TCS34725** | Sensor warna (red, green, blue, clear) |
| **VL53L1X** | Sensor jarak (distance_mm) — memastikan posisi pengukuran sesuai target |
| **BME280** | Sensor lingkungan (ambient_temperature, humidity, pressure) — **kondisi lingkungan saja, bukan sensor tubuh** |

## B.3 Arsitektur Akuisisi Data

```
Sensor (AS7341, TCS34725, VL53L1X, BME280)
        │  I2C
        ▼
     ESP32-S3
        │  baca sensor → validasi dasar → averaging (opsional) → generate measurement_id
        ▼
     JSON Payload
        │  Wi-Fi / HTTPS
        ▼
   POST /api/iot/measurements  (Express Backend)
```

**Aturan arsitektur mutlak:**
- ESP32 **hanya** berkomunikasi dengan backend REST API.
- ESP32 **tidak pernah** berkomunikasi langsung dengan Supabase atau ML Service.
- Frontend **tidak pernah** berkomunikasi langsung dengan ESP32.

## B.4 Alur Kerja Firmware ESP32-S3

1. **Setup:** koneksi Wi-Fi → memuat `device_id` & `device_key` dari secure storage (NVS, bukan hardcoded di source) → inisialisasi seluruh sensor.
2. **Baca Sensor:** membaca seluruh sensor (AS7341, TCS34725, VL53L1X, BME280).
3. **Basic Validation:** memastikan nilai berada pada rentang wajar sebelum dikirim (reject nilai out-of-range).
4. **Averaging (bila diperlukan):** akumulasi beberapa sampel lalu dirata-ratakan untuk mengurangi noise.
5. **Generate Measurement ID:** identifier unik per sesi pengukuran (contoh: `MEAS-00001`).
6. **Susun JSON Payload** dan kirim ke `POST /api/iot/measurements`.
7. **Heartbeat:** dikirim berkala ke `POST /api/iot/heartbeat` agar status device (ONLINE/OFFLINE) selalu akurat di dashboard.

## B.5 Contoh Payload Pengiriman Data

```json
POST /api/iot/measurements
{
  "device_id": "DEVICE-001",
  "measurement_id": "MEAS-00001",
  "timestamp": "2026-09-04T08:30:00Z",
  "sensors": {
    "as7341": { "f1": 1230, "f2": 1450, "f3": 1670 },
    "tcs34725": { "red": 180, "green": 140, "blue": 120, "clear": 205 },
    "vl53l1x": { "distance_mm": 50.8 },
    "bme280": { "ambient_temperature_c": 26.4, "humidity_percent": 61.2, "pressure_hpa": 1008.2 }
  }
}
```

Backend **wajib** memvalidasi seluruh payload sebelum diproses lebih lanjut (schema validation, Zod).

## B.6 Prosedur Pengukuran (Sisi Fisik)

- **Jarak pengukuran target:** ±5 cm dari sensor (tolerance dapat dikonfigurasi).
- **Instruksi ke subjek:** "Place your hand in the measurement area" & "Keep your position stable".
- Sensor VL53L1X digunakan untuk **memvalidasi jarak** sebelum pembacaan sensor lain dianggap valid.

## B.7 Autentikasi Perangkat IoT

Setiap perangkat harus terdaftar terlebih dahulu di sistem (contoh: `DEVICE-001`, `DEVICE-002`) sebelum bisa mengirim data.

```
ESP32 → kirim device_id + device_key → Backend verifikasi →
   Valid  → Accept measurement
   Invalid → 401 Unauthorized
```

`device_key` disimpan di NVS ESP32 saat provisioning, **tidak** ditulis langsung di source code firmware.

## B.8 Manajemen Status Device

Status yang dilacak dan ditampilkan di dashboard (lihat Bagian A.6.8): `ONLINE`, `OFFLINE`, `MEASURING`, `ERROR`. Data telemetri: Device ID, Device Name, IP Address, Firmware Version, Last Seen, sensor health per jenis sensor.

## B.9 Error Handling Sisi IoT

Skenario wajib ditangani:
- ESP32 offline / tidak terhubung Wi-Fi
- Sensor offline / gagal dibaca
- API timeout saat pengiriman data
- Payload JSON tidak valid
- Device tidak terdaftar / device_key salah (`401 Unauthorized`)

**Prinsip:** kegagalan pada satu sensor tidak boleh menghapus data measurement yang sudah terkumpul dari sensor lain.

## B.10 Data Privacy Sisi IoT

- Data dikirim menggunakan `device_id` dan `measurement_id` — **tidak menyertakan data pribadi** subjek secara langsung.
- Identitas subjek dikaitkan di sisi backend melalui pseudonymous ID (USER-001, dst.), bukan dikirim dari device.

## B.11 Kriteria Uji Sisi IoT

- [ ] Device hanya dapat mengirim data setelah terautentikasi (`device_id` + `device_key`).
- [ ] Payload tervalidasi penuh sebelum masuk ke pipeline preprocessing.
- [ ] Status device (online/offline/measuring/error) terpantau akurat di dashboard.
- [ ] Kegagalan salah satu sensor tidak menghapus data sensor lain dalam sesi yang sama.
- [ ] Jarak pengukuran divalidasi oleh VL53L1X sebelum data sensor lain dianggap sah.

---

# BAGIAN C — SISI MACHINE LEARNING (SUPPORT VECTOR MACHINE)

## C.1 Tujuan Bagian Ini

Merancang, melatih, dan mengintegrasikan model **Support Vector Machine (SVM)** yang mengubah data sensor mentah menjadi prediksi karakteristik fenotip individu, lengkap dengan tingkat keyakinan (confidence/decision score), sebagai inti kontribusi ilmiah penelitian ini.

## C.2 Alur Pemrosesan Data (Pipeline)

```
Raw Sensor Data
      │
      ▼
Preprocessing (cleaning, normalization — StandardScaler)
      │
      ▼
Feature Extraction (feature vector)
      │
      ▼
SVM (SVC — scikit-learn Pipeline)
      │
      ▼
Prediction + Confidence/Decision Score
      │
      ▼
Disimpan ke Database (ml_predictions)
```

## C.3 Technology Stack ML

| Komponen | Teknologi |
|---|---|
| Bahasa | Python |
| Library | scikit-learn |
| Algoritma | Support Vector Machine (SVC) |
| Preprocessing | `StandardScaler` |
| Struktur | `scikit-learn Pipeline` (preprocessing + model jadi satu artefak) |
| Versioning | Model diberi versi eksplisit, contoh: `SVM-v1.0` |

## C.4 Arsitektur ML Service

- ML Service berjalan sebagai **service Python terpisah**, dipanggil secara internal oleh backend Express (server-to-server), **tidak pernah** dipanggil langsung oleh frontend.
- Model dimuat sekali saat startup service dan disimpan di memori berdasarkan `model_version`, mendukung beberapa versi model berjalan bersamaan (untuk keperluan rerun/re-evaluasi).

**Endpoint ML Service:**

```json
POST /predict

Request:
{
  "measurement_id": "MEAS-00001",
  "features": [1230, 1450, 1670, 180, 140, 120, 50.8],
  "model_version": "SVM-v1.0"
}

Response:
{
  "measurement_id": "MEAS-00001",
  "prediction": "CLASS_A",
  "confidence": 0.924,
  "model_version": "SVM-v1.0"
}
```

**Aturan mutlak:** prediksi harus selalu berasal dari model — **tidak boleh ada hasil dummy/hardcoded** pada alur produksi.

## C.5 Feature Engineering

Feature vector disusun dari hasil pembacaan seluruh sensor (kecuali BME280 yang dipisahkan sebagai kondisi lingkungan, bukan fitur karakteristik individu, kecuali jika penelitian menetapkan sebaliknya sebagai variabel kontrol):

- Channel spektral dari AS7341
- Nilai red, green, blue, clear dari TCS34725
- Jarak (distance_mm) dari VL53L1X sebagai variabel kontrol/validasi posisi

Setiap prediksi menyimpan metadata: `feature_version` dan `total feature count`, untuk menjamin traceability antara versi fitur dan versi model yang dipakai.

## C.6 Model Governance & Penyimpanan

Setiap baris prediksi (`ml_predictions`) wajib menyimpan:
- `model_name`, `model_version`
- `prediction`, `confidence/decision score`
- `processing_time_ms`
- `created_at`

Rerun/evaluasi ulang **tidak menimpa** hasil lama — insert baris baru dengan `model_version` berbeda, menjaga jejak riwayat performa antar versi model untuk kebutuhan laporan penelitian.

## C.7 Evaluasi Model (Bagian Ilmiah Inti)

Model dievaluasi menggunakan **evaluation dataset terpisah** (bukan data produksi pengguna), dengan metrik:

| Metrik | Kegunaan |
|---|---|
| **Accuracy** | Proporsi prediksi benar secara keseluruhan |
| **Precision** | Ketepatan model saat memprediksi kelas tertentu |
| **Recall** | Kemampuan model menangkap seluruh instance kelas tertentu |
| **F1-score** | Harmonic mean precision & recall |
| **Confusion Matrix** | Distribusi prediksi benar/salah antar kelas |

Data hasil evaluasi ini yang ditampilkan pada halaman Analytics (lihat A.6.9) — **dilarang** menghitung accuracy dari data produksi user karena tidak representatif secara ilmiah (bias, tidak ada ground truth terverifikasi).

## C.8 Struktur Proyek ML (Referensi)

```
/ml
  /training       → script pelatihan model (terpisah dari inference)
  /inference       → service endpoint POST /predict
  /preprocessing   → StandardScaler, cleaning function
  /features        → feature extraction dari payload sensor
  /models          → artefak model per versi (.joblib)
  /evaluation      → perhitungan accuracy/precision/recall/F1/confusion matrix
```

## C.9 Batasan Ilmiah & Etis Sisi ML

- Model **tidak boleh** diklaim sebagai alat diagnosis medis.
- Model **tidak boleh** diklaim membaca data genetik/DNA secara langsung — istilah yang digunakan konsisten dengan Bagian 1: "karakteristik terukur", "pola data", atau "karakteristik fenotip yang diteliti".
- Dataset pelatihan menggunakan data sintetis/dummy atau data penelitian yang telah mendapat izin, tidak menggunakan data kesehatan pribadi atau data confidential.

## C.10 Error Handling Sisi ML

Jika ML Service gagal merespons (timeout/unavailable):
- Data sensor **tetap tersimpan** di database (tidak hilang).
- Status measurement diset `ML_PROCESSING_FAILED`.
- Dashboard menampilkan: "Measurement data saved. ML analysis is currently unavailable."

## C.11 Kriteria Uji Sisi Machine Learning

- [ ] Pipeline preprocessing (StandardScaler) konsisten antara training dan inference (satu artefak Pipeline yang sama).
- [ ] Setiap prediksi menyimpan `model_version`, `confidence`, dan `processing_time_ms`.
- [ ] Model dievaluasi hanya dengan evaluation dataset, hasil metrik (accuracy, precision, recall, F1, confusion matrix) tercatat dan dapat ditampilkan di Analytics.
- [ ] Tidak ditemukan hasil prediksi hardcoded di jalur produksi.
- [ ] Kegagalan ML Service tidak menyebabkan hilangnya data sensor.

---

## 7. INTEGRASI TIGA PILAR (END-TO-END FLOW)

### Flow 1 — User Register (Sisi Website)

```
User → Register → Supabase Auth → Profile dibuat → Role USER → Dashboard
```

### Flow 2 — Measurement (Ketiga Sisi Terlibat)

```
[WEBSITE] Operator → Select User → Select Device → Device Check → Start
[IoT]     ESP32 membaca sensor → validasi dasar → kirim payload ke REST API
[WEBSITE] Backend memvalidasi payload → simpan sensor_readings
[ML]      Backend kirim feature vector ke ML Service → SVM memproses → hasil prediction + confidence
[WEBSITE] Backend simpan ml_predictions → update status measurement → dashboard update realtime
[WEBSITE] Measurement completed, hasil tampil ke user/operator/admin sesuai role
```

### Flow 3 — Admin Monitoring (Sisi Website, memantau data dari IoT & ML)

```
Admin → Dashboard → Device monitoring (data dari IoT) → Measurement monitoring →
ML analytics (data dari ML) → Model performance
```

## 8. BUSINESS RULES GLOBAL

1. Satu measurement memiliki satu device, satu timestamp, dan satu set sensor readings.
2. Satu measurement dapat memiliki lebih dari satu versi ML prediction bila proses rerun diizinkan.
3. Prediction wajib memiliki `model_version` dan **tidak boleh diedit manual**.
4. Measurement yang sudah selesai tidak boleh diedit oleh user.
5. User hanya melihat data miliknya sendiri; operator hanya mengakses fitur operator; admin memiliki akses sesuai role.
6. Device harus terdaftar sebelum mengirim data.
7. Kegagalan sensor tidak boleh menghapus measurement; kegagalan ML tidak boleh menghapus data sensor.
8. Semua aktivitas penting dicatat ke audit log.
9. Dilarang mengklaim hasil sebagai diagnosis medis atau pembacaan genetik langsung.
10. Gunakan pseudonymous ID di seluruh sistem; dilarang menggunakan data confidential.

## 9. NON-FUNCTIONAL REQUIREMENTS GLOBAL

| Aspek | Requirement |
|---|---|
| **Security** | Supabase Auth + RLS, backend authorization di semua endpoint, HTTPS production, tidak ada secret di client, CORS, Helmet, rate limiting, device authentication (`device_id`+`device_key`) |
| **Reliability** | Kegagalan di satu komponen (sensor/ML) tidak menghapus data yang sudah berhasil disimpan komponen lain |
| **Privacy** | Tidak menggunakan data klien asli, data genetik, data kesehatan pribadi, atau informasi proprietary; hanya data sintetis/dummy atau berizin penelitian |
| **Usability** | Desain modern/clean/research-oriented, desktop-first responsive, status color coding konsisten |
| **Maintainability** | Clean architecture (layered: controller-service-repository), reusable component, TypeScript strict mode |
| **Format API** | Response format konsisten `{ success, message, data }` / `{ success, message, error }` |

## 10. ROADMAP IMPLEMENTASI

| Fase | Cakupan | Pilar Terkait |
|---|---|---|
| 1 | Arsitektur project, database schema, Supabase Auth, role system | Website |
| 2 | Landing page, Login, Register, Dashboard dasar | Website |
| 3 | Device management, measurement flow, REST API | Website + IoT |
| 4 | Integrasi ESP32, ingestion data sensor | IoT |
| 5 | ML service, integrasi SVM, penyimpanan prediction | Machine Learning |
| 6 | Analytics, realtime, audit logs | Website + Machine Learning |
| 7 | Security hardening, testing, seed data, production build | Semua pilar |

## 11. KRITERIA KEBERHASILAN (ACCEPTANCE CRITERIA GLOBAL)

- [ ] Ketiga pilar (Website, IoT, ML) terintegrasi penuh — tidak ada mock data setelah backend tersedia.
- [ ] Autentikasi & RBAC berfungsi penuh di frontend dan backend.
- [ ] ESP32 dapat mengirim data terautentikasi dan tervalidasi ke backend.
- [ ] Pipeline preprocessing → feature extraction → SVM → prediction tersimpan lengkap dengan versi model.
- [ ] Dashboard tiap role menampilkan data sesuai scope aksesnya, update realtime.
- [ ] Kegagalan ML tidak menghilangkan data sensor.
- [ ] Audit log mencatat seluruh aksi penting dan tidak dapat dihapus dari UI.
- [ ] Tidak ada hasil prediksi hardcoded di alur produksi.
- [ ] Disclaimer non-medis tampil konsisten di seluruh halaman hasil.
- [ ] Model SVM dievaluasi dengan metrik ilmiah (accuracy, precision, recall, F1, confusion matrix) dari evaluation dataset.

## 12. BATASAN, RISIKO, DAN PRINSIP ETIS PENELITIAN

**Batasan:**
- Sistem tidak dirancang sebagai perangkat medis berizin edar.
- Sensor tidak membaca data genetik/DNA secara langsung.

**Risiko & Mitigasi:**

| Risiko | Mitigasi |
|---|---|
| Data sensor noisy/tidak konsisten | Averaging di firmware + StandardScaler di preprocessing |
| Model overfitting pada dataset kecil | Evaluasi dengan cross-validation & dataset evaluasi terpisah |
| Kegagalan jaringan ESP32 ↔ backend | Buffer retry lokal di firmware, status device ERROR/OFFLINE terpantau |
| Kesalahpahaman hasil sebagai diagnosis medis | Disclaimer wajib di setiap halaman hasil pengukuran |

**Prinsip Etis:**
- Seluruh data pengujian menggunakan ID pseudonim dan data sintetis/berizin penelitian.
- Metrik performa model dihitung dari evaluation dataset, bukan data produksi pengguna.
- Istilah yang digunakan konsisten menghindari klaim medis/genetik.

## 13. GLOSARIUM

| Istilah | Penjelasan |
|---|---|
| **SVM** | Support Vector Machine — algoritma klasifikasi machine learning |
| **RBAC** | Role-Based Access Control |
| **RLS** | Row Level Security (Supabase/PostgreSQL) |
| **Feature Vector** | Representasi numerik data sensor yang siap diproses model |
| **Confidence/Decision Score** | Tingkat keyakinan model terhadap suatu prediksi |
| **Pseudonymous ID** | Identitas semu (mis. USER-001) yang tidak mengungkap identitas asli subjek |
| **Model Versioning** | Praktik pemberian versi eksplisit pada tiap iterasi model (mis. SVM-v1.0) |