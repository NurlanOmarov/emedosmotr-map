from io import BytesIO
from typing import Any

import openpyxl


def parse_district_accounts_excel(file_content: bytes, settlement_id: int) -> list[dict[str, Any]]:
    """
    Parses district accounts from Excel file.
    Expected format:
    - Row 1: Title (merged, single non-empty cell)
    - Rows with single non-empty cell: Category header (e.g. "Медкомиссия")
    - Rows with 'ФИО' in second column: Column headers (skipped)
    - Data rows: Index | Full Name | Login | Password | Role | Phone | Note
    """
    wb = openpyxl.load_workbook(BytesIO(file_content), data_only=True)
    sheet = wb.active

    accounts = []
    current_category = None

    for row in sheet.iter_rows(min_row=1, values_only=True):
        if not any(cell is not None for cell in row):
            continue

        non_empty = [v for v in row if v is not None and str(v).strip() != ""]

        if len(non_empty) == 1:
            val = str(non_empty[0]).strip()
            if "Медкомиссия призывного пункта" not in val:
                current_category = val
            continue

        if any("ФИО" in str(v) for v in row if v):
            continue

        full_name = row[1]
        if not full_name or str(full_name).strip() in ("", "ФИО"):
            continue

        accounts.append({
            "settlement_id": settlement_id,
            "full_name": str(full_name).strip(),
            "login": str(row[2]).strip() if row[2] is not None else None,
            "password": str(row[3]).strip() if row[3] is not None else None,
            "role": str(row[4]).strip() if row[4] is not None else None,
            "phone": str(row[5]).strip() if row[5] is not None else None,
            "note": str(row[6]).strip() if row[6] is not None else None,
            "category": current_category,
        })

    return accounts
