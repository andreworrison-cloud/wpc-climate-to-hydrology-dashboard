"""Reproducible presentation data. No model fitting, rescoring or activation.

Research input identities are pinned by the committed implementation checkpoint.
Live figures are original CPC products, never interpreted from chart pixels.
"""
import argparse
from collections import defaultdict
import csv
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import hashlib
import io
import json
import math
from pathlib import Path
import re
import statistics
import urllib.request
import urllib.error
import tempfile
from concurrent.futures import ThreadPoolExecutor

ROOT=Path(__file__).resolve().parents[1]
CPC='https://www.cpc.ncep.noaa.gov'
DOMAINS=['West Coast','Southwest','Interior Mountain West','Northern Plains','Southern Plains','Southeast','Northeast','National CONUS']
TARGETS=['AreaMeanExtreme_Any','AreaFrac25Extreme_Any']
FIGURES={
 'upper_ocean':('Upper-ocean warmth','/products/analysis_monitoring/enso_update/heat-last-year-hr.png'),
 'subsurface':('Temperature below the surface','/products/analysis_monitoring/ocean/weeklyenso_clim_81-10/wkteq_xz.gif'),
 'equatorial_sst':('Equatorial SST evolution','/products/analysis_monitoring/enso_update/ssttlon5_c.gif'),
 'winds':('850-hPa wind anomalies','/products/analysis_monitoring/enso_update/uv850-30d.gif'),
 'olr':('Tropical convection / OLR','/products/analysis_monitoring/enso_update/olra-30d.gif'),
 'cpc_6_10':('Days 6–10','/products/predictions/610day/610prcp.new.gif'),
 'cpc_8_14':('Days 8–14','/products/predictions/814day/814prcp.new.gif'),
 'cpc_3_4':('Weeks 3–4 · experimental','/products/predictions/WK34/gifs/WK34prcp.gif')}

def sha(b):return hashlib.sha256(b).hexdigest()
def need(ok,msg):
 if not ok:raise ValueError(msg)
def num(v):
 if v=='':return None
 f=float(v);return int(f) if math.isfinite(f) and f.is_integer() else f if math.isfinite(f) else None
def encoded(v):return (json.dumps(v,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n').encode()
def write(p,b):
 p.parent.mkdir(exist_ok=True,parents=True)
 if p.is_file() and p.read_bytes()==b:return
 with tempfile.NamedTemporaryFile(dir=p.parent,prefix=p.name+'.',suffix='.tmp',delete=False) as f:f.write(b);tmp=Path(f.name)
 tmp.replace(p)
def fetch(url,prior=None):
 headers={'User-Agent':'WPC-Climate-Hydrology/1.0'}
 if prior:
  if prior.get('etag'):headers['If-None-Match']=prior['etag']
  if prior.get('source_last_modified'):headers['If-Modified-Since']=prior['source_last_modified']
 try:
  with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=35) as r:
   raw=r.read(12_000_001);need(len(raw)<=12_000_000,'Source exceeds size limit');return raw,{k.lower():v for k,v in r.headers.items()}
 except urllib.error.HTTPError as e:
  if e.code==304:return None,{}
  raise

def research(source):
 checkpoint=(ROOT/'docs/CLIMATE_PRESENTATION_IMPLEMENTATION_CHECKPOINT_20261024.md').read_text()
 registry=re.findall(r'^\| (Phase[^|]+?) \| ([A-Za-z0-9_-]+) \| ([a-f0-9]{64}) \|$',checkpoint,re.M)
 need(len(registry)==10,'Source registry must contain the original ten files')
 raw={n:(source/n).read_bytes() for n,_,_ in registry}
 for n,_,h in registry:need(sha(raw[n])==h,'Source identity mismatch: '+n)
 def rows(n):return list(csv.DictReader(raw[n].decode().splitlines()))
 rates=rows('Phase4B_ENSO_State_Descriptive_Rates.csv');inference=rows('Phase4B_Primary_Continuous_RONI_Inference.csv');monthly=rows('Phase4B_Monthly_Extreme_Precipitation_Rates_2004_2025.csv')
 need(len(rates)==288 and len(inference)==96 and len(monthly)==2112,'Original RONI family incomplete')
 need(sum(r['Global96_FDR_0p05']=='True' for r in inference)==2,'Original global96 result')
 roni=[]
 for i in inference:
  if i['Response'] not in ['AreaMean','AreaFrac_GE25mm']:continue
  group=[r for r in rates if all(r[k]==i[k] for k in ['Domain','Season','Response'])];need(len(group)==3,'All ENSO states must be retained')
  for r in group:
   months=[m for m in monthly if m['Domain']==i['Domain'] and m['Season']==i['Season'] and m['ENSO_State']==r['ENSO_State']]
   need(sum(int(m[i['Response']+'_Usable_Days']) for m in months)==int(r['Usable_Days']),'Exposure reconstruction')
   need(sum(float(m[i['Response']+'_Extreme_Days']) for m in months)==float(r['Extreme_Days']),'Extreme count reconstruction')
   need(abs(100*float(r['Extreme_Days'])/int(r['Usable_Days'])-float(r['Extreme_Day_Rate_per100d']))<1e-10,'Rate reconstruction')
  roni.append(dict(domain=i['Domain'],season=i['Season'],response=i['Response'],q=num(i['Global96_BH_Q']),supported=i['Global96_FDR_0p05']=='True',partial_r2=num(i['Observed_Partial_R2']),states=[dict(state=r['ENSO_State'],rate=num(r['Extreme_Day_Rate_per100d']),days=int(r['Usable_Days']),events=num(r['Extreme_Days']),months=int(r['Months']),years=int(r['Represented_Years'])) for r in group]))
 audit=rows('Phase7B_Phase7A_Invariant_Audit.csv');need(len(audit)==12 and all(float(r['Bad_Days'])==float(r['Max_Absolute_Difference'])==0 for r in audit),'Phase7A invariants')
 curves=rows('Phase7B_Nonlinear_Quantile_Response_Curves.csv');surfaces=rows('Phase7B_MJO_RMM_PhaseSpace_Kernel_Response_Surface.csv');need(len(curves)==51200 and len(surfaces)==216320,'Original Phase7B family incomplete')
 outputs={};catalog=[]
 for domain in DOMAINS:
  d=dict(domain=domain,active_prediction=False,curves={},mjo={})
  for r in curves:
   if r['Domain']!=domain or r['Predictor'] not in ['PNA','NAO'] or r['Response'] not in TARGETS:continue
   key='|'.join(r[k] for k in ['Anchor_Season','Predictor','Window','Response']);g=d['curves'].setdefault(key,dict(baseline=num(r['Season_Response_Baseline']),points=[]));g['points'].append([num(r[k]) for k in ['Predictor_Mean','Response_Mean','N','Predictor_Bin_Left','Predictor_Bin_Right','Quantile_Bin']])
  for r in surfaces:
   if r['Domain']!=domain or r['Response'] not in TARGETS:continue
   key='|'.join(r[k] for k in ['Anchor_Season','Population','Window','Response']);g=d['mjo'].setdefault(key,dict(baseline=num(r['Population_Baseline']),bandwidth=num(r['Kernel_Bandwidth']),points=[]));p=[num(r['Grid_RMM1']),num(r['Grid_RMM2']),num(r['Kernel_ESS']),r['ESS_Adequate']=='True',num(r['Kernel_Response']),num(r['Kernel_Response_Anomaly'])];need(p[3]==(p[2]>=30),'Original ESS policy changed');g['points'].append(p)
  need(len(d['curves'])==len(d['mjo'])==80,'Domain family incomplete')
  need(all(len(g['points'])==8 for g in d['curves'].values()) and all(len(g['points'])==169 for g in d['mjo'].values()),'Grid/bin inventory')
  path='data/presentation/'+domain.lower().replace(' ','_')+'.json';outputs[path]=d;catalog.append(dict(name=domain,path=path))
 outputs['data/presentation/roni.json']=dict(active_prediction=False,records=roni)
 m=dict(schema_version='presentation-research-v1',active_prediction=False,period=['2004-01-01','2025-12-31'],original_family=96,trusted_roni_cells=64,supported_roni_cells=2,curve_points=5120,mjo_points=108160,minimum_mjo_ess=30,domains=catalog,roni_path='data/presentation/roni.json',sources=[dict(name=n,sha256=h,bytes=len(raw[n]),url='https://drive.google.com/file/d/'+id+'/view') for n,id,h in registry],limitations=['Retrospective associations; no issued or calibrated precipitation/flood probabilities.','Revised historical inputs and historical timing limitations prevent an as-issued forecast interpretation.','RONI retains original global96 inference. State bars are descriptive, not pairwise significance tests.','Phase7B curves/surfaces are descriptive, with dependent overlapping samples; kernel ESS is not independent verification.','SpatialP90 is excluded. Q3/Q3A, original Q6 tiers and negative Q4/Q5 experiments are unchanged.'])
 m['files']={p:dict(sha256=sha(encoded(d)),bytes=len(encoded(d))) for p,d in outputs.items()};outputs['data/presentation/research_manifest.json']=m
 return outputs

def trajectory(text,driver):
 rows=list(csv.DictReader(io.StringIO(text)));latest=max(r['time'] for r in rows);init=datetime.strptime(latest,'%Y-%m-%d').date();current=[r for r in rows if r['time']==latest];need(len(current)==496,'Incomplete latest GEFS cycle')
 seen=set();days=[]
 for lead in range(16):
  members=[]
  for r in current:
   if int(r['lead'])!=lead:continue
   id=int(r['member']);value=float(r[driver+'_index']);need((lead,id) not in seen and 0<=id<=30 and math.isfinite(value),'Invalid GEFS member');seen.add((lead,id));need(r['valid_time']==(init+timedelta(days=lead)).isoformat(),'GEFS source valid date');members.append([id,value])
  need(len(members)==31,'Missing GEFS members');values=sorted(v for _,v in members)
  def q(p):a=30*p;l=math.floor(a);return values[l]+(values[math.ceil(a)]-values[l])*(a-l)
  days.append(dict(lead=lead,date=(init+timedelta(days=lead)).isoformat(),members=sorted(members),median=q(.5),p10=q(.1),p25=q(.25),p75=q(.75),p90=q(.9),positive=sum(v>0 for v in values)))
 t=dict(initialization_date=latest,initialization_time=None,member_count=31,days=days,source_sha256=sha(text.encode()))
 t['payload_sha256']=payload_hash(t);return t

def payload_hash(value):
 return sha(encoded({k:v for k,v in value.items() if k not in {'payload_sha256','status','error','retrieved_at','attempted_at','etag','source_last_modified','source_url'}}))

def valid_payload(value):
 try:return bool(value and value.get('payload_sha256')==payload_hash(value))
 except (TypeError,ValueError):return False

def validate_image(raw):
 from PIL import Image
 need(raw and len(raw)<=12_000_000,'Empty/oversize source figure')
 with Image.open(io.BytesIO(raw)) as image:
  need(image.format in ['PNG','GIF'] and image.n_frames==1 and min(image.size)>=200,'Invalid/animated source figure');size=image.size;image.verify()
 return size

def weekly_series(text):
 need(all(s in text[:300] for s in ['Nino1+2','Nino3','Nino34','Nino4','SST SSTA']),'Weekly Niño schema');weekly=[]
 for line in text.splitlines():
  m=re.match(r'\s*(\d{2}[A-Z]{3}\d{4})\s+(.*)',line)
  if not m:continue
  values=[float(s) for s in re.findall(r'[-+]?\d+\.\d+',m[2])];need(len(values)==8,'Weekly Niño columns');weekly.append(dict(date=datetime.strptime(m[1],'%d%b%Y').date().isoformat(),**{k:values[2*i+1] if abs(values[2*i+1])<20 else None for i,k in enumerate(['nino12','nino3','nino34','nino4'])}))
 need(len(weekly)>=105 and len({r['date'] for r in weekly})==len(weekly),'Weekly coverage');weekly.sort(key=lambda r:r['date'])
 return dict(values=weekly[-105:],date_role='week_centered_on')

def live(root=ROOT,gefs_rows=None):
 """Refresh independent products; reuse the daily GEFS response when supplied.

 Retained caches keep their successful retrieval and source dates. Hash-addressed
 figures prevent an old browser manifest from referring to newer source bytes.
 """
 target=root/'data/presentation/context.json'
 try:previous=json.loads(target.read_text()) if target.exists() else {}
 except (OSError,ValueError):previous={}
 old={r['id']:r for r in previous.get('products',[])};now=datetime.now(timezone.utc).isoformat()
 def product(item):
  id,(title,path)=item;prior=old.get(id,{});cached=root/prior.get('path','missing')
  cache_ok=bool(re.fullmatch(r'data/presentation/'+id+r'(?:_[a-f0-9]{16})?\.(?:gif|png)',prior.get('path','')) and cached.is_file() and sha(cached.read_bytes())==prior.get('sha256'))
  r=dict(id=id,title=title,source_url=CPC+path,valid_time=None,initialization_time=None)
  try:
   raw,headers=fetch(CPC+path,prior if cache_ok else None)
   if raw is None:
    need(cache_ok,'304 without verified cache');r.update(prior,status='available');r.pop('error',None)
   else:
    width,height=validate_image(raw);digest=sha(raw);dest='data/presentation/'+id+'_'+digest[:16]+Path(path).suffix
    write(root/dest,raw);r.update(status='available',path=dest,sha256=digest,bytes=len(raw),width=width,height=height,retrieved_at=now,source_last_modified=headers.get('last-modified'),etag=headers.get('etag'))
  except Exception as e:
   if cache_ok:r.update(prior,status='stale')
   else:r['status']='unavailable'
   r['error']=type(e).__name__+': '+str(e)
  return r
 with ThreadPoolExecutor(max_workers=4) as pool:products=list(pool.map(product,FIGURES.items()))
 for r in products:print(r['id'],r['status'],flush=True)
 prior=previous.get('weekly',{});cache_ok=valid_payload(prior)
 try:
  raw,headers=fetch(CPC+'/data/indices/wksst9120.for',prior if cache_ok else None)
  if raw is None:
   need(cache_ok,'304 without verified weekly series');weekly=dict(prior,status='available');weekly.pop('error',None)
  else:
   weekly=dict(weekly_series(raw.decode()),status='available',source_url=CPC+'/data/indices/wksst9120.for',source_sha256=sha(raw),retrieved_at=now,source_last_modified=headers.get('last-modified'),etag=headers.get('etag'))
   weekly['payload_sha256']=payload_hash(weekly)
 except Exception as e:
  weekly=dict(prior,status='stale',error=str(e)) if cache_ok else dict(status='unavailable',source_url=CPC+'/data/indices/wksst9120.for',error=str(e))
 gefs={}
 for driver in ['pna','nao']:
  url='https://ftp.cpc.ncep.noaa.gov/cwlinks/norm.daily.'+driver+'.gefs.z500.120days.csv';prior=previous.get('gefs',{}).get(driver,{});cache_ok=valid_payload(prior)
  try:
   if gefs_rows is not None:
    candidate=gefs_rows.get(driver,{}).get('presentation_trajectory',{})
    need(candidate.get('status')=='available' and valid_payload(candidate),candidate.get('error','Latest GEFS trajectory unavailable'))
    value=dict(candidate,source_url=url)
   else:
    raw,headers=fetch(url,prior if cache_ok else None)
    if raw is None:
     need(cache_ok,'304 without verified GEFS trajectory');value=dict(prior,status='available');value.pop('error',None)
    else:value=dict(trajectory(raw.decode(),driver),status='available',source_url=url,retrieved_at=now,source_last_modified=headers.get('last-modified'),etag=headers.get('etag'))
   gefs[driver]=value
  except Exception as e:
   gefs[driver]=dict(prior,status='stale',error=str(e)) if cache_ok else dict(status='unavailable',source_url=url,error=str(e))
 return {'data/presentation/context.json':dict(schema_version='presentation-context-v1',active_prediction=False,retrieved_at=now,products=products,weekly=weekly,gefs=gefs)}

def refresh_context(root=ROOT,gefs_rows=None):
 outputs=live(root,gefs_rows)
 for path,value in outputs.items():write(root/path,encoded(value))
 # Keep old open-tab manifests usable; remove only old, unreferenced derived
 # figures after sixty days. Stable legacy paths are deliberately retained.
 current={r.get('path') for r in outputs['data/presentation/context.json']['products']}
 cutoff=datetime.now(timezone.utc).timestamp()-60*86400
 for p in (root/'data/presentation').iterdir():
  if re.fullmatch(r'(?:'+'|'.join(FIGURES)+r')_[a-f0-9]{16}\.(?:png|gif)',p.name) and p.relative_to(root).as_posix() not in current and p.stat().st_mtime<cutoff:p.unlink()

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--source',type=Path);p.add_argument('--live',action='store_true');a=p.parse_args();outputs={}
 if a.source:outputs.update(research(a.source))
 if a.live:outputs.update(live())
 for path,value in outputs.items():write(ROOT/path,encoded(value))
 print('Visual-review data packaged. No fitting, qualification or activation.')
