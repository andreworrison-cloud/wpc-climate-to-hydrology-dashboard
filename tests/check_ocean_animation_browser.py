"""Real source frames, variable/domain pairing, retained date and explicit playback."""
import http.server,threading,functools,json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
server=http.server.ThreadingHTTPServer(('127.0.0.1',8767),functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root)))
threading.Thread(target=server.serve_forever,daemon=True).start()
manifest=json.loads((root/'data/reanalyzer/manifest.json').read_text())
with sync_playwright() as p:
 browser=p.chromium.launch();page=browser.new_page(viewport={'width':1600,'height':1100})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8767/',wait_until='networkidle')
 page.wait_for_function('DashboardRefresh.lastCheck && !DashboardRefresh.busy')
 assert page.locator('#crMovieDomain option').all_text_contents()==['Global','North Pacific','North Atlantic']
 assert page.locator('#crMovieVariable option').all_text_contents()==['Sea surface temperature','SST anomaly']
 for domain in ['global','north_pacific','north_atlantic']:
  page.select_option('#crMovieDomain',domain)
  for variable in ['sst','ssta']:
   page.select_option('#crMovieVariable',variable)
   page.wait_for_function("!document.querySelector('#crMovieImage').hidden && document.querySelector('#crMovieImage').complete && document.querySelector('#crMovieImage').naturalWidth>200")
   assert 'Frame unavailable' not in page.locator('#crMovieStatus').inner_text()
   assert page.locator('#crPlay').inner_text()=='Play'
   assert ('Absolute SST' if variable=='sst' else '1991–2020 baseline') in page.locator('#crMovieStatus').inner_text()
   src=page.locator('#crMovieImage').get_attribute('src')
   if domain=='north_pacific':assert src.startswith('data:image/png')
   else:assert '/'+variable+'_'+domain+'_' in src
   page.locator('#crMovieImage').screenshot(path=str(root/f'review/movie-{variable}-{domain}.png'))
 # Same valid date across variable switch (not a jump to the latest frame).
 page.select_option('#crMovieDomain','global');page.locator('#crSlider').focus();page.locator('#crSlider').press('Home');page.locator('#crSlider').press('ArrowRight')
 chosen=manifest['animation']['variables']['ssta']['domains']['global']['frames'][1]['valid_date']
 page.wait_for_function("date=>document.querySelector('#crMovieStatus').textContent.includes(date)",arg=chosen)
 page.select_option('#crMovieVariable','sst')
 page.wait_for_function("!document.querySelector('#crMovieImage').hidden")
 assert chosen in page.locator('#crMovieStatus').inner_text()
 page.select_option('#crSpeed','250');page.click('#crPlay')
 assert page.locator('#crPlay').inner_text()=='Pause'
 page.wait_for_function("date=>!document.querySelector('#crMovieStatus').textContent.includes(date)",arg=chosen)
 page.select_option('#crMovieVariable','ssta')
 assert page.locator('#crPlay').inner_text()=='Play'
 assert page.input_value('#crSpeed')=='250'
 page.set_viewport_size({'width':390,'height':844});page.select_option('#crMovieDomain','north_pacific')
 page.wait_for_function("!document.querySelector('#crMovieImage').hidden")
 assert page.locator('#ocean-history').evaluate('(el)=>el.scrollWidth<=el.clientWidth+1')
 assert not errors,errors
 browser.close()
server.shutdown();print('PASS: six variable/domain views, common date retention, shared speed, explicit playback, mobile width')
