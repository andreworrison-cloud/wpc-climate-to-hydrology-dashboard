"""Review branch only: exercise science controls, failure handling and layout."""
import functools
import http.server
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
review = ROOT / 'review'
review.mkdir(exist_ok=True)
manifest = json.loads((ROOT / 'data/science/manifest.json').read_text())
watch = None
for d in manifest['domains']:
    table = json.loads((ROOT / d['path']).read_text())
    for values in table['rows']:
        row = dict(zip(table['columns'], values))
        if row['tier'] == 'Research Watch':
            watch = dict(row, domain=d['name'])
            break
    if watch:
        break

try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1440, 'height': 1100})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        # Images are outside this science package; avoid fetching the large animation archive.
        page.route('**/*', lambda route: route.abort() if route.request.resource_type == 'image' else route.continue_())
        page.goto(base, wait_until='domcontentloaded')
        page.wait_for_function("document.querySelector('#regionEvidence').textContent.includes('Paired climate')")
        assert page.locator('[data-science-domain]').count() == 8
        assert page.locator('#scienceCatalogStatus').inner_text().find('5,120') >= 0
        page.locator(f'[data-science-domain="{watch["domain"]}"]').click()
        page.wait_for_function('(name) => document.querySelector("#regionEvidence h3")?.textContent===name', arg=watch['domain'])
        page.locator(f'[data-lead="{watch["window"]}"]').click()
        page.select_option('#precipTarget', watch['target'])
        page.select_option('#evidencePeriod', watch['stratum'])
        page.select_option('#evidenceModel', watch['model'])
        text = page.locator('#regionEvidence').inner_text()
        assert 'Research Watch' in text and 'No qualified signal' in text and 'Guidance unavailable' in text
        assert 'not forecast permission' in text and watch['model'] in text
        page.locator('#regional').screenshot(path=str(review / 'q6-evidence-desktop.png'))
        page.select_option('#evidencePeriod', '01')
        page.select_option('#precipTarget', 'AreaFrac25Extreme')
        page.locator('[data-lead="D22_28"]').click()
        assert '|D22_28|AreaFrac25Extreme|' in page.locator('.science-cell-id').inner_text()
        assert '|month|01' in page.locator('.science-cell-id').inner_text()
        page.select_option('#historyDomain', 'National CONUS')
        page.select_option('#historySeason', 'DJF')
        page.select_option('#historyMetric', 'AreaMean')
        page.select_option('#historyEvent', 'FFW')
        assert '16.495' in page.locator('.history-rate-chart').get_attribute('aria-label')
        assert '1.42' in page.locator('.history-rate-chart').get_attribute('aria-label')
        page.locator('#historical').screenshot(path=str(review / 'q6-history-desktop.png'))
        page.select_option('#historyEvent', 'LSR')
        assert 'local storm reports' in page.locator('.history-rate-chart').get_attribute('aria-label')
        # A refresh must retain user choices and cannot start playback.
        page.wait_for_function('!DashboardRefresh.busy', timeout=60000)
        page.evaluate('DashboardRefresh.checkNow()')
        assert page.locator('#evidencePeriod').input_value() == '01'
        assert page.locator('#historyEvent').input_value() == 'LSR'
        page.set_viewport_size({'width': 390, 'height': 844})
        page.locator('#regional').screenshot(path=str(review / 'q6-evidence-mobile.png'))
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        assert not errors, errors
        bad = browser.new_page()
        poisoned = dict(manifest, active=True)
        bad.route('**/data/science/manifest.json', lambda route: route.fulfill(json=poisoned))
        bad.route('**/*.png*', lambda route: route.abort())
        bad.goto(base, wait_until='domcontentloaded')
        bad.wait_for_function("document.querySelector('#scienceCatalogStatus').textContent.includes('validation failed')")
        assert bad.locator('.history-rate-chart').count() == 0
        assert 'No current forecast' in bad.locator('#regionEvidence').inner_text()
        browser.close()
        print('PASS: science controls, Research Watch separation, history rates, refresh preservation, mobile layout and activation rejection.')
finally:
    server.shutdown()
