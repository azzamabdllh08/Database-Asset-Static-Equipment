from pathlib import Path
import json
import re
import openpyxl

INPUT = Path("Database_Asset_Static_Equipment.xlsx")
OUTPUT = Path("data.js")

# Header aliases. The first matching header is used.
ALIASES = {
    "tag": ["Tag No", "Tag No.", "Tag Number", "Equipment No", "Equipment No."],
    "name": ["Equipment Name", "Equipment", "Description"],
    "type": ["Equipment Type", "Type"],
    "area": ["Area", "Location Area"],
    "location": ["Location", "Plant Location"],
    "service": ["Service", "Process Service"],
    "manufacturer": ["Manufacturer", "Vendor"],
    "material": ["Material", "Material of Construction", "MOC"],
    "designPressure": ["Design Pressure"],
    "designTemperature": ["Design Temperature"],
    "operatingPressure": ["Operating Pressure"],
    "operatingTemperature": ["Operating Temperature"],
    "nominalThickness": ["Nominal Thickness"],
    "corrosionAllowance": ["Corrosion Allowance", "CA"],
    "minimumRequiredThickness": ["Minimum Required Thickness", "Min Required Thickness", "Tmin"],
    "inspectionDate": ["Inspection Date"],
    "inspectionType": ["Inspection Type"],
    "inspectionMethod": ["Inspection Method"],
    "currentThickness": ["Current Thickness", "Latest Thickness"],
    "finding": ["Finding", "Visual Finding"],
    "damageMechanism": ["Damage Mechanism", "Potential Damage Mechanism"],
    "inspector": ["Inspector"],
    "inspectionStatus": ["Inspection Status", "Status Inspection"],
    "ap": ["AP", "Assessment Period"],
    "risk": ["Risk", "Risk 1AP", "Risk 2AP", "Risk 3AP"],
    "criticality": ["Criticality", "Criticality 1AP", "Criticality 2AP", "Criticality 3AP"],
    "rbiStatus": ["RBI Status"],
    "inspectionRecommendation": ["Inspection Recommendation", "Recommendation"],
    "nextInspection": ["Next Inspection", "Inspection Due Date", "RLI Due Date"],
    "remarks": ["Remarks", "Remark"]
}

def clean_header(v):
    return re.sub(r"\s+", " ", str(v or "").strip().lower())

def clean_value(v):
    if v is None:
        return ""
    if hasattr(v, "isoformat"):
        return v.isoformat()[:10]
    return v

def find_column(headers, aliases):
    normalized = {clean_header(h): h for h in headers}
    for alias in aliases:
        if clean_header(alias) in normalized:
            return normalized[clean_header(alias)]
    return None

if not INPUT.exists():
    raise SystemExit(f"Missing {INPUT}. Upload the Excel database to the repository first.")

wb = openpyxl.load_workbook(INPUT, data_only=True, read_only=True)
# Prefer Asset Master; otherwise use the first worksheet.
ws = wb["Asset Master"] if "Asset Master" in wb.sheetnames else wb[wb.sheetnames[0]]
rows = list(ws.iter_rows(values_only=True))
if not rows:
    raise SystemExit("Excel worksheet is empty.")

headers = list(rows[0])
columns = {k: find_column(headers, aliases) for k, aliases in ALIASES.items()}

assets = []
for row in rows[1:]:
    if not any(v not in (None, "") for v in row):
        continue
    raw = dict(zip(headers, row))
    item = {}
    for key, col in columns.items():
        item[key] = clean_value(raw.get(col, "")) if col else ""
    # Tag No is the database key; rows without it are ignored.
    if str(item.get("tag", "")).strip():
        assets.append(item)

# Keep the output as plain JS consumed by the dashboard.
OUTPUT.write_text(
    "const ASSETS = " + json.dumps(assets, ensure_ascii=False, indent=2) + ";\n\n" +
    "const INSPECTIONS = [];\n",
    encoding="utf-8"
)

print(f"Generated {OUTPUT} from {INPUT}: {len(assets)} assets")
print("No RBI/corrosion calculation is performed. Values are copied from Excel.")
