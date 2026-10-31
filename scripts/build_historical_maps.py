"""Build descriptive regional FFW/LSR maps from immutable Phase1A/7A inputs.

No fitting, forecast issuance, rescoring, significance testing or Q3 modification.
Run: python scripts/build_historical_maps.py --inputs /path/to/verified/inputs
"""
import argparse,hashlib,io,json,zipfile
from pathlib import Path
import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
DOMAINS=['West Coast','Southwest','Interior Mountain West','Northern Plains','Southern Plains','Southeast','Northeast','National CONUS']
EXPECTED={'dynamic':'d81fd612206a228ab5261f3f47a14335efad75f80139489998e75437c2c2cda1','aligned':'0d51e2f00236cd1185a86d327b736f8e8abc8a177ee3ced00dfdbfb8b9018185','climate':'91c330af0ee26c42cd47468dc2278f94ef97262caca73b002a5d51a104a28207','ffw':'2d8a19aef884bf51ecb7f1fe25042b388bac260b3f91fd65bef291c2dda02471','lsr':'2bbcae69ba28565a6e2b9ca75367aed107e7bc57c47b6f5239e14c07f7ce6b96','freeze':'d9dfabdf4ff03ed119fdffd64a1d23273aec4789ed869efc3de72b4ba27e39f4','states-10m':'d76b391ccfa8bff601d51e3e3da5d43a89fa46cd5caca72ce731b383be5596d0'}
EVENTS={'FFW':'Flash Flood Warnings','LSR':'Flood & slope-failure LSRs','LSR_FLASH':'Flash-flood LSRs','LSR_FLOOD':'Flood LSRs','LSR_SLOPE':'Debris-flow / landslide LSRs'}
STATES={'RONI':['Relative El Nino','Neutral','Relative La Nina'],'MJO':['Weak']+['Phase '+str(i) for i in range(1,9)],'PNA':['Negative','Near zero','Positive'],'NAO':['Negative','Near zero','Positive']}
METRICS={'AreaMean':'AreaMean_mm_GE_P95_1991_2020','AreaFrac_GE25mm':'AreaFrac_GE25mm_GE_P95_1991_2020'}
def sha(b):return hashlib.sha256(b).hexdigest()
def enc(v):return (json.dumps(v,separators=(',',':'),ensure_ascii=False,allow_nan=False)+'\n').encode()
def check(ok,msg):
 if not ok:raise ValueError(msg)
def ending(ts):
 t=pd.to_datetime(ts,utc=True,errors='raise');return (t-pd.Timedelta(hours=12)).dt.floor('D')+pd.Timedelta(days=1)
def season(d):return d.dt.month.map({12:'DJF',1:'DJF',2:'DJF',3:'MAM',4:'MAM',5:'MAM',6:'JJA',7:'JJA',8:'JJA',9:'SON',10:'SON',11:'SON'})
def alignment(raw,col):
 f=raw.assign(Date=ending(raw[col]).dt.strftime('%Y-%m-%d'))
 r=f.groupby(['Date','UFVS_REGION']).size().rename('count').reset_index().rename(columns={'UFVS_REGION':'Domain'})
 n=r.groupby('Date')['count'].sum().reset_index().assign(Domain='National CONUS')
 return pd.concat([r,n],ignore_index=True).set_index(['Date','Domain'])['count']
def build(inputs):
 inputs=Path(inputs);raw={}
 for key,h in EXPECTED.items():
  p=inputs/(key+('.zip' if key=='freeze' else '.json' if key=='states-10m' else '.csv'))
  b=p.read_bytes();check(sha(b)==h,'Source bytes changed: '+key);raw[key]=b
 cols=['Date','Domain','Precip_Usable','Event12Z_Usable','RMM1','RMM2','MJO_Phase','MJO_Amplitude','MJO_Active','RONI','ENSO_Phase','PNA','NAO','FFW_Count_12Z','LSR_Count_12Z']+list(METRICS.values())
 d=pd.read_csv(io.BytesIO(raw['dynamic']),usecols=cols,low_memory=False)
 check(len(d)==8036*8 and not d.duplicated(['Date','Domain']).any(),'Complete unique daily family')
 check(set(d.Domain)==set(DOMAINS),'Domain inventory')
 a=pd.read_csv(io.BytesIO(raw['aligned'])).set_index(['Date','Domain'])
 ffw=pd.read_csv(io.BytesIO(raw['ffw']),usecols=['EVENT_KEY','UTC_ISSUE','UFVS_REGION','LOCATION_SOURCE'])
 lsr=pd.read_csv(io.BytesIO(raw['lsr']),usecols=['VALID_TIME','UFVS_REGION','TYPE_CLEAN'])
 check(len(ffw)==ffw.EVENT_KEY.nunique()==83674 and len(lsr)==158287,'Phase1A totals')
 check(ffw.LOCATION_SOURCE.value_counts().to_dict()=={'ORIGINAL':81526,'WFO_LSR_MEAN_IMPUTED':2148},'Coordinate provenance')
 check(lsr.TYPE_CLEAN.value_counts().to_dict()=={'FLASH FLOOD':96810,'FLOOD':57974,'DEBRIS FLOW':2775,'LANDSLIDE':728},'LSR type inventory')
 idx=pd.MultiIndex.from_frame(d[['Date','Domain']]);counts={}
 selections={'FFW':(ffw,'UTC_ISSUE'),'LSR':(lsr,'VALID_TIME'),'LSR_FLASH':(lsr[lsr.TYPE_CLEAN.eq('FLASH FLOOD')],'VALID_TIME'),'LSR_FLOOD':(lsr[lsr.TYPE_CLEAN.eq('FLOOD')],'VALID_TIME'),'LSR_SLOPE':(lsr[lsr.TYPE_CLEAN.isin(['DEBRIS FLOW','LANDSLIDE'])],'VALID_TIME')}
 for key,(table,col) in selections.items():
  counts[key]=alignment(table,col).reindex(idx,fill_value=0).to_numpy(dtype=int);d[key]=counts[key]
  if key in ['FFW','LSR']:
   check(np.array_equal(counts[key],d[key+'_Count_12Z'].to_numpy()),key+' raw-to-Phase7A count reconciliation')
   check(np.array_equal(a.reindex(idx)[key+'_Count_12Z'].to_numpy(),counts[key]),key+' aligned-file reconciliation')
 check(np.array_equal(d.LSR,d.LSR_FLASH+d.LSR_FLOOD+d.LSR_SLOPE),'LSR subsets reconcile')
 climate=pd.read_csv(io.BytesIO(raw['climate'])).set_index('Date')
 for col in ['RMM1','RMM2','MJO_Phase','MJO_Amplitude','RONI']:
  check(np.allclose(d[col],climate.reindex(d.Date)[col],atol=1e-12,rtol=0,equal_nan=True),'Hardened climate join: '+col)
 check(np.max(np.abs(np.hypot(d.RMM1,d.RMM2)-d.MJO_Amplitude))<1e-5,'RMM amplitude')
 ph=(np.floor((np.arctan2(d.RMM2,d.RMM1)+np.pi)/(np.pi/4)).astype(int)%8)+1
 check(np.array_equal(ph,d.MJO_Phase),'Canonical RMM phases')
 dates=pd.to_datetime(d.Date);d['year']=dates.dt.year;d['season']=season(dates)
 formal=d.Precip_Usable & d.Event12Z_Usable & ~d.Date.isin(['2004-01-01','2007-02-26'])
 check(d[formal].groupby('Domain').size().eq(8034).all(),'Boundary-safe 8034-date mask')
 d=d[formal].copy()
 d['RONI_state']=d.ENSO_Phase
 d['MJO_state']=np.where(d.MJO_Amplitude.ge(1),'Phase '+d.MJO_Phase.astype(str),'Weak')
 for driver in ['PNA','NAO']:
  d[driver+'_state']=np.where(d[driver].lt(-.5),'Negative',np.where(d[driver].gt(.5),'Positive','Near zero'))
  d.loc[d[driver].isna(),driver+'_state']=None
 columns=['domain','season','metric','precipitation_days','driver','state','days','years']
 for event in EVENTS:columns += [event+'_events',event+'_days']
 rows=[];lookup={}
 for domain in DOMAINS:
  for s in ['DJF','MAM','JJA','SON']:
   g=d[d.Domain.eq(domain)&d.season.eq(s)]
   for metric,col in METRICS.items():
    for category in ['all','extreme','non_extreme']:
     pop=g if category=='all' else g[g[col].eq(category=='extreme')]
     for driver in ['NONE']+list(STATES):
      eligible=pop if driver=='NONE' else pop[pop[driver+'_state'].notna()]
      for state in ['ALL']+STATES.get(driver,[]):
       cell=eligible if state=='ALL' else eligible[eligible[driver+'_state'].eq(state)]
       r=[domain,s,metric,category,driver,state,len(cell),int(cell.year.nunique())]
       for event in EVENTS:r += [int(cell[event].sum()),int(cell[event].gt(0).sum())]
       rows.append(r);lookup[tuple(r[:6])]=dict(zip(columns,r))
 original=json.loads((ROOT/'data/science/historical_context_v1.json').read_text());checks=0
 for old in original['phase4c']:
  for category,n,e in [('extreme','Extreme_Days','Events_on_Extreme_Days'),('non_extreme','NonExtreme_Days','Events_on_NonExtreme_Days')]:
   r=lookup[(old['Domain'],old['Season'],old['Precip_Response'],category,'NONE','ALL')]
   check(r['days']==old[n] and r[old['Event_Response']+'_events']==old[e],'Phase4C retained counts');checks+=1
 # The complete phase-4B RONI bar family independently checks state alignment.
 bars=json.loads((ROOT/'data/presentation/roni.json').read_text());bar_checks=0
 for cell in bars['records']:
  for state in cell['states']:
   r=lookup[(cell['domain'],cell['season'],cell['response'],'all','RONI',state['state'])]
   e=lookup[(cell['domain'],cell['season'],cell['response'],'extreme','RONI',state['state'])]
   # Phase4B includes Jan 1 when precipitation is complete; event maps deliberately
   # exclude that incomplete initial 12Z event day. Reconcile the one-day boundary.
   boundary=(cell['season']=='DJF' and state['state']=='Neutral')
   check(state['days']-r['days']==int(boundary),'RONI exposure boundary alignment')
   check(e['days']==state['events'],'RONI extreme-day counts');bar_checks+=1
 with zipfile.ZipFile(io.BytesIO(raw['freeze'])) as z:
  mb=z.read('package/science/assets/Frozen_CPC_Masks_and_Weights.npz')
 with np.load(io.BytesIO(mb),allow_pickle=False) as masks:
  union=np.zeros((120,300),dtype=int);regions=[]
  for domain in DOMAINS[:-1]:
   m=masks[domain];union+=m.astype(int);runs=[]
   for y in range(120):
    indices=np.flatnonzero(m[y]);starts=indices[np.r_[True,np.diff(indices)>1]] if len(indices) else []
    ends=indices[np.r_[np.diff(indices)>1,True]] if len(indices) else []
    for x0,x1 in zip(starts,ends):runs.append([round(-130+.25*int(x0),3),round(20+.25*y,3),round(-130+.25*(int(x1)+1),3),round(20+.25*(y+1),3)])
   regions.append(dict(name=domain,cells=int(m.sum()),runs=runs))
  check(union.max()==1 and np.array_equal(union>0,masks['National CONUS']),'Disjoint complete map masks')
 topology=json.loads(raw['states-10m']);sx,sy=topology['transform']['scale'];tx,ty=topology['transform']['translate'];arcs=[]
 for arc in topology['arcs']:
  x=y=0;points=[]
  for dx,dy in arc:x+=dx;y+=dy;points.append([round(x*sx+tx,4),round(y*sy+ty,4)])
  if all(-130<=q[0]<=-65 and 23<=q[1]<=51 for q in points):arcs.append(points)
 geometry=dict(regions=regions,state_arcs=arcs,grid_centers='lon=-129.875+0.25*x; lat=20.125+0.25*y',mask_sha256=sha(mb),state_source_sha256=EXPECTED['states-10m'],state_source='Census 2017 cartographic state boundaries, redistributed as unprojected us-atlas@3/states-10m.json; contextual only')
 payload=dict(schema_version='historical-maps-v1',active_prediction=False,period=['2004-01-01','2025-12-31'],columns=columns,rows=rows)
 qa=dict(status='PASS',phase1a_ffw_events=len(ffw),phase1a_lsr_reports=len(lsr),ffw_original_coordinates=81526,ffw_imputed_coordinates=2148,formal_days_per_domain=8034,raw_to_12z_reconciliation=True,phase4c_count_comparisons=checks,phase4b_roni_cell_comparisons=bar_checks,table_rows=len(rows),table_unique_keys=len(lookup),geometry_regions=7,national_is_separate_summary=True,fitting_executed=False,qualification_executed=False,public_guidance_active=False)
 outputs={'data/historical/maps.json':payload,'data/historical/geometry.json':geometry,'data/historical/qa.json':qa}
 manifest=dict(schema_version='historical-maps-manifest-v1',builder_sha256=sha(Path(__file__).read_bytes()),upstream_exports={'historical_context_v1.json':sha((ROOT/'data/science/historical_context_v1.json').read_bytes()),'roni.json':sha((ROOT/'data/presentation/roni.json').read_bytes())},active_prediction=False,period=payload['period'],domains=DOMAINS,drivers=STATES,events=EVENTS,metrics=list(METRICS),categories=['all','extreme','non_extreme'],source_hashes=EXPECTED,descriptive_support=dict(minimum_days=30,minimum_years=5,interpretation='Display warning only; not an inferential or forecast qualification threshold'),calendar='Same ending day [previous day 12Z, ending day 12Z); driver label dated by ending day; not an issue-time predictor',reference='Preserved 1991–2020 regional seasonal P95',baseline='Same season, precipitation-day category and known-value coverage of selected driver; ALL state',lsr_types={'FLASH FLOOD':96810,'FLOOD':57974,'DEBRIS FLOW':2775,'LANDSLIDE':728},limitations=['Retrospective descriptive composites; no new significance testing or forecast qualification.','Regional values are not local flood probabilities or precise event footprints.','Warnings and reports reflect observing/reporting practices and are not a complete flood census.','RONI is the original retrospective atlas series, including revised values and centered-period limitations.','PNA/NAO state bins are fixed at -0.5 and +0.5 standardized units; MJO active amplitude is >=1.','Counts are unique authoritative event/report rows; multiple events can occur on one day.','The map uses same-ending-day samples; the atlas future response-window control does not apply.','CONUS summaries have their own precipitation thresholds and event days; do not sum regional day frequencies.'],files={path:dict(bytes=len(enc(value)),sha256=sha(enc(value))) for path,value in outputs.items()})
 outputs['data/historical/manifest.json']=manifest
 for path,value in outputs.items():
  p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(enc(value))
 print(json.dumps(qa,indent=2));return qa
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--inputs',required=True);build(parser.parse_args().inputs)
