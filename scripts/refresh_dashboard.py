"""Dispatch independent collections; preserve files when only check timestamps change."""
import argparse
import json
from pathlib import Path
import update_climate_data as climate
import update_ocean_data as ocean
import update_sport_sst as sport

DATA = Path(__file__).resolve().parents[1] / 'data'
CHECK_FIELDS = {'generated_at', 'retrieved_at', 'checked_at', 'attempted_at'}

def substantive(value):
    if isinstance(value, dict):
        return {k: substantive(v) for k, v in value.items() if k not in CHECK_FIELDS}
    if isinstance(value, list):
        return [substantive(v) for v in value]
    return value

def restore_unchanged(before):
    for path, raw in before.items():
        if path.exists() and substantive(json.loads(raw)) == substantive(json.loads(path.read_bytes())):
            path.write_bytes(raw)

def refresh_observed():
    now = climate.utc_now()
    current = json.loads(climate.CLIMATE.read_text())
    status = json.loads(climate.STATUS.read_text())
    failures = []
    for name, fn in [('RONI / ENSO', climate.update_roni), ('MJO / RMM', climate.update_mjo),
                     ('PNA', climate.update_pna), ('NAO', climate.update_nao)]:
        try:
            fn(current, status, now)
        except Exception as exc:
            climate.record_error(status, name, now, exc)
            failures.append(name)
    current['generated_at'] = status['generated_at'] = now
    status['overall_status'] = 'degraded' if failures else 'current'
    climate.CLIMATE.write_text(json.dumps(current, indent=2)+'\n')
    climate.STATUS.write_text(json.dumps(status, indent=2)+'\n')
    if failures:
        print('::warning::Observed sources unavailable: '+', '.join(failures))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--collection', choices=['sport', 'observed', 'daily', 'all'], default='all')
    group = parser.parse_args().collection
    before = {p: p.read_bytes() for p in DATA.rglob('*.json')}
    try:
        if group in ('observed', 'all'):
            refresh_observed()
        if group in ('sport', 'all'):
            sport.main()
        if group in ('daily', 'all'):
            now = climate.utc_now()
            for fn in [climate.update_forward_guidance, climate.update_structured_gefs_teleconnections,
                       climate.update_structured_ecmwf_evidence]:
                warnings = fn(now)
                if warnings:
                    print('::warning::'+str(warnings))
            ocean.main()
    finally:
        restore_unchanged(before)

if __name__ == '__main__':
    main()
