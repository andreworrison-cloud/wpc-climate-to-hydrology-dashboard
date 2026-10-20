"""Branch integration check against actual cached products, not mock values."""
import http.server,threading,functools
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
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
 page.select_option('#crHistoryWindow','366');page.select_option('#crMovieDomain','north_atlantic')
 page.wait_for_function("document.querySelector('#crMovieImage').src.includes('north_atlantic') && !document.querySelector('#crMovieImage').hidden")
 page.click('#crPlay');assert page.locator('#crPlay').inner_text()=='Pause';page.click('#crPlay')
 for d in ['global','pacific','north_america']:
  page.select_option('#crAtmosDomain',d)
  for v in ['pwtr','gph500-anomsd','ws250-mslp','pwtr-anomsd']:
   page.select_option('#crAtmosVariable',v)
   page.wait_for_function("document.querySelector('#crAtmosImage').complete && document.querySelector('#crAtmosImage').naturalWidth>200")
 page.set_viewport_size({'width':390,'height':844});page.locator('#ocean-history').screenshot(path=str(root/'review/mobile-ocean.png'))
 assert page.locator('#ocean-history').evaluate('(el)=>el.scrollWidth <= el.clientWidth+1')
 assert not errors,errors
 browser.close()
server.shutdown();print('PASS: populated cards, maps, selectors, playback, mobile width, no JS exceptions')
