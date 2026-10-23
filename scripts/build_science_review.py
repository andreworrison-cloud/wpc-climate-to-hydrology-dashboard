"""Package frozen Q6 and Phase4C/4D exports for an INACTIVE review frontend.

Standard library only; no fitting, input replacement, inference or qualification.
Raw inputs stay in Drive. See docs/Q6_SCIENCE_INTEGRATION.md for identities.
"""
import argparse
from collections import Counter
import csv
import hashlib
import json
import math
from pathlib import Path

PINNED = {
    'Phase7C_Q6_All_Evidence_Cells.csv': 'dbb2ef927217a49050db10b8f0e0abcc1e73ddf961bbb7ba63a86845ec5f7b9b',
    'Phase7C_Q6_Dashboard_Science_Review.json': '083d4ab8f64d7911e769a306fd524bc5dcbc3fbf8cc3ca65ce29d19099b1c6a1',
    'Phase7C_Q6_Historical_Context_Review.json': '46f4bf9f1a73d2c4898d82f731909cae9afd5c06f35c81545b7f881a951aa704',
    'Phase7C_Q6_Readiness_Source_Manifest.json': '1f6eab0f7f5486dee1ceb213b8031a914cb7d95f74b5db5da3b3bfcc2f657c8b',
}
SOURCE_IDS = ['1YA_JiQwAmm8_wdQMiJjW9sw85Mibltjo', '1RPxfgz0R3lJE-bJa6uq_tVsqd609EkWN',
              '1Oouyk5twxfZE1oO_2to0TNfFsIzYOA6m', '1Lh0k9NXX30S0nrnkxdKMADD7-6tE9nCA']
METHOD = 'fa6141ca2a7158cc5622924c70f9197a25d631aabb1170cc6ddc45f9dc843a9e'
DOMAINS = ['West Coast', 'Southwest', 'Interior Mountain West', 'Northern Plains',
           'Southern Plains', 'Southeast', 'Northeast', 'National CONUS']
WINDOWS = ['D1_7', 'D8_14', 'D15_21', 'D22_28']
MODELS = ['A_H_ALL', 'A_H_RONI', 'A_H_MJO', 'A_H_PNA', 'A_H_NAO']
TARGETS = ['AreaMeanExtreme', 'AreaFrac25Extreme']
GATES = ['sample_support', 'magnitude', 'vs_climatology', 'fold_stability',
         'year_stability', 'leave_fold_out', 'calibration', 'uncertainty', 'direction']
METRICS = ['N', 'Events', 'NonEvents', 'Years', 'Folds', 'Brier_Candidate', 'Brier_AH',
           'Brier_A0', 'Delta_Brier_AH', 'Delta_Brier_A0', 'ECE_Candidate', 'ECE_AH',
           'Positive_Folds', 'Positive_Years', 'Minimum_LeaveOneFoldOut_Gain',
           'EventBearing_28d_Blocks', 'Minimum_Valid_Bootstrap_Replicates',
           'Lower90_AH_Worst_Length', 'Lower90_A0_Worst_Length']
COLUMNS = ['window', 'target', 'model', 'stratum_type', 'stratum', 'tier',
           'reason_codes', 'moderate_gates', 'parent_season_tier'] + METRICS
UNISSUED = dict(active=False, deployment_eligible=False, input_status='not_evaluated',
                display_state='unavailable', probability=None, anchor_probability=None,
                delta_probability=None, issue_time=None, valid_start=None, valid_end=None)


def require(ok, message):
    if not ok:
        raise ValueError(message)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, allow_nan=False, separators=(',', ':')) + '\n').encode()


def number(value):
    if value == '':
        return None
    v = float(value)
    require(math.isfinite(v), 'Nonfinite metric')
    return int(v) if v.is_integer() else v


def build(source):
    raw = {name: (source / name).read_bytes() for name in PINNED}
    for name, sha in PINNED.items():
        require(digest(raw[name]) == sha, f'Frozen source mismatch: {name}')
    evidence = json.loads(raw['Phase7C_Q6_Dashboard_Science_Review.json'])
    history = json.loads(raw['Phase7C_Q6_Historical_Context_Review.json'])
    inventory = json.loads(raw['Phase7C_Q6_Readiness_Source_Manifest.json'])
    cells = list(csv.DictReader(raw['Phase7C_Q6_All_Evidence_Cells.csv'].decode().splitlines()))
    require(len(cells) == 5440 and len(evidence['records']) == 5120, 'Complete evidence family required')
    require(evidence['active'] is False and history['active'] is False, 'Source must be inactive')
    lookup = {r['cell_id']: r for r in evidence['records']}
    require(len(lookup) == 5120, 'Duplicate evidence ID')
    require(len({r['Cell_ID'] for r in cells}) == 5440, 'Duplicate score ID')
    files, domains = {}, []
    for domain in DOMAINS:
        rows = []
        for r in cells:
            if r['Domain'] != domain:
                continue
            require(r['Active'] == 'False' and r['Deployment_Eligible'] == 'False', 'Active score row')
            require(r['Model'] in MODELS and r['Window'] in WINDOWS and r['Target'] in TARGETS, 'Unknown task')
            if r['Stratum_Type'] != 'annual':
                e = lookup.pop(r['Cell_ID'])
                require(all(e[k] == v for k, v in UNISSUED.items()), 'Unexpected issued field')
                require(e['evidence_status'] == 'no_qualified_signal', 'Unexpected qualification')
                require(e['research_tier'] == r['Evidence_Tier'], 'Tier disagreement')
                require(e['provenance']['methodology_sha256'] == METHOD, 'Method identity')
                require(e['provenance']['q6_cells_sha256'] == PINNED['Phase7C_Q6_All_Evidence_Cells.csv'], 'Score identity')
                reasons = e['reason_codes']
            else:
                require(r['Evidence_Tier'] == 'Context Only', 'Annual rows cannot qualify')
                reasons = r['Reasons_Moderate'].split(';')
            gates = [r['Gate_Moderate_' + g] == 'True' for g in GATES]
            rows.append([r['Window'], r['Target'], r['Model'], r['Stratum_Type'], r['Stratum'],
                         r['Evidence_Tier'], reasons, gates, r['Parent_Season_Tier']] +
                        [number(r[k]) for k in METRICS])
        require(len(rows) == 680, f'Incomplete domain: {domain}')
        path = 'data/science/evidence_' + domain.lower().replace(' ', '_') + '.json'
        files[path] = dict(schema_version='q6-review-table-v1', domain=domain, active=False,
                           columns=COLUMNS, rows=rows)
        domains.append(dict(name=domain, kind='national_summary' if domain == 'National CONUS' else 'ufvs_region',
                            path=path, cells=len(rows), tiers=dict(Counter(r[5] for r in rows))))
    require(not lookup, 'Missing evidence records')
    for group, source_name in [('phase4c', 'Phase4C_BoundarySafe_Primary_Precipitation_Event_Coupling_Inference.csv'),
                               ('phase4d', 'Phase4D_Conditional_RONI_Response_Inference.csv')]:
        require(len(history[group]) == 128, 'Complete trusted history family required')
        require(len({(r['Domain'], r['Season'], r['Precip_Response'], r['Event_Response']) for r in history[group]}) == 128,
                'Duplicate historical cell')
        for r in history[group]:
            require(r['Precip_Response'] in ['AreaMean', 'AreaFrac_GE25mm'], 'Untrusted historical metric')
            require(r['Active'] is False, 'Active historical row')
            require(r['Source_SHA256'] == inventory[source_name]['sha256'], 'Historical inference identity')
            require(r['Interpretation'] == 'historical_association_not_forecast', 'Historical interpretation')
    require(sum(r['Global192_FDR_0p05'] for r in history['phase4c']) == 122, 'Original 192-test family changed')
    require(sum(r['Core128_FDR_0p05'] for r in history['phase4d']) == 0, 'Original conditional result changed')
    files['data/science/historical_context_v1.json'] = history
    manifest = dict(
        schema_version='q6-inactive-review-v1', active=False, deployment_eligible=False,
        product_type='retrospective_development_evidence', qualification_rerun=False,
        issue_time=None, valid_start=None, valid_end=None, guidance_defaults=UNISSUED,
        generated_at=evidence['generated_at'], development_period=['2017-01-01', '2025-12-31'],
        methodology_sha256=METHOD, moderate_gate_order=GATES, domains=domains,
        counts=dict(total=5440, season=1280, month=3840, annual_context=320,
                    no_qualified_signal=5079, research_watch=41, qualified=0),
        history_path='data/science/historical_context_v1.json',
        limitations=[
            'Repeatedly inspected development-era evidence; no untouched prospective verification.',
            'Original RONI features include unfinished overlapping seasons and revised historical values; not as-issued inputs.',
            'Other driver vintages, release timing, CPC antecedent inputs and threshold-reference availability remain unresolved.',
            'Original Q6 tiers are preserved. The separate numerical selection-impact audit remains under review.',
            'Empty-stratum bootstrap completeness is conservative; all original seasonal cells independently fail fold and year stability.',
            'Research Watch permits research review only. No model-derived tendency or FFW/LSR probability is issued.',
        ],
        sources=[dict(name=n, sha256=h, url=f'https://drive.google.com/file/d/{i}/view')
                 for (n, h), i in zip(PINNED.items(), SOURCE_IDS)],
        builder_sha256=digest(Path(__file__).read_bytes()),
    )
    manifest['files'] = {p: dict(sha256=digest(encoded(v)), bytes=len(encoded(v))) for p, v in files.items()}
    files['data/science/manifest.json'] = manifest
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--root', type=Path, default=Path('.'))
    args = parser.parse_args()
    files = build(args.source)  # Validate the entire source family before writing anything.
    for path, value in files.items():  # Manifest is written last.
        p = args.root / path
        p.parent.mkdir(parents=True, exist_ok=True)
        temp = p.with_suffix('.tmp')
        temp.write_bytes(encoded(value))
        temp.replace(p)
    print('Packaged 5,440 preserved cells and 256 trusted history rows; all guidance inactive.')


if __name__ == '__main__':
    main()
