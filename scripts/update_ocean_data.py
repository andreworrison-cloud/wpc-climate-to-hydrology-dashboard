"""Cache NOAA source-rendered SST maps, preserving source legends and timestamps.
No SST values are extracted from pixels; no input to Q3 is created here.
"""
import hashlib
import json
import struct
import urllib.request
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://www.coralreefwatch.noaa.gov/'
PRODUCTS = {
    'sst': ('data_current/5km/v3.1_op/daily/png/coraltemp_v3.1_{region}_current.png', 'product/5km/index_5km_sst.php', None, 'CoralTemp v3.1'),
    'ssta': ('data_current/5km/v3.1-clim19912020-v1/daily/png/ct5km_ssta_v3.1-clim19912020-v1_{region}_current.png', 'product/5km/index_5km_ssta_clim19912020.php', '1991–2020', '3.1-clim19912020-v1'),
}
REGIONS = {'global': 'Global', 'pacific': 'Pacific', 'atlantic': 'Atlantic'}

def validate_png(raw):
    if len(raw) < 10000 or raw[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Source did not return a complete-size PNG')
    width, height = struct.unpack('>II', raw[16:24])
    if min(width, height) < 200 or b'IEND' not in raw[-20:]:
        raise ValueError('PNG dimensions/end marker invalid')
    return width, height

def main():
    folder = ROOT / 'data/ocean'
    folder.mkdir(parents=True, exist_ok=True)
    dest = folder / 'manifest.json'
    previous = json.loads(dest.read_text()) if dest.exists() else {}
    old = {r['id']: r for r in previous.get('products', [])}
    now = datetime.now(timezone.utc).isoformat()
    rows = []
    for product, (template, page, baseline, version) in PRODUCTS.items():
        for region, label in REGIONS.items():
            key = f'{product}_{region}'
            # NOAA does not publish a corresponding North Atlantic SST panel.
            # Use a verified client-side Atlantic crop of the global source image
            # for BOTH variables, preserving identical Atlantic view behavior.
            if region == 'atlantic':
                global_row = next(r for r in rows if r['id'] == f'{product}_global')
                rows.append({**global_row, 'id': key, 'region': region,
                             'region_label': 'Atlantic basin',
                             'render_view': 'noaa_atlantic_crop',
                             'coverage_note': 'Atlantic crop of NOAA global pixels: 100°W–20°E, 5°S–60°N. Original header and color legend retained; Fit preserves the basin.'})
                continue
            url = BASE + template.format(region=region)
            row = dict(id=key, product=product, region=region, region_label=label,
                       source_name='NOAA Coral Reef Watch', source_url=BASE+page,
                       image_url=url, units='°C', baseline=baseline, version=version,
                       valid_time=None, valid_time_note='Observation date is printed on the NOAA map; HTTP timestamps are delivery metadata.',
                       attempted_at=now)
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'WPC-Climate-Research-Dashboard/1.0'})
                with urllib.request.urlopen(req, timeout=45) as response:
                    raw = response.read(12_000_001)
                    modified = response.headers.get('Last-Modified')
                if len(raw) > 12_000_000:
                    raise ValueError('Unexpected image size')
                width, height = validate_png(raw)
                path = folder / f'{key}.png'
                temporary = path.with_suffix('.tmp')
                temporary.write_bytes(raw)
                temporary.replace(path)
                row.update(status='available', image_path=f'data/ocean/{key}.png',
                           retrieved_at=now, source_last_modified=modified,
                           sha256=hashlib.sha256(raw).hexdigest(), width=width, height=height)
                if modified and (datetime.now(timezone.utc)-parsedate_to_datetime(modified)).total_seconds()>3*86400:
                    row['status']='stale'
            except Exception as exc:
                prior = old.get(key, {})
                cached = ROOT / prior.get('image_path', 'does-not-exist')
                if prior.get('sha256') and cached.is_file() and hashlib.sha256(cached.read_bytes()).hexdigest()==prior['sha256']:
                    row.update({k: prior[k] for k in ['image_path','retrieved_at','source_last_modified','sha256','width','height'] if k in prior})
                    row['status']='stale'
                else:
                    row['status']='unavailable'
                row['error']=f'{type(exc).__name__}: {exc}'
            rows.append(row)
            print(key, row['status'], flush=True)
    manifest=dict(schema_version='1.0', generated_at=now, scientific_role='observed_ocean_context',
                  active_prediction=False, products=rows)
    tmp=dest.with_suffix('.tmp'); tmp.write_text(json.dumps(manifest,indent=2)+'\n'); tmp.replace(dest)
    # Failed sources remain visible in the manifest, rather than silently looking current.

if __name__ == '__main__':
    main()
