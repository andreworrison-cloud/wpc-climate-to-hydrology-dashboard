"""Live climate-data ingestion for the WPC Climate-to-Hydrology Dashboard.

Phase 1B activates two observed climate indicators:
  * NOAA/CPC ERSSTv6 Relative Oceanic Nino Index (RONI)
  * Bureau of Meteorology Wheeler-Hendon Realtime Multivariate MJO (RMM)

PNA and NAO remain interface placeholders until their source adapters are
validated. No precipitation or flash-flood prediction is inferred here.
"""
from __future__ import annotations

from datetime import datetime, timezone
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

RONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt"
RONI_PAGE = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/"
MJO_URL = "https://www.bom.gov.au/climate/mjo/graphics/rmm.74toRealtime.txt"
MJO_PAGE = "https://www.bom.gov.au/climate/mjo/"
USER_AGENT = "WPC-Climate-to-Hydrology-Dashboard/Phase1B (+GitHub Actions)"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def fetch_text(url: str, attempts: int = 3) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
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
    rows = parse_mjo(fetch_text(MJO_URL))
    latest = rows[-1]
    indicator(climate, "mjo_rmm").update({
        "value": round(latest["amplitude"], 2),
        "units": None,
        "state": f'Phase {latest["phase"]} — {mjo_region(latest["phase"])}',
        "valid_time": latest["date"],
        "source_name": "Australian Bureau of Meteorology — Wheeler-Hendon RMM",
        "source_url": MJO_PAGE,
        "data_url": MJO_URL,
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
        "data_url": MJO_URL,
        "retrieved_at": retrieved_at,
        "values": rows,
    }, indent=2) + "\n", encoding="utf-8")
    dataset(status, "MJO / RMM").update({
        "status": "live", "checked_at": retrieved_at,
        "message": f'Live — {latest["date"]}: phase {latest["phase"]}, amplitude {latest["amplitude"]:.2f}',
        "source": "Australian Bureau of Meteorology Wheeler-Hendon RMM"
    })
    print(f'MJO/RMM: {latest["date"]} phase {latest["phase"]}, amplitude {latest["amplitude"]:.2f}')


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

    for name, fn in (("RONI / ENSO", update_roni), ("MJO / RMM", update_mjo)):
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
    print("Phase 1B live climate ingestion complete.")


if __name__ == "__main__":
    main()
