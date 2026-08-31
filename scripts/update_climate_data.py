"""Live climate-data ingestion for the WPC Climate-to-Hydrology Dashboard.

Phase 1D activates four observed climate indicators:
  * NOAA/CPC ERSSTv6 Relative Oceanic Nino Index (RONI)
  * Bureau of Meteorology Wheeler-Hendon Realtime Multivariate MJO (RMM)
  * NOAA/CPC daily Pacific-North American (PNA) teleconnection index
  * NOAA/CPC daily North Atlantic Oscillation (NAO) teleconnection index

No precipitation or flash-flood prediction is inferred here.
"""
from __future__ import annotations

from datetime import datetime, timezone
import csv
import io
import json
import math
from pathlib import Path
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CLIMATE = DATA / "climate_current.json"
STATUS = DATA / "data_status.json"
RONI_HISTORY = DATA / "roni_history.json"
MJO_HISTORY = DATA / "mjo_history.json"
PNA_HISTORY = DATA / "pna_history.json"
NAO_HISTORY = DATA / "nao_history.json"

RONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt"
RONI_PAGE = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/"
MJO_URL = "https://www.bom.gov.au/clim_data/IDCKGEM000/rmm.74toRealtime.txt"
MJO_FALLBACK_URL = "https://www.bom.gov.au/climate/mjo/graphics/rmm.74toRealtime.txt"
MJO_PAGE = "https://www.bom.gov.au/climate/mjo/"
PNA_URL = "https://ftp.cpc.ncep.noaa.gov/cwlinks/norm.daily.pna.cdas.z500.19500101_current.csv"
PNA_FALLBACK_URL = "https://ftp.cpc.ncep.noaa.gov/cwlinks/norm.daily.pna.index.b500101.current.ascii"
PNA_PAGE = "https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/pna.shtml"
NAO_URL = "https://ftp.cpc.ncep.noaa.gov/cwlinks/norm.daily.nao.cdas.z500.19500101_current.csv"
NAO_FALLBACK_URL = "https://ftp.cpc.ncep.noaa.gov/cwlinks/norm.daily.nao.index.b500101.current.ascii"
NAO_PAGE = "https://www.cpc.ncep.noaa.gov/products/precip/CWlink/pna/nao.shtml"
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def fetch_text(url: str, attempts: int = 3, referer: str | None = None) -> str:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/plain,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }
    if referer:
        headers["Referer"] = referer
    request = urllib.request.Request(url, headers=headers)
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(request, timeout=35) as response:
                return response.read().decode("utf-8", errors="replace")
        except Exception as exc:
            last_error = exc
            if attempt < attempts:
                time.sleep(5 * attempt)
    assert last_error is not None
    raise last_error


def parse_roni(text: str) -> list[dict]:
    rows: list[dict] = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) != 3 or parts[0].upper() == "SEAS":
            continue
        season, year_text, value_text = parts
        try:
            year = int(year_text)
            value = float(value_text)
        except ValueError:
            continue
        if len(season) != 3:
            continue
        rows.append({"season": season.upper(), "year": year, "value": value})
    if not rows:
        raise ValueError("NOAA/CPC RONI response contained no parseable data rows")
    return rows


def parse_mjo(text: str) -> list[dict]:
    rows: list[dict] = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) < 7:
            continue
        try:
            year, month, day = map(int, parts[:3])
            rmm1 = float(parts[3])
            rmm2 = float(parts[4])
            phase = int(parts[5])
            amplitude = float(parts[6])
        except (ValueError, OverflowError):
            continue
        if year < 1974 or not (1 <= month <= 12 and 1 <= day <= 31 and 1 <= phase <= 8):
            continue
        if any(abs(v) > 1e20 or not math.isfinite(v) for v in (rmm1, rmm2, amplitude)):
            continue
        rows.append({
            "date": f"{year:04d}-{month:02d}-{day:02d}",
            "year": year,
            "month": month,
            "day": day,
            "rmm1": rmm1,
            "rmm2": rmm2,
            "phase": phase,
            "amplitude": amplitude,
        })
    if not rows:
        raise ValueError("BoM RMM response contained no parseable data rows")
    return rows



def parse_pna(text: str) -> list[dict]:
    """Parse either CPC's current CSV PNA feed or the legacy ASCII feed.

    CPC changed the operational daily teleconnection products to CSV in 2023.
    The parser is intentionally tolerant of header naming so a minor CPC label
    change does not break the dashboard.
    """
    rows: list[dict] = []

    # Preferred path: comma-separated CPC CDAS file.
    if "," in text[:2000]:
        reader = csv.DictReader(io.StringIO(text))
        if reader.fieldnames:
            norm = {name: name.strip().lower().replace(" ", "_") for name in reader.fieldnames if name}
            for raw in reader:
                rec = {norm.get(k, k): (v.strip() if isinstance(v, str) else v) for k, v in raw.items() if k}
                try:
                    if rec.get("date"):
                        date_text = str(rec["date"]).strip()
                        digits = "".join(ch for ch in date_text if ch.isdigit())
                        if len(digits) >= 8:
                            year, month, day = int(digits[:4]), int(digits[4:6]), int(digits[6:8])
                        else:
                            dt = datetime.fromisoformat(date_text[:10])
                            year, month, day = dt.year, dt.month, dt.day
                    else:
                        year = int(float(rec.get("year", rec.get("yyyy", "nan"))))
                        month = int(float(rec.get("month", rec.get("mm", "nan"))))
                        day = int(float(rec.get("day", rec.get("dd", "nan"))))

                    value = None
                    for key in ("pna", "pna_index", "index", "value", "normalized_pna"):
                        if rec.get(key) not in (None, ""):
                            value = float(rec[key])
                            break
                    if value is None:
                        # Final tolerant fallback: choose the last finite numeric
                        # field that is not a date component.
                        for key, val in reversed(list(rec.items())):
                            if key in {"date", "year", "yyyy", "month", "mm", "day", "dd"} or val in (None, ""):
                                continue
                            try:
                                candidate = float(val)
                            except (TypeError, ValueError):
                                continue
                            if math.isfinite(candidate):
                                value = candidate
                                break
                    if value is None or not math.isfinite(value):
                        continue
                    rows.append({"date": f"{year:04d}-{month:02d}-{day:02d}", "value": value})
                except (ValueError, TypeError, OverflowError):
                    continue

    # Legacy CPC ASCII fallback: YYYY MM DD VALUE (whitespace separated).
    if not rows:
        for line in text.splitlines():
            parts = line.replace(",", " ").split()
            if len(parts) < 4:
                continue
            try:
                year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
                value = float(parts[-1])
            except (ValueError, OverflowError):
                continue
            if year < 1950 or not (1 <= month <= 12 and 1 <= day <= 31) or not math.isfinite(value):
                continue
            rows.append({"date": f"{year:04d}-{month:02d}-{day:02d}", "value": value})

    if not rows:
        raise ValueError("NOAA/CPC PNA response contained no parseable daily values")

    # Deduplicate and sort in case a source contains repeated dates.
    by_date = {row["date"]: row for row in rows}
    return [by_date[d] for d in sorted(by_date)]


def pna_state(value: float) -> str:
    if value > 0.10:
        return "Positive PNA index"
    if value < -0.10:
        return "Negative PNA index"
    return "Near-zero PNA index"


def nao_state(value: float) -> str:
    if value > 0.10:
        return "Positive NAO index"
    if value < -0.10:
        return "Negative NAO index"
    return "Near-zero NAO index"


def roni_state(value: float) -> str:
    if value >= 0.5:
        return "Positive RONI anomaly"
    if value <= -0.5:
        return "Negative RONI anomaly"
    return "Near-neutral RONI anomaly"


def mjo_region(phase: int) -> str:
    return {
        1: "Western Hemisphere / Africa",
        2: "Indian Ocean",
        3: "Indian Ocean",
        4: "Maritime Continent",
        5: "Maritime Continent",
        6: "Western Pacific",
        7: "Western Pacific",
        8: "Western Hemisphere / Africa",
    }[phase]


def mjo_strength(amplitude: float) -> str:
    # Standard RMM interpretation: inside the unit circle is weak/incoherent.
    if amplitude < 1.0:
        return "Weak / incoherent RMM signal"
    if amplitude < 1.5:
        return "Active RMM signal"
    if amplitude < 2.5:
        return "Strong RMM signal"
    return "Very strong RMM signal"


def indicator(climate: dict, indicator_id: str) -> dict:
    result = next((x for x in climate["indicators"] if x.get("id") == indicator_id), None)
    if result is None:
        raise KeyError(f"climate_current.json is missing indicator id={indicator_id!r}")
    return result


def dataset(status: dict, name: str) -> dict:
    result = next((x for x in status["datasets"] if x.get("name") == name), None)
    if result is None:
        raise KeyError(f"data_status.json is missing dataset name={name!r}")
    return result


def update_roni(climate: dict, status: dict, retrieved_at: str) -> None:
    rows = parse_roni(fetch_text(RONI_URL))
    latest = rows[-1]
    indicator(climate, "roni").update({
        "value": latest["value"],
        "units": "°C",
        "state": roni_state(latest["value"]),
        "valid_time": f'{latest["season"]} {latest["year"]}',
        "source_name": "NOAA Climate Prediction Center — RONI (ERSSTv6)",
        "source_url": RONI_PAGE,
        "data_url": RONI_URL,
        "retrieved_at": retrieved_at,
        "freshness_hours": None,
        "provisional": True,
        "note": "Latest RONI values are estimates and may be revised by NOAA/CPC for up to two months."
    })
    RONI_HISTORY.write_text(json.dumps({
        "schema_version": "1.0",
        "indicator": "roni",
        "source_name": "NOAA Climate Prediction Center — RONI (ERSSTv6)",
        "source_url": RONI_PAGE,
        "data_url": RONI_URL,
        "retrieved_at": retrieved_at,
        "provisional_latest": True,
        "values": rows,
    }, indent=2) + "\n", encoding="utf-8")
    dataset(status, "RONI / ENSO").update({
        "status": "live", "checked_at": retrieved_at,
        "message": f'Live — latest {latest["season"]} {latest["year"]}: {latest["value"]:+.2f} °C',
        "source": "NOAA/CPC RONI (ERSSTv6)"
    })
    print(f'RONI: {latest["season"]} {latest["year"]} {latest["value"]:+.2f} °C')


def update_mjo(climate: dict, status: dict, retrieved_at: str) -> None:
    # BoM exposes the same operational RMM series through a direct climate-data
    # endpoint and a graphics endpoint. The direct endpoint is preferred because
    # it is designed for data access and is less likely to reject automated clients.
    source_url = MJO_URL
    try:
        text = fetch_text(MJO_URL, referer=MJO_PAGE)
    except Exception as primary_exc:
        print(f"MJO primary endpoint failed ({type(primary_exc).__name__}: {primary_exc}); trying fallback...")
        source_url = MJO_FALLBACK_URL
        text = fetch_text(MJO_FALLBACK_URL, referer=MJO_PAGE)
    rows = parse_mjo(text)
    latest = rows[-1]
    indicator(climate, "mjo_rmm").update({
        "value": round(latest["amplitude"], 2),
        "units": None,
        "state": f'Phase {latest["phase"]} — {mjo_region(latest["phase"])}',
        "valid_time": latest["date"],
        "source_name": "Australian Bureau of Meteorology — Wheeler-Hendon RMM",
        "source_url": MJO_PAGE,
        "data_url": source_url,
        "retrieved_at": retrieved_at,
        "freshness_hours": 72,
        "phase": latest["phase"],
        "amplitude": round(latest["amplitude"], 3),
        "rmm1": round(latest["rmm1"], 4),
        "rmm2": round(latest["rmm2"], 4),
        "phase_region": mjo_region(latest["phase"]),
        "signal_strength": mjo_strength(latest["amplitude"]),
        "provisional": False,
        "note": "Observed Wheeler-Hendon RMM state only; no precipitation or flash-flood implication is inferred."
    })
    MJO_HISTORY.write_text(json.dumps({
        "schema_version": "1.0",
        "indicator": "mjo_rmm",
        "source_name": "Australian Bureau of Meteorology — Wheeler-Hendon RMM",
        "source_url": MJO_PAGE,
        "data_url": source_url,
        "retrieved_at": retrieved_at,
        "values": rows,
    }, indent=2) + "\n", encoding="utf-8")
    dataset(status, "MJO / RMM").update({
        "status": "live", "checked_at": retrieved_at,
        "message": f'Live — {latest["date"]}: phase {latest["phase"]}, amplitude {latest["amplitude"]:.2f}',
        "source": "Australian Bureau of Meteorology Wheeler-Hendon RMM"
    })
    print(f'MJO/RMM: {latest["date"]} phase {latest["phase"]}, amplitude {latest["amplitude"]:.2f}')



def update_pna(climate: dict, status: dict, retrieved_at: str) -> None:
    source_url = PNA_URL
    try:
        text = fetch_text(PNA_URL, referer=PNA_PAGE)
    except Exception as primary_exc:
        print(f"PNA primary endpoint failed ({type(primary_exc).__name__}: {primary_exc}); trying legacy fallback...")
        source_url = PNA_FALLBACK_URL
        text = fetch_text(PNA_FALLBACK_URL, referer=PNA_PAGE)

    rows = parse_pna(text)
    latest = rows[-1]
    value = latest["value"]
    indicator(climate, "pna").update({
        "value": round(value, 3),
        "units": "σ",
        "state": pna_state(value),
        "valid_time": latest["date"],
        "source_name": "NOAA Climate Prediction Center — Daily PNA Index (CDAS 500-hPa)",
        "source_url": PNA_PAGE,
        "data_url": source_url,
        "retrieved_at": retrieved_at,
        "freshness_hours": 72,
        "provisional": False,
        "note": "Observed standardized daily PNA index only; no precipitation or flash-flood implication is inferred."
    })
    PNA_HISTORY.write_text(json.dumps({
        "schema_version": "1.0",
        "indicator": "pna",
        "source_name": "NOAA Climate Prediction Center — Daily PNA Index (CDAS 500-hPa)",
        "source_url": PNA_PAGE,
        "data_url": source_url,
        "retrieved_at": retrieved_at,
        "values": rows,
    }, indent=2) + "\n", encoding="utf-8")
    dataset(status, "PNA").update({
        "status": "live", "checked_at": retrieved_at,
        "message": f'Live — {latest["date"]}: {value:+.3f} σ',
        "source": "NOAA/CPC daily PNA index"
    })
    print(f'PNA: {latest["date"]} {value:+.3f} σ')


def update_nao(climate: dict, status: dict, retrieved_at: str) -> None:
    source_url = NAO_URL
    try:
        text = fetch_text(NAO_URL, referer=NAO_PAGE)
    except Exception as primary_exc:
        print(f"NAO primary endpoint failed ({type(primary_exc).__name__}: {primary_exc}); trying legacy fallback...")
        source_url = NAO_FALLBACK_URL
        text = fetch_text(NAO_FALLBACK_URL, referer=NAO_PAGE)

    # CPC's NAO and PNA daily files use the same current/legacy layout.
    rows = parse_pna(text)
    latest = rows[-1]
    value = latest["value"]
    indicator(climate, "nao").update({
        "value": round(value, 3),
        "units": "σ",
        "state": nao_state(value),
        "valid_time": latest["date"],
        "source_name": "NOAA Climate Prediction Center — Daily NAO Index (CDAS 500-hPa)",
        "source_url": NAO_PAGE,
        "data_url": source_url,
        "retrieved_at": retrieved_at,
        "freshness_hours": 72,
        "provisional": False,
        "note": "Observed standardized daily NAO index only; no precipitation or flash-flood implication is inferred."
    })
    NAO_HISTORY.write_text(json.dumps({
        "schema_version": "1.0",
        "indicator": "nao",
        "source_name": "NOAA Climate Prediction Center — Daily NAO Index (CDAS 500-hPa)",
        "source_url": NAO_PAGE,
        "data_url": source_url,
        "retrieved_at": retrieved_at,
        "values": rows,
    }, indent=2) + "\n", encoding="utf-8")
    dataset(status, "NAO").update({
        "status": "live", "checked_at": retrieved_at,
        "message": f'Live — {latest["date"]}: {value:+.3f} σ',
        "source": "NOAA/CPC daily NAO index"
    })
    print(f'NAO: {latest["date"]} {value:+.3f} σ')


def record_error(status: dict, dataset_name: str, retrieved_at: str, exc: Exception) -> None:
    dataset(status, dataset_name).update({
        "status": "fetch_error",
        "checked_at": retrieved_at,
        "message": f"Fetch failed: {type(exc).__name__}: {exc}",
    })


def main() -> None:
    retrieved_at = utc_now()
    climate = json.loads(CLIMATE.read_text(encoding="utf-8"))
    status = json.loads(STATUS.read_text(encoding="utf-8"))
    failures: list[str] = []

    for name, fn in (("RONI / ENSO", update_roni), ("MJO / RMM", update_mjo), ("PNA", update_pna), ("NAO", update_nao)):
        try:
            fn(climate, status, retrieved_at)
        except Exception as exc:
            record_error(status, name, retrieved_at, exc)
            failures.append(f"{name}: {type(exc).__name__}: {exc}")

    climate["generated_at"] = retrieved_at
    status["generated_at"] = retrieved_at
    status["overall_status"] = "current" if not failures else "degraded"
    CLIMATE.write_text(json.dumps(climate, indent=2) + "\n", encoding="utf-8")
    STATUS.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")

    if failures:
        raise SystemExit("\n".join(failures))
    print("Phase 1D live climate ingestion complete.")


if __name__ == "__main__":
    main()
