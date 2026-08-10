// DATABASE STATIC EQUIPMENT
// Tidak ada kalkulasi RBI di repository ini.
// Risk/AP diinput manual sesuai assessment yang sudah ditetapkan.
// Nilai AP yang digunakan: 1AP, 2AP, 3AP.
// Tambahkan asset baru sebagai object di dalam array ASSETS.

const ASSETS = [
  // Contoh struktur — hapus contoh ini saat memasukkan data asli:
  // {
  //   tag: "V-001",
  //   name: "Separator",
  //   type: "Vessel",
  //   area: "Area 01",
  //   service: "Process Gas",
  //   material: "SA-516 Gr.70",
  //   designPressure: "10 barg",
  //   designTemperature: "120 °C",
  //   nominalThickness: 12,
  //   minThickness: 9.5,
  //   currentThickness: 11.2,
  //   damageMechanism: "Internal Thinning",
  //   risk: "2AP",
  //   rbiStatus: "2AP"
  // }
];

// Riwayat inspeksi hanya disimpan sebagai database.
// Tidak dilakukan perhitungan corrosion rate / remaining life otomatis.
const INSPECTIONS = [];
