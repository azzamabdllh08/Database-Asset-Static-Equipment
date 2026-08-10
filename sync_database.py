from pathlib import Path
import json
import re
import openpyxl

INPUT = Path("Input RBI.xlsx")
OUTPUT = Path("data.js")
SOURCE_SHEET = "Detail"

# Static Equipment database only.
# Source of truth: Input RBI.xlsx.
# No RBI, corrosion-rate, PoF, CoF, or risk calculation is performed here.
# Existing Excel values are copied only.

ALIASES = {
    "tag": ["Tag Number", "Tag No", "Equipment No."],
    "tagSAP": ["Tag No SAP"],
    "name": ["Object Type", "Deskripsi Peralatan", "Equipment Name"],
    "type": ["Equipment Category"],
    "area": ["Location"],
    "subLocation": ["Sub Location"],
    "workArea": ["Wilayah Kerja"],
    "service": ["Deskripsi Peralatan", "Service"],
    "classification": ["Klasifikasi Asset", "Klasifikasi Asset (2 Juni 2026)"],
    "assetStatus": ["Asset Status"],
    "integrityStatus": ["Integrity Status", "Integrity status AZ11APS"],
    "pof": ["PoF"],
    "cof": ["CoF"],
    "risk1AP": ["Risk 1AP"],
    "risk2AP": ["Risk 2AP"],
    "risk3AP": ["Risk 3AP"],
    "lastInspectionDate": ["Last Inspection Date", "Last Inspection Date (Titis)"],
    "inspectionDueDate": ["Inspection Due Date"],
    "damageMechanism": ["Keterangan SUPPORTING Integrity (Bad & Poor Integrity)_Failure Mode/Damage Mechanism"],
    "remarks": ["Remarks/Kendala", "Catatan"],
    "followUp": ["Tindak Lanjut"],
    "pid": ["PID"],
}


def norm(v):
    return re.sub(r"\s+", " ", str(v or "").replace("\n", " ").strip().lower())


def clean(v):
    if v is None:
        return ""
    if hasattr(v, "isoformat"):
        return v.isoformat()[:10]
    return v


def is_static(value):
    v = norm(value)
    return v in {"static", "static equipment", "static eqp"} or v.startswith("static ")


def find_header_row(ws):
    for r in range(1, min(ws.max_row, 30) + 1):
        vals = [ws.cell(r, c).value for c in range(1, ws.max_column + 1)]
        normalized = {norm(v) for v in vals if v is not None}
        if "tag number" in normalized and "equipment category" in normalized:
            return r
    raise RuntimeError("Header row containing Tag Number and Equipment Category was not found")


def find_column(headers, aliases):
    normalized = {norm(h): i for i, h in enumerate(headers)}
    for alias in aliases:
        key = norm(alias)
        if key in normalized:
            return normalized[key]
    return None


if not INPUT.exists():
    raise SystemExit(f"Missing source workbook: {INPUT}")

wb = openpyxl.load_workbook(INPUT, data_only=True, read_only=True)
if SOURCE_SHEET not in wb.sheetnames:
    raise SystemExit(f"Missing sheet '{SOURCE_SHEET}'. Available: {wb.sheetnames}")

ws = wb[SOURCE_SHEET]
header_row = find_header_row(ws)
rows = ws.iter_rows(min_row=header_row, values_only=True)
headers = list(next(rows))
columns = {k: find_column(headers, aliases) for k, aliases in ALIASES.items()}
category_col = find_column(headers, ["Equipment Category"])

if category_col is None:
    raise SystemExit("Equipment Category column was not found")

assets = []
inspections = []
seen_tags = set()

for row in rows:
    if not any(v not in (None, "") for v in row):
        continue

    category = clean(row[category_col]) if category_col < len(row) else ""
    if not is_static(category):
        continue

    def val(key):
        idx = columns.get(key)
        return clean(row[idx]) if idx is not None and idx < len(row) else ""

    tag = str(val("tag")).strip()
    if not tag:
        continue

    tag_key = tag.upper()
    if tag_key in seen_tags:
        continue
    seen_tags.add(tag_key)

    item = {k: val(k) for k in ALIASES}
    item["type"] = "Static"
    # Dashboard display only; this is copied from Excel, not calculated.
    item["risk"] = item["risk1AP"]
    item["rbiStatus"] = item["classification"]
    assets.append(item)

    inspection_date = item["lastInspectionDate"]
    if inspection_date:
        inspections.append({
            "tag": tag,
            "date": inspection_date,
            "method": "",
            "finding": item["integrityStatus"],
            "remarks": item["remarks"],
        })

assets.sort(key=lambda x: str(x.get("tag", "")))

meta = {
    "generatedFrom": INPUT.name,
    "sourceSheet": SOURCE_SHEET,
    "equipmentCategoryFilter": "Static",
    "assetCount": len(assets),
    "inspectionCount": len(inspections),
}

OUTPUT.write_text(
    "// Auto-generated from Input RBI.xlsx. Do not edit manually.\n"
    "const ASSET_DATABASE_META = " + json.dumps(meta, ensure_ascii=False, separators=(",", ":")) + ";\n"
    "const ASSETS = " + json.dumps(assets, ensure_ascii=False, separators=(",", ":"), default=str) + ";\n"
    "const INSPECTIONS = " + json.dumps(inspections, ensure_ascii=False, separators=(",", ":"), default=str) + ";\n",
    encoding="utf-8"
)

print(f"Generated {OUTPUT}: {len(assets):,} Static assets")
print(f"Generated {len(inspections):,} inspection records")
print("Filter: Equipment Category = Static")
print("RBI/risk/corrosion calculations: NONE")
