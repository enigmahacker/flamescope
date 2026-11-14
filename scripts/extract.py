"""Pipeline step 2: map PSI experimental tables to run rows (data/runs_psi.csv).

Usage: python3 -I scripts/extract.py
Rules: copy only what the table states. No pressure column in a table -> pressure blank + flag
(the run is then excluded by build.py, not ranked low). Approximate or ranged values keep
the as-reported text; a number is stored only when the cell holds one number.
Run IDs: FS-1001 upward, in table row order. shortcut: IDs shift if PSI reorders rows; freeze IDs in runs_curated.csv once a row is verified.
"""
import csv, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW, DATA = ROOT / "raw", ROOT / "data"
FIELDS = next(csv.reader(open(DATA / "runs_curated.csv", encoding="utf-8")))

TABLES = [  # (doc_id, PSI accession, file, experiment, platform, mapper name)
    ("D-0006", "PSI-26", "PSI-26_Experimental table_BASS.csv", "BASS", "iss", "bass"),
    ("D-0005", "PSI-25", "PSI-25_Experimental table_BASS-II.csv", "BASS-II", "iss", "bass2"),
    ("D-0007", "PSI-98", "PSI-98_Experimental table_SAFFIRE-1.csv", "Saffire-I", "cygnus", "saffire"),
    ("D-0008", "PSI-99", "PSI-99_Experimental table_SAFFIRE-2.csv", "Saffire-II", "cygnus", "saffire"),
    ("D-0009", "PSI-100", "PSI-100_Experimental table_SAFFIRE-3.csv", "Saffire-III", "cygnus", "saffire"),
]


def num(cell):
    """(value, flag) from a table cell. Only a single plain number becomes a value."""
    c = (cell or "").strip()
    if re.fullmatch(r"-?\d*\.?\d+", c):
        return c, ""
    m = re.fullmatch(r"~\s*(\d*\.?\d+)", c)
    if m:
        return m[1], "approximate_value_in_source"
    return "", ("range_or_text_in_source" if c and c.lower() not in {"none", "n/a"} else "")


def cm_s_to_m_s(cell):
    m = re.fullmatch(r"\s*(\d*\.?\d+)\s*(cm/s)?\s*", cell or "")
    return (f"{float(m[1]) / 100:g}", "") if m else ("", "flow_not_numeric")


def col(row, *names):
    """Header names in PSI tables carry stray spaces and typos; match by prefix."""
    for k, v in row.items():
        if k and any(k.strip().lower().startswith(n.lower()) for n in names):
            return (v or "").strip()
    return ""


def base(doc, acc, exp, platform, sample):
    r = dict.fromkeys(FIELDS, "")
    r.update(doc_id=doc, source_url=f"https://psi.nasa.gov/physci/repo/data/investigations/{acc}",
             experiment=exp, sample=sample, platform=platform, platform_group=platform,
             gravity_condition="microgravity", o2_units="percent_by_volume",
             extraction_method="scripted_from_psi_experimental_table", verification_status="unverified")
    return r


def map_row(kind, row, r):
    flags = ["pressure_not_in_psi_table", "question_answered_needs_team_rule"]
    if kind == "bass":
        r.update(fuel=col(row, "Fuel Sample"), source_location=f"BASS table, As Run Test # {col(row, 'As Run')}")
        r["mission"] = f"ISS test date {col(row, 'Date')}"
        flags += ["o2_not_in_psi_table", "outcome_not_in_psi_table"]
    elif kind == "bass2":
        o2 = col(row, "Calibrated  initial O2", "Calibrated initial O2")
        r.update(fuel=col(row, "Fuel Sample"), o2_as_reported=f"initial {o2}; final {col(row, 'Calibrated final O2')}",
                 mission=f"ISS test date {col(row, 'Date')}", source_location="BASS-II table, Test # " + col(row, "Test #"))
        r["o2_fraction_pct"], f = num(o2)
        flags += [f, "o2_is_calibrated_initial_value", "outcome_not_in_psi_table"]
    else:  # saffire
        o2 = col(row, "Percent O2")
        flow_v, ff = cm_s_to_m_s(col(row, "Air Flow"))
        r.update(fuel=col(row, "Material"), o2_as_reported=o2, flow_condition=col(row, "Flow Direction", "Direction"),
                 flow_velocity_m_s=flow_v, source_location=f"{r['experiment']} table, Sample {r['sample']}",
                 fuel_dimension_as_reported="; ".join(x for x in [col(row, "Sample Thickness", "Samle Thickness"),
                                                                    col(row, "Sample Length"), col(row, "Sample Width")] if x))
        r["o2_fraction_pct"], f = num(o2)
        flags += [f, ff, "platform_cygnus_pending_enum_approval"]
        if r["doc_id"] == "D-0007":  # PSI-98 flightProgram says ISS, its approach text says Cygnus
            flags.append("platform_inconsistent_in_source")
        if not o2:
            flags.append("o2_not_in_psi_table")
        burn = col(row, "?-g Burn Length", "µ-g Burn Length", "�-g Burn Length")
        spread = col(row, "?-g Spread", "µ-g Spread", "�-g Spread")
        if burn:
            r["outcome_notes"] = f"Table µg burn length: {burn}; µg spread column: {spread or 'blank'}."
            # mapping rule (documented in changelog): burn length '~ 0' -> no_spread; full sample length -> spread
            if re.fullmatch(r"~\s*0", burn):
                r["outcome"] = "no_spread"
            elif re.fullmatch(r"\d+\s*cm", burn) and burn.replace(" ", "") == col(row, "Sample Length").replace(" ", ""):
                r["outcome"] = "spread"
            else:
                flags.append("outcome_not_mappable_from_table")
        else:
            flags.append("outcome_not_in_psi_table")
        m = re.fullmatch(r"(\d*\.?\d+)\s*mm/s", spread)
        if m:
            r.update(spread_rate_mm_s=m[1], spread_rate_as_reported=spread)
            flags.append("spread_rate_in_column_labelled_spread_length")
        if not r["fuel"]:
            flags.append("material_blank_in_source")
    r["data_quality_flag"] = "; ".join(x for x in flags if x)
    return r


def is_run(kind, row):
    if kind in ("bass", "bass2"):
        return bool(col(row, "Fuel Sample"))
    s = col(row, "Sample Number")
    return bool(re.fullmatch(r"S\d+|\d+-\d+", s))  # skips flow-visualisation and note rows


def main():
    out, n = [], 1000
    for doc, acc, fn, exp, platform, kind in TABLES:
        with open(RAW / fn, newline="", encoding="utf-8-sig", errors="replace") as f:
            for row in csv.DictReader(f):
                if not is_run(kind, row):
                    continue
                n += 1
                sample = col(row, "Sample Number") if kind == "saffire" else col(row, "Sample #")
                r = map_row(kind, row, base(doc, acc, exp, platform, sample))
                r["run_id"] = f"FS-{n:04d}"
                out.append(r)
    with open(DATA / "runs_psi.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(out)
    return out


if __name__ == "__main__":
    assert num("22.2") == ("22.2", "") and num("~ 21.5") == ("21.5", "approximate_value_in_source")
    assert num("21.5 - 21.7") == ("", "range_or_text_in_source") and num("none") == ("", "")
    assert cm_s_to_m_s("20 cm/s") == ("0.2", "") and cm_s_to_m_s("20") == ("0.2", "")
    rows = main()
    by = {}
    for r in rows:
        by[r["experiment"]] = by.get(r["experiment"], 0) + 1
    print(len(rows), "PSI runs:", by)
