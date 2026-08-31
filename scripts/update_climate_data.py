"""Live climate-data ingestion for the WPC Climate-to-Hydrology Dashboard.

Phase 1A activates NOAA/CPC Relative Oceanic Nino Index (RONI) ingestion only.
MJO/RMM, PNA, and NAO remain interface placeholders until their own source
adapters are validated.

Scientific guardrail: RONI is displayed as an observed climate indicator. This
script does not infer precipitation or flash-flood outcomes from RONI.
"""
from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import urllib.request
import time

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
CLIMATE = DATA / "climate_current.json"
STATUS = DATA / "data_status.json"
HISTORY = DATA / "roni_history.json"

RONI_URL = "https://www.cpc.ncep.noaa.gov/data/indices/RONI.ascii.txt"
RONI_PAGE = "https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso/roni/"
USER_AGENT = "WPC-Climate-to-Hydrology-Dashboard/Phase1A (+GitHub Actions)"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def fetch_text(url: str, attempts: int = 3) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                return response.read().decode("utf-8")
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


def roni_state(value: float) -> str:
    # This describes the current RONI anomaly only. It intentionally does not
    # declare an El Nino/La Nina episode, which requires broader persistence
    # and coupled-atmosphere context in official NOAA assessment.
    if value >= 0.5:
        return "Positive RONI anomaly"
    if value <= -0.5:
        return "Negative RONI anomaly"
    return "Near-neutral RONI anomaly"


def update_indicator(climate: dict, latest: dict, retrieved_at: str) -> None:
    for indicator in climate["indicators"]:
        if indicator.get("id") == "roni":
            indicator.update({
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
            return
    raise KeyError("climate_current.json is missing indicator id='roni'")


def update_status(status: dict, retrieved_at: str, ok: bool, message: str) -> None:
    status["generated_at"] = retrieved_at
    for dataset in status["datasets"]:
        if dataset.get("name") == "RONI / ENSO":
            dataset.update({
                "status": "live" if ok else "fetch_error",
                "checked_at": retrieved_at,
                "message": message,
                "source": "NOAA/CPC RONI (ERSSTv6)"
            })
            break
    # Overall interface remains online if the established scaffold is healthy;
    # a source-specific error is surfaced in the RONI health row.
    status["overall_status"] = "current"


def main() -> None:
    retrieved_at = utc_now()
    climate = json.loads(CLIMATE.read_text(encoding="utf-8"))
    status = json.loads(STATUS.read_text(encoding="utf-8"))

    try:
        rows = parse_roni(fetch_text(RONI_URL))
        latest = rows[-1]
        update_indicator(climate, latest, retrieved_at)
        climate["generated_at"] = retrieved_at
        history = {
            "schema_version": "1.0",
            "indicator": "roni",
            "source_name": "NOAA Climate Prediction Center — RONI (ERSSTv6)",
            "source_url": RONI_PAGE,
            "data_url": RONI_URL,
            "retrieved_at": retrieved_at,
            "provisional_latest": True,
            "values": rows,
        }
        update_status(
            status,
            retrieved_at,
            True,
            f'Live — latest {latest["season"]} {latest["year"]}: {latest["value"]:+.2f} °C',
        )
        CLIMATE.write_text(json.dumps(climate, indent=2) + "\n", encoding="utf-8")
        HISTORY.write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")
        STATUS.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
        print(f'RONI live ingestion complete: {latest["season"]} {latest["year"]} {latest["value"]:+.2f} °C')
    except Exception as exc:
        # Preserve the last known good climate value/history and surface the
        # retrieval failure through data_status.json.
        update_status(status, retrieved_at, False, f"Fetch failed: {type(exc).__name__}: {exc}")
        STATUS.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
        raise


if __name__ == "__main__":
    main()
