/* Poll published static files only. No workflow dispatch, inference, or autoplay. */
(() => {
  const groups=[], intervalMs=5*60*1000;
  let busy=false, timer=null, lastCheck=null;
  const status=()=>document.getElementById('autoRefreshStatus');
  const stamp=()=>new Date().toISOString().replace('T',' ').slice(0,19)+' UTC';
  async function read(path){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
    try{const r=await fetch(path,{cache:'no-cache',signal:controller.signal});if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);return await r.json();}finally{clearTimeout(timeout);}
  }
  function versioned(path,version){const u=new URL(path,location.href);u.searchParams.set('v',String(version||''));return u.href;}
  async function imageReady(src){
    const img=new Image();img.src=src;let timeout;
    try{await Promise.race([img.decode(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(Error('Image delivery timeout')),20000);})]);if(!img.naturalWidth)throw Error('Image unavailable');return img;}finally{clearTimeout(timeout);}
  }
  async function checkNow(){
    if(busy)return;busy=true;clearTimeout(timer);
    if(status())status().textContent='Automatic updates · checking published data…';
    const results=await Promise.all(groups.map(async group=>{
      try{
        const values=await Promise.all(group.paths.map(read)),signature=JSON.stringify(values);
        if(signature!==group.signature){await group.apply(values,{initial:group.signature===null});group.signature=signature;return {name:group.name,changed:true};}
        return {name:group.name};
      }catch(error){console.warn('Background update retained:',group.name,error);return {name:group.name,error:true};}
    }));
    lastCheck=stamp();const failed=results.filter(r=>r.error).map(r=>r.name),changed=results.filter(r=>r.changed).map(r=>r.name);
    if(status())status().textContent=`Automatic updates · every 5 minutes · Last check: ${lastCheck} · ${failed.length?'Check incomplete; previous display retained for '+failed.join(', '):changed.length?'Updated '+changed.join(', '):'No new published data'}`;
    document.dispatchEvent(new CustomEvent('dashboard:checked',{detail:{lastCheck,failed}}));
    busy=false;timer=setTimeout(checkNow,intervalMs);
  }
  window.DashboardRefresh={register(name,paths,apply){groups.push({name,paths,apply,signature:null});},checkNow,versioned,imageReady,intervalMs,get busy(){return busy;},get lastCheck(){return lastCheck;}};
  document.addEventListener('DOMContentLoaded',checkNow,{once:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)checkNow();});
})();
