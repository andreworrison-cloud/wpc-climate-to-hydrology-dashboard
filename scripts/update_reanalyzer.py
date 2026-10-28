"""Climate Reanalyzer display context. Independent of Q3; standard library only."""
from pathlib import Path
from datetime import date, datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
import calendar, hashlib, json, math, re, struct, time, urllib.request, urllib.error, zlib

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'data/reanalyzer'
BASE='https://climatereanalyzer.org/'
REGIONS={
 'world2':('Global belt','60°S–60°N, all longitudes'),
 'nino3.4':('Niño 3.4 · Pacific','5°S–5°N, 170–120°W'),
 'natlan':('North Atlantic','0–60°N, 80–0°W'),
 'gomex':('Gulf of Mexico','20–30°N, 98–82°W'),
}
DOMAINS={'global':'world-wt3','north_atlantic':'natlan-ced'}
ATMOS_DOMAINS={'global':'world-wt'}
REGIONAL_DOMAINS={'north_america':'na-lc','pacific':'pacific-ced','atlantic':'natlan-ced'}
REGIONAL_FIELDS=['pwtr','pwtr-anomsd','gph500-anomsd']
VARIABLES=['pwtr','pwtr-anomsd','gph500-anomsd','ws250-mslp']

def sha(b):return hashlib.sha256(b).hexdigest()
def atomic(path,b):
 path.parent.mkdir(parents=True,exist_ok=True)
 tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_bytes(b);tmp.replace(path)
def get(url,headers=None):
 if not url.startswith(BASE):raise ValueError('Unexpected source host')
 req=urllib.request.Request(url,headers={'User-Agent':'WPC-experimental-climate-dashboard/1.0',**(headers or {})})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=25) as r:
    b=r.read(12_000_001)
    if len(b)>12_000_000:raise ValueError('Source exceeds size limit')
    return b,dict(r.headers)
  except urllib.error.HTTPError as ex:
   if ex.code not in (429,500,502,503,504) or attempt==2:raise
   time.sleep(1+attempt)

def numeric(v):return isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
def climatology_index(d):
 # Source climatology is a 366-day calendar. Actual annual series use real day-of-year.
 return (date(2000,d.month,d.day)-date(2000,1,1)).days

def parse_series(records,prelim_year,today):
 if not isinstance(records,list):raise ValueError('Expected source series list')
 by={r['name']:r for r in records}
 if len(by)!=len(records):raise ValueError('Duplicate source series')
 clim=by['1991-2020']['data']
 if len(clim)!=366 or not all(numeric(v) and -3<=v<=40 for v in clim):raise ValueError('Invalid 1991–2020 climatology')
 years=sorted(int(n) for n in by if re.fullmatch(r'\d{4}',n))
 if not years or prelim_year not in years:raise ValueError('Preliminary year not present in annual series')
 points={}
 for year in years[-3:]:
  vals=by[str(year)]['data'];length=366 if calendar.isleap(year) else 365
  if len(vals)!=366 or any(v is not None for v in vals[length:]):raise ValueError('Unexpected annual calendar layout')
  for i,v in enumerate(vals[:length]):
   if v is not None: points[date(year,1,1)+timedelta(days=i)]=(v,False)
 for i,v in enumerate(by['Preliminary']['data']):
  if v is None:continue
  d=date(prelim_year,1,1)+timedelta(days=i)
  if d.year!=prelim_year:raise ValueError('Preliminary date spills into next year')
  # Finalized source values take precedence over a stale preliminary overlap.
  if d not in points:points[d]=(v,True)
 rows=[]
 for d,(v,preliminary) in sorted(points.items()):
  if d>today:raise ValueError('Future observation in source series')
  if not numeric(v) or not -3<=v<=40:raise ValueError('Invalid SST value')
  c=clim[climatology_index(d)]
  rows.append(dict(date=d.isoformat(),sst_c=v,climatology_c=c,anomaly_c=round(v-c,6),preliminary=preliminary))
 if not rows:raise ValueError('No observations')
 cutoff=date.fromisoformat(rows[-1]['date'])-timedelta(days=731)
 return [r for r in rows if date.fromisoformat(r['date'])>=cutoff]

def png_valid(b):
 if b[:8]!=b'\x89PNG\r\n\x1a\n':raise ValueError('Response is not a PNG')
 pos=8;types=[]
 while pos+12<=len(b):
  size=struct.unpack('>I',b[pos:pos+4])[0];kind=b[pos+4:pos+8];data=b[pos+8:pos+8+size]
  if len(data)!=size or pos+12+size>len(b):raise ValueError('Truncated PNG')
  crc=struct.unpack('>I',b[pos+8+size:pos+12+size])[0]
  if zlib.crc32(kind+data)&0xffffffff!=crc:raise ValueError('PNG CRC mismatch')
  types.append(kind);pos+=size+12
  if kind==b'IEND':break
 if not {b'IHDR',b'IDAT',b'IEND'}.issubset(types):raise ValueError('Incomplete PNG')
 w,h=struct.unpack('>II',b[16:24])
 if min(w,h)<200:raise ValueError('Image too small to be a map')
 return w,h

def image(url,relative,previous,now):
 path=ROOT/relative;headers={}
 if path.exists() and previous.get('sha256')==sha(path.read_bytes()):
  if previous.get('etag'):headers['If-None-Match']=previous['etag']
  if previous.get('last_modified'):headers['If-Modified-Since']=previous['last_modified']
 try:
  b,h=get(url,headers);w,height=png_valid(b);digest=sha(b)
  if not path.exists() or sha(path.read_bytes())!=digest:atomic(path,b)
  return dict(path=relative,source_url=url,sha256=digest,width=w,height=height,etag=h.get('ETag'),last_modified=h.get('Last-Modified'),retrieved_at=now,status='current')
 except urllib.error.HTTPError as ex:
  if ex.code==304 and path.exists():return {**previous,'status':'current','error':None}
  raise

def retained(previous,error,**defaults):
 print('::warning::Climate Reanalyzer: '+str(error))
 return {**defaults,**previous,'status':'retained' if previous else 'unavailable','error':str(error)[:240]}

def regional_context(old,now):
 # Publish the shared regional family together; never mix cycles after partial failure.
 keys=[(d,v) for d in REGIONAL_DOMAINS for v in REGIONAL_FIELDS]
 def inventory(key):
  d,v=key
  raw,_=get(BASE+'wx/fcst/maps/gfs/dates/gfs_'+REGIONAL_DOMAINS[d]+'_'+v+'_dates.json')
  dates=json.loads(raw)
  if not isinstance(dates,list):raise ValueError('Invalid cycle inventory')
  return key,(set(x for x in dates if isinstance(x,str) and re.fullmatch(r'\d{4}-\d{2}-\d{2}-\d{2}z',x)),sha(raw))
 def fetch_map(key,cycle,cycle_hash):
  d,v=key;native=REGIONAL_DOMAINS[d]
  folder=BASE+'wx/fcst/maps/gfs/'+cycle+'/'+native+'/'+v+'/'
  raw,_=get(folder+'flist.json');names=json.loads(raw)
  stamp=datetime.strptime(cycle,'%Y-%m-%d-%Hz').strftime('%Y%m%d%H')
  name='gfs_'+native+'_'+v+'_'+stamp+'_000.png'
  if not isinstance(names,list) or name not in names:raise ValueError('Common-cycle f000 map absent: '+d+'/'+v)
  payload,headers=get(folder+name);w,h=png_valid(payload);digest=sha(payload)
  relative='data/reanalyzer/maps/gfs_'+d+'_'+v+'_'+digest[:16]+'.png'
  atomic(ROOT/relative,payload)
  valid=datetime.strptime(cycle,'%Y-%m-%d-%Hz').replace(tzinfo=timezone.utc).isoformat()
  return dict(domain=d,variable=v,native_domain=native,product_kind='forecast_snapshot',alignment_policy='common-regional-f000-v1',
   path=relative,source_url=folder+name,source_page=BASE+'wx/fcst/?mdl_id=gfs&dm_id='+native+'&wm_id='+v,
   sha256=digest,width=w,height=h,retrieved_at=now,status='current',initialization_time=valid,valid_time=valid,lead_hours=0,
   inventory_sha256=sha(raw),cycle_inventory_sha256=cycle_hash,time_basis='GFS initialization-time snapshot (f000), not a daily average.')
 try:
  with ThreadPoolExecutor(max_workers=4) as pool:inventories=dict(pool.map(inventory,keys))
  common=set.intersection(*(inventories[k][0] for k in keys))
  if not common:raise ValueError('No common regional GFS cycle')
  cycle=max(common)
  with ThreadPoolExecutor(max_workers=4) as pool:records=list(pool.map(lambda k:fetch_map(k,cycle,inventories[k][1]),keys))
 except Exception as ex:
  prior=[m for m in old.get('atmosphere',{}).get('maps',[]) if m.get('alignment_policy')=='common-regional-f000-v1' and (m['domain'],m['variable']) in keys]
  complete=len(prior)==len(keys) and {(m['domain'],m['variable']) for m in prior}==set(keys) and len({(m['initialization_time'],m['valid_time'],m['lead_hours']) for m in prior})==1
  records=[{**m,'status':'retained','error':str(ex)[:240]} for m in prior] if complete else [dict(domain=d,variable=v,status='unavailable',error=str(ex)[:240]) for d,v in keys]
  cycle=None
 # Native source does not offer the jet field for these two basin projections.
 for d in ['pacific','atlantic']:
  records.append(dict(domain=d,variable='ws250-mslp',status='unsupported',error='Not offered for this native regional map by Climate Reanalyzer.'))
 if cycle:
  try:records.append(fetch_map(('north_america','ws250-mslp'),cycle,None))
  except Exception as ex:records.append(dict(domain='north_america',variable='ws250-mslp',status='unavailable',error=str(ex)[:240]))
 else:
  records.append(dict(domain='north_america',variable='ws250-mslp',status='unavailable',error='Regional refresh incomplete; jet withheld to preserve common cycle.'))
 return records

def main():
 now=datetime.now(timezone.utc).isoformat();today=datetime.now(timezone.utc).date()
 manifest=OUT/'manifest.json';old=json.loads(manifest.read_text()) if manifest.exists() else {}
 result=dict(schema_version=1,checked_at=now,attribution='ClimateReanalyzer.org / Climate Change Institute, University of Maine; NOAA OISST v2.1 and NOAA/NCEP GFS',license='CC BY 4.0',science_role='display_context_only',q3_input=False,sst_regions=[],animation={'domains':{},'variables':{}},atmosphere={'maps':[]})
 # Read the source's year declaration; never infer preliminary year from our clock.
 try:
  script,_=get(BASE+'clim/sst_daily/js/sst_daily.min.js?v=002')
  match=re.search(rb'prelim_year\s*=\s*(\d{4})',script)
  if not match:raise ValueError('Preliminary year declaration absent')
  prelim_year=int(match[1])
 except Exception as ex:prelim_year=None;year_error=ex
 for region,(label,bounds) in REGIONS.items():
  prior=next((r for r in old.get('sst_regions',[]) if r['id']==region),{})
  rec=dict(id=region,label=label,bounds=bounds,source_page=BASE+'clim/sst_daily/?dm_id='+region,baseline='1991–2020; source 5-day smoothed daily climatology',rows=[])
  try:
   if prelim_year is None:raise year_error
   url=BASE+'clim/sst_daily/json_2clim/oisst2.1_'+region+'_sst_day.json';b,_=get(url)
   rows=parse_series(json.loads(b),prelim_year,today)
   rec.update(rows=rows,source_url=url,source_sha256=sha(b),retrieved_at=now,status='current',preliminary_year=prelim_year)
  except Exception as ex:rec=retained(prior,ex,**rec)
  result['sst_regions'].append(rec)
 # Independent published inventories for absolute SST and anomalies. North Pacific reuses global pixels.
 for variable,source_variable in [('sst','sst'),('ssta','sstanom')]:
  groups={}
  oldgroups=old.get('animation',{}).get('variables',{}).get(variable,{}).get('domains',{})
  if variable=='ssta' and not oldgroups:oldgroups=old.get('animation',{}).get('domains',{})
  try:
   inventory,_=get(BASE+f'clim/daily_maps/json/dates_{source_variable}.json');dates=json.loads(inventory)
   end=date(*map(int,dates[3:6]))
   if end>today:raise ValueError('Future SST animation date')
   folder=source_variable+('_1991-2020' if variable=='ssta' else '')
   for domain,source_domain in DOMAINS.items():
    prior=oldgroups.get(domain,{})
    previous={f['valid_date']:f for f in prior.get('frames',[])}
    def frame(i):
     d=end-timedelta(days=29-i);url=BASE+f'clim/daily_maps/maps/{folder}/{source_domain}/{d.year}/{source_variable}_{source_domain}_{d.year}_d{d.timetuple().tm_yday:03d}.png'
     oldframe=previous.get(d.isoformat(),{})
     try:return {**image(url,f'data/reanalyzer/maps/{variable}_{domain}_{d}.png',oldframe,now),'valid_date':d.isoformat()}
     except Exception as ex:
      if oldframe and (ROOT/oldframe['path']).exists():return {**oldframe,'status':'retained','error':str(ex)[:160]}
      print('::warning::Missing animation frame '+variable+' '+d.isoformat()+' '+domain);return None
    with ThreadPoolExecutor(max_workers=4) as pool:frames=[f for f in pool.map(frame,range(30)) if f]
    groups[domain]={'frames':frames,'status':'current' if len(frames)==30 and all(f['status']=='current' for f in frames) else 'partial','source_page':BASE+'clim/daily_maps/?wm_id='+source_variable+'&dm_id='+source_domain,'baseline':'1991–2020' if variable=='ssta' else None,'units':'°C','inventory_sha256':sha(inventory)}
  except Exception as ex:
   for domain in DOMAINS:groups[domain]=retained(oldgroups.get(domain,{}),ex,frames=[])
  groups['north_pacific']={**groups['global'],'render_view':'north_pacific_crop','view_note':'Display crop of the global source map; original projection retained. Not a separately computed regional field.'}
  result['animation']['variables'][variable]={'domains':groups}
 # Additive schema: preserve anomaly domains for dashboard tabs opened before the variable selector.
 result['animation']['domains']=result['animation']['variables']['ssta']['domains']
 for domain,source_domain in ATMOS_DOMAINS.items():
  for variable in VARIABLES:
   prior=next((m for m in old.get('atmosphere',{}).get('maps',[]) if m['domain']==domain and m['variable']==variable),{})
   rec=dict(domain=domain,variable=variable,valid_time=None,initialization_time=None,time_basis='Read valid date from unmodified source image; initialization unavailable in verified metadata; HTTP dates are retrieval metadata only',baseline='1991–2020 (source anomaly products)',source_page=BASE+'wx/todays-weather/?var_id='+variable)
   try:rec.update(image(BASE+f'wx/todays-weather/maps/gfs_{source_domain}_{variable}_d1.png',f'data/reanalyzer/maps/gfs_{domain}_{variable}.png',prior,now))
   except Exception as ex:rec=retained(prior,ex,**rec)
   result['atmosphere']['maps'].append(rec)
 result['atmosphere']['maps'].extend(regional_context(old,now))
 atomic(manifest,(json.dumps(result,indent=2,ensure_ascii=False,allow_nan=False)+'\n').encode())
 # Only prune this collector's dated image cache, after the new manifest is durable.
 keep={f['path'] for product in result['animation']['variables'].values() for group in product['domains'].values() for f in group.get('frames',[])}
 # Grace period for existing open tabs that keep their user-selected animation frame lists.
 for pattern in ['ssta_*.png','sst_*.png']:
  for path in (OUT/'maps').glob(pattern):
   match=re.search(r'(\d{4}-\d{2}-\d{2})\.png$',path.name)
   if path.relative_to(ROOT).as_posix() not in keep and match and date.fromisoformat(match[1])<today-timedelta(days=60):path.unlink()
 print('Climate Reanalyzer:',[(r['id'],r['status'],len(r['rows'])) for r in result['sst_regions']],'; frames',sum(len(v['frames']) for v in result['animation']['domains'].values()))
 return result
if __name__=='__main__':main()


