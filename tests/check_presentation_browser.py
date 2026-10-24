"""Visual and interaction review at 1080p/4K. Uses repository snapshots, no production writes."""
import copy
import functools
import http.server
import json
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
DEST=ROOT/'snapshots';DEST.mkdir(exist_ok=True)
base=f'http://127.0.0.1:{server.server_port}/'
try:
 with sync_playwright() as p:
  b=p.chromium.launch();page=b.new_page(viewport={'width':1920,'height':1080});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base,wait_until='domcontentloaded');page.wait_for_function("document.querySelector('#researchCanvas svg') && document.querySelector('#ensembleCanvas svg') && document.querySelector('#cpcCanvas img') && document.querySelector('#pacificCanvas img')",timeout=60000)
  page.wait_for_function('!DashboardRefresh.busy',timeout=60000)
  assert not errors,errors
  assert 'Check incomplete' not in page.locator('#autoRefreshStatus').inner_text()
  assert page.locator('#crPlay').inner_text()=='Play'
  assert page.locator('#researchEvidence').inner_text().find('Continuous RONI association supported')>=0
  assert '8.7' in page.locator('#researchCanvas').inner_text()
  page.locator('#researchCanvas svg').focus();page.keyboard.press('Home');assert 'months' in page.locator('#researchReadout').inner_text()
  page.locator('#wallToggle').click()
  for width,height,suffix in [(1920,1080,'1080p'),(3840,2160,'4K')]:
   page.set_viewport_size({'width':width,'height':height})
   for scene in ['ocean','forecast','research','impacts']:
    page.select_option('#wallScene',scene)
    assert page.locator('.dashboard-grid .panel:visible').count()==(3 if scene in ['ocean','forecast'] else 2)
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    for el in page.locator('.dashboard-grid .panel:visible').all():
     box=el.bounding_box();assert box['y']+box['height']<=height+1,(scene,box,height)
    page.screenshot(path=str(DEST/f'Climate_Dashboard_{scene}_{suffix}.png'))
   page.select_option('#wallScene','research');page.select_option('#researchDriver','MJO')
   page.wait_for_function("document.querySelector('#researchEvidence').textContent.includes('169')")
   page.screenshot(path=str(DEST/f'Climate_Dashboard_MJO_{suffix}.png'))
   page.locator('#researchCanvas svg').focus();page.keyboard.press('Home')
   assert 'masked' in page.locator('#researchReadout').inner_text()
   for _ in range(6):page.keyboard.press('ArrowRight')
   for _ in range(6):page.keyboard.press('ArrowUp')
   assert 'weak-center' in page.locator('#researchReadout').inner_text()
   page.select_option('#researchDriver','RONI')
  page.select_option('#wallScene','research');page.select_option('#researchDriver','PNA');page.wait_for_function("document.querySelector('#researchEvidence').textContent.includes('Archived quantile bins')")
  page.screenshot(path=str(DEST/'Climate_Dashboard_PNA_4K.png'))
  page.select_option('#researchSeason','JJA');page.select_option('#researchLead','D22_28');page.select_option('#researchDriver','NAO');page.select_option('#researchTarget','AreaFrac25Extreme_Any');page.select_option('#researchDomain','Northern Plains')
  page.wait_for_function("document.querySelector('#researchEvidence').textContent.includes('Northern Plains')")
  page.select_option('#wallScene','ocean');page.select_option('#pacificSelect','nino');page.wait_for_function("document.querySelector('#pacificCanvas svg')")
  page.screenshot(path=str(DEST/'Climate_Dashboard_Nino_4K.png'))
  page.locator('#pacificCanvas svg').focus();page.keyboard.press('End');assert 'Week centered' in page.locator('#ninoReadout').inner_text()
  for field in ['subsurface','equatorial_sst','winds','olr','upper_ocean']:
   page.select_option('#pacificSelect',field);page.wait_for_function('(id)=>document.querySelector("#pacificCanvas").dataset.product===id',arg=field)
  page.select_option('#wallScene','forecast');page.locator('[data-trajectory="nao"]').click();page.locator('#memberPaths').check();assert page.locator('.ensemble-member').count()==31
  page.locator('#ensembleCanvas svg').focus();page.keyboard.press('End');assert '31 members' in page.locator('#ensembleReadout').inner_text()
  page.locator('[data-cpc="cpc_3_4"]').click();page.wait_for_function("document.querySelector('#cpcCanvas').dataset.product==='cpc_3_4'");assert 'two categories' in page.locator('#cpcCategories').inner_text()
  before=page.evaluate('JSON.stringify({scene:wallScene.value,domain:researchDomain.value,lead:researchLead.value,driver:researchDriver.value,pacific:pacificSelect.value,member:memberPaths.checked})')
  page.evaluate('DashboardRefresh.checkNow()');assert before==page.evaluate('JSON.stringify({scene:wallScene.value,domain:researchDomain.value,lead:researchLead.value,driver:researchDriver.value,pacific:pacificSelect.value,member:memberPaths.checked})')
  assert page.locator('#crPlay').inner_text()=='Play'
  page.reload(wait_until='domcontentloaded');page.wait_for_function("document.querySelector('#researchEvidence').textContent.includes('Northern Plains')")
  assert page.locator('body').get_attribute('data-scene')=='forecast'
  assert page.locator('#memberPaths').is_checked()
  page.locator('#wallToggle').click();page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
  assert not errors,errors
  bad=b.new_page();m=json.loads((ROOT/'data/presentation/research_manifest.json').read_text());m['active_prediction']=True
  bad.route('**/data/presentation/research_manifest.json',lambda r:r.fulfill(json=m));bad.goto(base,wait_until='domcontentloaded');bad.wait_for_function("document.querySelector('#researchCanvas').textContent.includes('unavailable')")
  assert bad.locator('#researchCanvas svg').count()==0
  b.close()
  print('PASS: 1080p/4K scenes, controls, support masking, tooltips, manual animation, refresh/preset preservation, mobile overflow, inactive-state rejection.')
finally:server.shutdown()
