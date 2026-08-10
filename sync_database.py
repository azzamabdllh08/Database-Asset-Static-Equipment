"""GitHub Actions entry point for syncing the Static Equipment database.

The actual parser lives in tools/sync_static.py so local PowerShell syncs and
GitHub Actions use exactly the same logic and the same Wilayah Kerja grouping.
"""
from pathlib import Path

from tools.sync_static import build_records, read_excel, write_database

INPUT = Path("Input RBI.xlsx")
REPO = Path(".")

if not INPUT.exists():
    raise SystemExit(f"Missing source workbook: {INPUT}")

rows, headers, sheet = read_excel(INPUT)
assets, inspections = build_records(rows, headers)
write_database(REPO, assets, inspections)

print(f"Worksheet: {sheet}")
print(f"Generated {len(assets):,} Static assets")
print(f"Generated {len(inspections):,} inspection records")
print(f"Wilayah Kerja: {len(set(str(x.get('wilayahKerja') or 'Unknown') for x in assets))}")
print("Dashboard database: manifest + regional JSON + inspections JSON")
print("RBI/risk/corrosion calculations: NONE")
