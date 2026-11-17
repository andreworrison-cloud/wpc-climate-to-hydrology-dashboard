"""Export the pinned coastal research snapshot; never fit or activate guidance."""
from pathlib import Path
import argparse,json,hashlib,csv

def build(root):
    h=root/'coastal_combined_v01';register=h/'inputs/Current_Register_509.csv'
    digest=hashlib.sha256(register.read_bytes()).hexdigest()
    if digest!='c5564f35a856c042fd9fcb507af453adeb433dc40a7076c3a8e388e3ef57cb05':raise ValueError('Unexpected canonical register; declare a new research release.')
    read=lambda p:list(csv.DictReader(p.open(newline='')))
    queue={r['episode_id']:r for r in read(h/'results/Regional_Type_Review_Queue_509_v03.csv')}
    calendar=read(h/'inputs/Occurrence_Calendar_509.csv');events=[]
    for r in calendar:
        q=queue[r['episode_id']];status='scoped_positive' if q['documented_event_impact_regions'] else 'binding_open' if q['annotation_status']!='PENDING_SOURCE_REVIEW' else 'not_reviewed'
        events.append(dict(id=r['episode_id'],winter_end=int(r['winter_end_year']),reference_date=r['reference_support_utc'][:10] or None,candidate_start=r['first_candidate_utc_date'],candidate_end=r['last_candidate_utc_date'],support_clocks=int(r['reviewed_clock_count']),direct_tc_transition=r['direct_tc_transition'].lower()=='true',regions=q['documented_event_impact_regions'].split(';') if q['documented_event_impact_regions'] else [],annotation=status))
    if len(events)!=509:raise ValueError('Incomplete event inventory')
    comparisons=[]
    for r in read(h/'results/All509_Fixed_Model_Date_Allocation_Bounds.csv'):
        comparisons.append(dict(age=int(r['age']),comparison=r['comparison'],exact_count=int(r['exact_case_count']),uncertain_count=int(r['documentary_case_count']),exact_mean=float(r['exact_case_mean']),lower=float(r['all509_mean_lower']),upper=float(r['all509_mean_upper']),uncertainty_kind='date_allocation_bounds_not_confidence_interval'))
    return dict(schema='coastal-research-v1',as_of='2026-11-17',source_register_sha256=digest,coverage=dict(first_winter_end=1980,last_winter_end=2024,winters=45,primary_occurrences=509,excluding_direct_tc=504,clock_supported=502,date_envelope_only=7,supported_primary_holds=6,census_certified=False),outlook=dict(active=False,probability=None,issue_time=None,valid_start=None,valid_end=None,state='not_qualified'),events=events,comparisons=comparisons,findings=dict(pair='MJO–PNA timing comparison remains positive across the seven uncertain-date envelopes using frozen held-winter models.',season='Added seasonal variation has no established consistent overall benefit.',scope='Retrospective support-reference timing, not onset, storm probability, impact severity or forecast lead.',nonlinear='Linear and nonlinear continuous combinations of all four indicators remain in the research; sparse climate combinations are not automatically excluded.'),readiness=[dict(id='issue_time',title='Issue-time predictor history',status='not_qualified',scope='Historical source captures are retrospective; publication-time eligibility needs qualification.'),dict(id='exposure',title='Event and exposure qualification',status='not_qualified',scope='45 winter censuses are not certified; unknown dates are not verified absences.'),dict(id='calibration',title='Independent outlook calibration',status='not_qualified',scope='Conditional timing scores do not supply calibrated 1–7-day coastal-storm probabilities.'),dict(id='regional',title='Regional extensions',status='partial',scope='43 scoped regional annotations; complete region footprints are not certified. This does not block global timing research.')])

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--project-root',type=Path,required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
    output=build(args.project_root);args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(output,ensure_ascii=False,separators=(',',':'))+'\n');print('Exported 509-case inactive coastal research snapshot.')
