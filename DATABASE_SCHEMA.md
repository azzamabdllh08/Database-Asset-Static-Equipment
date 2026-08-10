# DATABASE ASSET STATIC EQUIPMENT

## Prinsip
Website ini adalah **database dan interface**, bukan mesin kalkulasi RBI.

Nilai RBI/Risk yang sudah ditetapkan di sumber data disimpan dan ditampilkan apa adanya.

## Asset Master
- Tag No.
- Equipment Name
- Equipment Type
- Area
- Location
- Service
- Manufacturer
- Material
- Design Pressure
- Design Temperature
- Operating Pressure
- Operating Temperature
- Nominal Thickness
- Corrosion Allowance
- Minimum Required Thickness

## Inspection
- Tag No.
- Inspection Date
- Inspection Type
- Inspection Method
- Current Thickness
- Finding
- Damage Mechanism
- Inspector
- Inspection Status

## RBI / Risk Data
- Tag No.
- AP (1AP / 2AP / 3AP)
- Risk
- Criticality
- RBI Status
- Inspection Recommendation
- Next Inspection
- Remarks

## Prinsip update
1. Tag No. menjadi identifier utama asset.
2. Asset baru menambah record, bukan mengubah angka dashboard secara manual.
3. Asset dengan Tag No. yang sama dianggap update record, bukan asset baru.
4. Dashboard membaca jumlah record aktual dari database.
5. Tidak ada kalkulasi ulang LF, CF, Risk, corrosion rate, atau RLI di website.
