"""Simulated publication/failure checks against real cached products; no production data changed."""
import http.server, threading, functools, json, copy
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',8766),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
(root/'review').mkdir(exist_ok=True)
def data(path):return json.loads((root/path).read_text())
with sync_playwright() as p:
 browser=p.chromium.launch();page=browser.new_page(viewport={'width':1600,'height':1100})
 page.clock.install()
 changes={};failed=set();requests=[];errors=[]
 def intercept(route):
  path=urlparse(route.request.url).path.lstrip('/');requests.append(path)
  if path in failed:route.fulfill(status=503,body='Test delivery failure')
  elif path in changes:route.fulfill(json=changes[path])
  else:route.continue_()
 page.route('**/data/**',intercept);page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8766/',wait_until='networkidle')
 page.wait_for_function('DashboardRefresh.lastCheck && !DashboardRefresh.busy')
 assert 'Check incomplete' not in page.locator('#autoRefreshStatus').inner_text()
 assert page.locator('#crPlay').inner_text()=='Play'
 assert page.evaluate('DashboardRefresh.intervalMs')==300000
 # Real scheduled check, unchanged data: no card replacement and no autoplay.
 old=page.locator('#driverCards .driver-card').first.element_handle();count=len(requests)
 page.clock.fast_forward(300000)
 page.wait_for_function('!DashboardRefresh.busy')
 assert len(requests)>count
 assert old.evaluate('(el)=>el.isConnected')
 assert 'No new published data' in page.locator('#autoRefreshStatus').inner_text()
 page.select_option('#crHistoryWindow','180');page.select_option('#observedHistoryWindow','2y');page.select_option('#mjoView','timeline')
 page.click('[data-ocean-provider="noaa"]');page.click('[data-ocean-region="atlantic"]');page.click('[data-ocean-product="ssta"]')
 page.wait_for_function("!document.querySelector('#oceanImage').hidden && document.querySelector('#oceanImage').src.startsWith('data:')")
 page.click('#oceanZoomIn');page.locator('#oceanViewport').evaluate('(el)=>{el.scrollLeft=110;el.scrollTop=40;}')
 page.select_option('#crMovieDomain','north_atlantic');page.locator('#crSlider').focus();page.locator('#crSlider').press('Home');page.locator('#crSlider').press('ArrowRight')
 selected_path=data('data/reanalyzer/manifest.json')['animation']['domains']['north_atlantic']['frames'][1]['path']
 page.wait_for_function("path=>document.querySelector('#crMovieImage').src.includes(path)",arg=selected_path)
 page.click('[data-lead="D22_28"]');page.locator('#driverCards details').first.evaluate('(el)=>el.open=true')
 def state():return page.evaluate('''()=>({window:document.querySelector('#crHistoryWindow').value,observed:document.querySelector('#observedHistoryWindow').value,mjo:document.querySelector('#mjoView').value,zoom:document.querySelector('#oceanZoomLevel').textContent,region:document.querySelector('[data-ocean-region][aria-pressed="true"]').dataset.oceanRegion,product:document.querySelector('[data-ocean-product][aria-pressed="true"]').dataset.oceanProduct,frame:document.querySelector('#crSlider').value,movie:document.querySelector('#crMovieImage').src,play:document.querySelector('#crPlay').textContent,lead:document.querySelector('[data-lead][aria-pressed="true"]').dataset.lead})''')
 before=state()
 climate=data('data/climate_current.json');climate['indicators'][0]['value']=.75
 changes['data/climate_current.json']=climate
 roni=data('data/roni_history.json');roni['values'][-1]['value']=.75;changes['data/roni_history.json']=roni
 ocean=data('data/ocean/manifest.json')
 for row in ocean['products']:row['sha256']='test-publication';row['retrieved_at']='2026-10-20T02:20:00Z'
 changes['data/ocean/manifest.json']=ocean
 cr=data('data/reanalyzer/manifest.json');cr['checked_at']='test-publication';cr['animation']['test_revision']=1
 changes['data/reanalyzer/manifest.json']=cr
 page.evaluate('()=>DashboardRefresh.checkNow()')
 page.wait_for_function("!document.querySelector('#oceanImage').hidden")
 assert 'Check incomplete' not in page.locator('#autoRefreshStatus').inner_text()
 assert state()==before,(state(),before)
 assert '+0.75' in page.locator('#driverCards').inner_text()
 assert page.locator('#driverCards .driver-card').count()==4
 assert page.locator('#driverCards details').first.evaluate('(el)=>el.open')
 assert page.locator('#crMovieRefresh').is_visible()
 # Existing user-started playback continues; publication never presses Play or changes a menu.
 page.click('#crPlay');assert page.locator('#crPlay').inner_text()=='Pause'
 cr=copy.deepcopy(cr);cr['checked_at']='second-test-publication';changes['data/reanalyzer/manifest.json']=cr
 page.evaluate('()=>DashboardRefresh.checkNow()');assert page.locator('#crPlay').inner_text()=='Pause'
 page.click('#crPlay');assert page.locator('#crPlay').inner_text()=='Play'
 # A failed JSON request retains existing values and reports the affected group.
 failed.add('data/climate_current.json');old_text=page.locator('#driverCards').inner_text()
 page.evaluate('()=>DashboardRefresh.checkNow()')
 assert page.locator('#driverCards').inner_text()==old_text
 assert 'previous display retained for observed drivers' in page.locator('#autoRefreshStatus').inner_text()
 failed.clear()
 # A new manifest with an undeliverable selected map must not erase the current map or metadata.
 old_src=page.locator('#oceanImage').get_attribute('src');old_meta=page.locator('#oceanProvenance').inner_text()
 ocean=copy.deepcopy(ocean)
 for row in ocean['products']:row['sha256']='test-undeliverable'
 changes['data/ocean/manifest.json']=ocean;failed.add('data/ocean/ssta_global.png')
 page.evaluate('()=>DashboardRefresh.checkNow()')
 assert page.locator('#oceanImage').get_attribute('src')==old_src
 assert page.locator('#oceanProvenance').inner_text()==old_meta
 assert 'ocean maps' in page.locator('#autoRefreshStatus').inner_text()
 failed.clear();page.evaluate('()=>DashboardRefresh.checkNow()')
 assert 'Check incomplete' not in page.locator('#autoRefreshStatus').inner_text()
 assert page.locator('#crPlay').inner_text()=='Play'
 # Only explicit engagement adopts the refreshed animation catalog.
 page.click('#crMovieRefresh');assert page.locator('#crMovieRefresh').is_hidden()
 assert page.locator('#crPlay').inner_text()=='Play'
 page.locator('#autoRefreshStatus').screenshot(path=str(root/'review/automatic-refresh-status.png'))
 assert not errors,errors
 browser.close()
server.shutdown();print('PASS: five-minute timer, unchanged DOM, new data, preserved controls/zoom/frame, no autoplay, active playback retention, JSON/image failure recovery')
