from __future__ import annotations

import argparse
import json
import re
import subprocess
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook


ALIASES = {
    "category": ["Equipment Category", "EquipmentCategory", "Category"],
    "tag": ["Tag No", "Tag No.", "Tag Number", "Equipment Tag", "Tag", "Equipment No"],
    "name": ["Equipment Name", "Equipment", "Description", "Equipment Description", "Name"],
    "type": ["Equipment Type", "Type", "Equipment Type Description"],
    "area": ["Area", "Location", "Plant Area", "Unit", "Zone"],
    "service": ["Service", "Process Service", "Fluid Service", "Service Description"],
    "material": ["Material", "Material Specification", "Material Spec", "Material Grade"],
    "risk": ["Risk", "Risk Ranking", "Risk Rank", "RBI Risk"],
    "risk1AP": ["1AP", "Risk 1AP", "Risk 1 AP", "1 AP"],
    "risk2AP": ["2AP", "Risk 2AP", "Risk 2 AP", "2 AP"],
    "risk3AP": ["3AP", "Risk 3AP", "Risk 3 AP", "3 AP"],
    "damageMechanism": ["Damage Mechanism", "DamageMechanism", "DM"],
    "corrosionRate": ["Corrosion Rate", "CorrosionRate", "CR"],
    "currentThickness": ["Current Thickness", "CurrentThickness", "Measured Thickness", "UT Thickness"],
    "rbiStatus": ["RBI Status", "RBIStatus", "Assessment Status"],
    "date": ["Inspection Date", "Last Inspection Date", "InspectionDate", "Date"],
    "method": ["Inspection Method", "Method", "Inspection Type"],
    "finding": ["Finding", "Findings", "Inspection Finding"],
    "remarks": ["Remarks", "Remark", "Inspection Remarks", "Notes"],
}


def clean_header(value):
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip()).lower()


def value_for(row, header_map, aliases):
    for alias in aliases:
        key = clean_header(alias)
        if key in header_map:
            return row[header_map[key]]
    return None


def serialise(value):
    if value is None:
        return ""
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def build_records(rows, headers):
    header_map = {clean_header(h): i for i, h in enumerate(headers) if h is not None}
    if not any(clean_header(a) in header_map for a in ALIASES["category"]):
        raise RuntimeError(
            "Kolom Equipment Category tidak ditemukan. Header yang tersedia: "
            + ", ".join(str(h) for h in headers if h is not None)
        )

    assets = []
    inspections = []
    for row in rows:
        raw_category = value_for(row, header_map, ALIASES["category"])
        if str(raw_category or "").strip().lower() != "static":
            continue

        asset = {
            key: serialise(value_for(row, header_map, aliases))
            for key, aliases in ALIASES.items()
            if key not in {"category", "date", "method", "finding", "remarks"}
        }
        asset["equipmentCategory"] = "Static"
        assets.append(asset)

        inspection_date = value_for(row, header_map, ALIASES["date"])
        method = value_for(row, header_map, ALIASES["method"])
        finding = value_for(row, header_map, ALIASES["finding"])
        remarks = value_for(row, header_map, ALIASES["remarks"])
        if any(v not in (None, "") for v in (inspection_date, method, finding, remarks)):
            inspections.append({
                "tag": serialise(value_for(row, header_map, ALIASES["tag"])),
                "date": serialise(inspection_date),
                "method": serialise(method),
                "finding": serialise(finding),
                "remarks": serialise(remarks),
            })

    return assets, inspections


def read_excel(path: Path):
    """Find the real header row instead of assuming row 1 is the header.

    Asset Register workbooks commonly have title/information rows above the
    table. We scan the first 100 rows of every worksheet for Equipment Category.
    """
    wb = load_workbook(path, read_only=True, data_only=True)
    category_aliases = {clean_header(a) for a in ALIASES["category"]}

    for ws in wb.worksheets:
        rows = ws.iter_rows(values_only=True)
        buffered = []
        for row_number, row in enumerate(rows, start=1):
            row_values = list(row)
            buffered.append(row_values)
            if row_number > 100:
                break

            header_keys = {clean_header(v) for v in row_values if v is not None}
            if category_aliases.intersection(header_keys):
                # The row containing Equipment Category is the actual table header.
                remaining = ws.iter_rows(min_row=row_number + 1, values_only=True)
                return list(remaining), row_values, ws.title

    raise RuntimeError(
        "Tidak ditemukan worksheet/baris header yang memiliki kolom Equipment Category "
        "dalam 100 baris pertama."
    )


def write_database(repo_root: Path, assets, inspections):
    output = repo_root / "data.js"
    payload_assets = json.dumps(assets, ensure_ascii=False, separators=(",", ":"))
    payload_inspections = json.dumps(inspections, ensure_ascii=False, separators=(",", ":"))
    content = (
        "// AUTO-GENERATED. DO NOT EDIT MANUALLY.\n"
        "// Source: Asset Register Excel | Filter: Equipment Category = Static\n"
        "// This script performs NO RBI calculation.\n\n"
        f"const ASSETS = {payload_assets};\n\n"
        f"const INSPECTIONS = {payload_inspections};\n"
    )
    output.write_text(content, encoding="utf-8")
    return output


def git_push(repo_root: Path, commit_message: str):
    subprocess.run(["git", "-C", str(repo_root), "add", "data.js"], check=True)
    status = subprocess.run(
        ["git", "-C", str(repo_root), "status", "--porcelain"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout.strip()
    if not status:
        print("Tidak ada perubahan database.")
        return
    subprocess.run(["git", "-C", str(repo_root), "commit", "-m", commit_message], check=True)
    subprocess.run(["git", "-C", str(repo_root), "push", "origin", "main"], check=True)


def main():
    parser = argparse.ArgumentParser(description="Sync Static Equipment dari Asset Register lokal OneDrive")
    parser.add_argument("excel", help="Path lengkap ke Asset Register Excel")
    parser.add_argument("--repo", default=".", help="Folder root repository GitHub")
    parser.add_argument("--push", action="store_true", help="Commit dan push data.js ke branch main")
    args = parser.parse_args()

    excel = Path(args.excel).expanduser().resolve()
    repo = Path(args.repo).expanduser().resolve()
    if not excel.exists():
        raise SystemExit(f"File Excel tidak ditemukan: {excel}")
    if not (repo / ".git").exists():
        raise SystemExit(f"Folder repository Git tidak ditemukan: {repo}")

    rows, headers, sheet = read_excel(excel)
    assets, inspections = build_records(rows, headers)
    output = write_database(repo, assets, inspections)

    print(f"Worksheet: {sheet}")
    print(f"Static assets: {len(assets):,}")
    print(f"Inspection records: {len(inspections):,}")
    print(f"Database: {output}")

    if args.push:
        git_push(repo, "Sync Static Equipment database from Asset Register")
        print("Push ke GitHub selesai.")


if __name__ == "__main__":
    main()
