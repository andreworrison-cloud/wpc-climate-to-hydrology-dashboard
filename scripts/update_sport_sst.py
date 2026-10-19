"""NASA SPoRT source composite cache; use its published inventory, never guess image dates."""
import concurrent.futures
import hashlib
import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from update_ocean_data import validate_png
ROOT=Path(__file__).resolve().parents[1]
BASE='https://weather.ndc.nasa.gov'
DOMAINS={'global':('global','Global'),'pacific':('east_pacific','East Pacific'),'atlantic':('west_atlantic','West Atlantic')}

def inventory(ds,product,location):
    url=BASE+'/cgi-bin/live-data/DynamicData.py?'+urllib.parse.urlencode(dict(dataset=ds,product=product,location=location,mode='nrt'))
    with urllib.request.urlopen(url,timeout=35) as r:d=json.load(r)
    if any(d.get(key,{}).get('cgi_key')!=value for key,value in [('thisDataset',ds),('thisProduct',product),('thisLocation',location)]):
        raise ValueError('NASA inventory returned a different product/domain')
    valid=[]
    for frame in d.get('data',[]):
        dt=datetime.strptime(frame['time'],'%b %d, %Y - %H:%M UTC').replace(tzinfo=timezone.utc)
        if not frame['path'].startswith('/sport/dynamic/enhanced_sst/') or '..' in frame['path']:raise ValueError('Unexpected NASA image path')
        if dt<=datetime.now(timezone.utc):valid.append((dt,frame['path'],url))
    if not valid:raise ValueError('No dated frames')
    return max(valid)

def main():
    folder=ROOT/'data/ocean';dest=folder/'sport_manifest.json'
    old={r['id']:r for r in json.loads(dest.read_text()).get('products',[])} if dest.exists() else {}
    now=datetime.now(timezone.utc).isoformat()
    def fetch(item):
        product,region,(location,label)=item;key='sport_'+product+'_'+region
        source_product='sst_legacy' if product=='sst' else 'anomaly'
        row=dict(id=key,provider='sport',product=product,region=region,region_label=label,source_name='NASA SPoRT',
                 source_url=BASE+'/sport/viewer/?dataset=esst06&product='+source_product+'&location='+location,
                 units='°C',baseline='MERRA-2 1991–2020' if product=='ssta' else None,version='SPoRT enhanced SST composite',resolution_km=2,attempted_at=now)
        try:
            frames=[];errors=[]
            for ds in ['esst06','esst18']:
                try:frames.append(inventory(ds,source_product,location))
                except Exception as e:errors.append(str(e))
            if not frames:raise ValueError('; '.join(errors))
            dt,path,inv=max(frames)
            url=BASE+path
            prior=old.get(key,{})
            cached=ROOT/prior.get('image_path','missing')
            if (prior.get('image_url')==url and prior.get('valid_time')==dt.isoformat()
                    and prior.get('sha256') and cached.is_file()
                    and hashlib.sha256(cached.read_bytes()).hexdigest()==prior['sha256']):
                row={**prior, 'status': 'stale' if (datetime.now(timezone.utc)-dt).total_seconds()>72*3600 else 'available',
                     'inventory_warnings': errors}
                row.pop('error',None)
                print(key,'unchanged: no image download',flush=True)
                return row
            with urllib.request.urlopen(url,timeout=45) as r:raw=r.read(12_000_001);modified=r.headers.get('Last-Modified')
            if len(raw)>12_000_000:raise ValueError('Image too large')
            width,height=validate_png(raw)
            target=folder/(key+'.png');tmp=target.with_suffix('.tmp');tmp.write_bytes(raw);tmp.replace(target)
            row.update(status='stale' if (datetime.now(timezone.utc)-dt).total_seconds()>72*3600 else 'available',
                       image_path='data/ocean/'+target.name,image_url=url,inventory_url=inv,valid_time=dt.isoformat(),
                       retrieved_at=now,source_last_modified=modified,sha256=hashlib.sha256(raw).hexdigest(),width=width,height=height,
                       inventory_warnings=errors)
        except Exception as exc:
            prior=old.get(key,{})
            cached=ROOT/prior.get('image_path','missing')
            if prior.get('sha256') and cached.is_file() and hashlib.sha256(cached.read_bytes()).hexdigest()==prior['sha256']:
                row={**prior,'status':'stale','attempted_at':now}
            else:row['status']='unavailable'
            row['error']=str(exc)
        print(key,row['status'],flush=True);return row
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(fetch,[(p,r,d) for p in ['sst','ssta'] for r,d in DOMAINS.items()]))
    data=dict(schema_version='1.0',generated_at=now,active_prediction=False,scientific_role='observed_ocean_context',products=rows)
    tmp=dest.with_suffix('.tmp');tmp.write_text(json.dumps(data,indent=2)+'\n');tmp.replace(dest)
if __name__=='__main__':main()
