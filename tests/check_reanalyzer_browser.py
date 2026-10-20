"""Branch integration check against actual cached products, not mock values."""
import http.server,threading,functools
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
import json
from datetime import date
for driver in ['mjo','pna','nao']:
 rows=json.loads((root/f'data/{driver}_history.json').read_text())['values']
 assert (date.fromisoformat(rows[-1]['date'])-date.fromisoformat(rows[0]['date'])).days>=730,driver
server=http.server.ThreadingHTTPServer(('127.0.0.1',8765),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
(root/'review').mkdir(exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch();page=browser.new_page(viewport={'width':1600,'height':1100},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.goto('http://127.0.0.1:8765/',wait_until='networkidle')
 page.locator('#crCards .cr-card').first.wait_for()
 assert page.locator('#crCards .cr-card').count()==4
 assert page.locator('#crCards svg').count()==4
 page.wait_for_function("document.querySelector('#crMovieImage').naturalWidth>200 && !document.querySelector('#crMovieImage').hidden")
 page.wait_for_function("document.querySelector('#crAtmosImage').naturalWidth>200 && !document.querySelector('#crAtmosImage').hidden")
 page.locator('#ocean-history').screenshot(path=str(root/'review/ocean-history.png'))
 page.locator('#atmospheric-context').screenshot(path=str(root/'review/atmospheric-context.png'))
 page.select_option('#crHistoryWindow','2y');page.select_option('#crMovieDomain','north_atlantic')
 page.wait_for_function("document.querySelector('#crMovieImage').src.includes('north_atlantic') && !document.querySelector('#crMovieImage').hidden")
 page.click('#crPlay');assert page.locator('#crPlay').inner_text()=='Pause';page.click('#crPlay')
 for selector in ['#crHistoryWindow','#observedHistoryWindow']:
  assert page.locator(selector+' option').all_text_contents()==['30 days','90 days','180 days','1 year','2 years']
  for period in ['30','90','180','1y','2y']:
   page.select_option(selector,period)
   assert page.locator('#crCards svg').count()==4
   assert page.locator('#observed .chart-host > svg').count()==4
 assert page.input_value('#mjoView')=='phase'
 assert page.locator('#mjoChart .phase-circle').count()==1
 assert page.locator('#mjoLegend span').count()==9
 page.select_option('#observedHistoryWindow','30')
 page.locator('#observed').screenshot(path=str(root/'review/mjo-phase-default.png'))
 page.select_option('#mjoView','timeline')
 assert page.locator('#mjoChart svg').get_attribute('aria-label')=='MJO amplitude history'
 assert page.locator('#mjoChart .phase-circle').count()==0
 assert page.locator('#mjoLegend span').count()==9
 # Inspect actual endpoint values by keyboard and pointer, independent of tiny circles.
 manifest=json.loads((root/'data/reanalyzer/manifest.json').read_text())
 chart=page.locator('#crCards svg').first
 chart.focus();chart.press('End')
 latest=manifest['sst_regions'][0]['rows'][-1]
 readout=page.locator('#crCards .cr-readout').first
 assert latest['date'] in readout.inner_text()
 assert f"{latest['sst_c']:.2f}" in readout.inner_text()
 assert 'Anomaly' in readout.inner_text() and 'Preliminary' in readout.inner_text()
 box=chart.bounding_box();page.mouse.move(box['x']+box['width']*.12,box['y']+box['height']*.5)
 assert latest['date'] not in readout.inner_text()
 chart.press('End');chart.press('ArrowLeft')
 assert manifest['sst_regions'][0]['rows'][-2]['date'] in readout.inner_text()
 page.locator('#ocean-history').screenshot(path=str(root/'review/sst-readout.png'))
 assert page.locator('#driverCards .strength-legend').count()==4
 assert 'Strong El Niño range' in page.locator('#driverCards').inner_text()
 for value,label in [(None,'Strength unavailable'),(0,'ENSO-neutral range'),(.499,'ENSO-neutral range'),(.5,'Weak El Niño range'),(-.5,'Weak La Niña range'),(1,'Moderate El Niño range'),(-1.5,'Strong La Niña range'),(2,'Very strong El Niño range')]:
  assert page.evaluate('(v)=>driverStrength({id:"roni",value:v})',value)==label
 for driver in ['pna','nao']:
  assert page.evaluate('(d)=>driverStrength({id:d,value:0.49})',driver)=='Near-zero magnitude'
  assert page.evaluate('(d)=>driverStrength({id:d,value:-2})',driver).startswith('Strong negative')
 assert page.evaluate('driverStrength({id:"mjo_rmm",amplitude:.99})')=='Weak MJO'
 assert page.evaluate('driverStrength({id:"mjo_rmm",amplitude:1})')=='Moderate MJO · active'
 assert page.evaluate('driverStrength({id:"mjo_rmm",amplitude:2})')=='Strong MJO · active'
 page.locator('#driverCards').screenshot(path=str(root/'review/driver-strengths.png'))
 page.locator('#observed').screenshot(path=str(root/'review/observed-two-years.png'))
 page.locator('#ocean-history').screenshot(path=str(root/'review/history-two-years.png'))
 page.select_option('#crSpeed','125');page.click('#crPlay');page.wait_for_timeout(1000);page.click('#crPlay')
 page.click('[data-ocean-provider="noaa"]');page.click('[data-ocean-region="atlantic"]')
 for product in ['sst','ssta']:
  page.click('[data-ocean-product="'+product+'"]')
  page.wait_for_function("document.querySelector('#oceanImage').src.startsWith('data:') && !document.querySelector('#oceanImage').hidden")
  assert page.locator('#oceanImage').evaluate('(el)=>el.naturalWidth')==900
  for control in ['oceanZoomIn','oceanZoomNative','oceanZoomFit']:
   page.click('#'+control)
   assert page.locator('#oceanImage').evaluate('(el)=>el.naturalWidth')==900
  page.locator('#oceanViewport').screenshot(path=str(root/f'review/atlantic-{product}.png'))
 page.set_viewport_size({'width':390,'height':844});page.locator('#ocean-history').screenshot(path=str(root/'review/mobile-ocean.png'))
 assert page.locator('#ocean-history').evaluate('(el)=>el.scrollWidth <= el.clientWidth+1')
 chart=page.locator('#crCards svg').first
 chart.click(position={'x':100,'y':80})
 assert 'Anomaly' in page.locator('#crCards .cr-readout').first.inner_text()
 assert not errors,errors
 browser.close()
server.shutdown();print('PASS: populated cards, maps, selectors, playback, mobile width, no JS exceptions')
