/* Display-only NASA global PNG views. Approximate graticule, not data geolocation.
 * Global map is cylindrical lat/lon, 180W–180E / 80S–80N; see NASA PO.DAAC
 * SPORT-MSFC-L4-GLOB-v1.0. Image geometry checked against visible coastlines.
 * Use only interior pixels: the source frame must not become a dateline stripe.
 * No SST values are inferred; original header and full color legend are retained.
 */
(function(root){
  const EXTENTS={pacific:{west:100,east:280,south:-45,north:45},atlantic:{west:-100,east:30,south:-5,north:60}};
  function basinLayout(width,height,region){
    if(width!==1548||height!==892)throw new Error('NASA global image layout changed; basin rendering requires review.');
    const b=EXTENTS[region];if(!b)throw new Error('Unknown basin');
    // Two-pixel frame exclusion; coordinates on this rendered image are approximate.
    const x=lon=>32+(lon+180)*1484/360,y=lat=>103+(80-lat)*658/160;
    const segments=b.east>180?[[x(b.west),1516-x(b.west)],[32,x(b.east-360)-32]]:[[x(b.west),x(b.east)-x(b.west)]];
    const sourceWidth=segments.reduce((sum,r)=>sum+r[1],0),w=742;
    const sourceHeight=y(b.south)-y(b.north);
    return {bounds:b,segments,width:w,mapY:y(b.north),sourceHeight,mapHeight:Math.round(sourceHeight*w/sourceWidth),headerHeight:Math.round(100*w/1548),legendHeight:Math.round(130*w/1548),margin:42};
  }
  function lonLabel(lon){const n=((lon+180)%360+360)%360-180;return Math.abs(n)===180?'180°':n===0?'0°':`${Math.abs(n)}°${n>0?'E':'W'}`;}
  function latLabel(lat){return lat===0?'EQ':`${Math.abs(lat)}°${lat>0?'N':'S'}`;}
  function renderBasin(source,region){
    const p=basinLayout(source.naturalWidth,source.naturalHeight,region),b=p.bounds,m=p.margin;
    const canvas=document.createElement('canvas');canvas.width=p.width+2*m;canvas.height=p.headerHeight+p.mapHeight+p.legendHeight+2*m;
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(source,0,0,1548,100,m,0,p.width,p.headerHeight);
    const top=p.headerHeight+m;let x=m;
    for(const [start,width] of p.segments){const dw=width*p.width/p.segments.reduce((s,r)=>s+r[1],0);ctx.drawImage(source,start,p.mapY,width,p.sourceHeight,x,top,dw,p.mapHeight);x+=dw;}
    ctx.font='12px sans-serif';ctx.fillStyle='#263644';ctx.strokeStyle='rgba(30,50,65,.3)';ctx.lineWidth=.6;ctx.setLineDash([3,4]);
    for(let lon=Math.ceil(b.west/20)*20;lon<=b.east;lon+=20){const xx=m+(lon-b.west)/(b.east-b.west)*p.width;ctx.beginPath();ctx.moveTo(xx,top);ctx.lineTo(xx,top+p.mapHeight);ctx.stroke();ctx.textAlign='center';ctx.fillText(lonLabel(lon),xx,top-10);}
    for(let lat=Math.ceil(b.south/20)*20;lat<=b.north;lat+=20){const yy=top+(b.north-lat)/(b.north-b.south)*p.mapHeight;ctx.beginPath();ctx.moveTo(m,yy);ctx.lineTo(m+p.width,yy);ctx.stroke();ctx.textAlign='right';ctx.fillText(latLabel(lat),m-6,yy+4);ctx.textAlign='left';ctx.fillText(latLabel(lat),m+p.width+6,yy+4);}
    ctx.setLineDash([]);ctx.strokeStyle='#627181';ctx.strokeRect(m,top,p.width,p.mapHeight);
    ctx.textAlign='center';ctx.font='11px sans-serif';ctx.fillText('Approximate latitude / longitude guides · NASA global-image crop',canvas.width/2,top+p.mapHeight+18);
    ctx.drawImage(source,0,762,1548,130,m,top+p.mapHeight+m,p.width,p.legendHeight);
    return canvas.toDataURL('image/png');
  }
  function renderNoaaAtlantic(source,product){
    const h=product==='sst'?1085:1050;
    if(source.naturalWidth!==1787||source.naturalHeight!==h)throw new Error('NOAA global layout changed; Atlantic view requires review.');
    // Verified cylindrical source frames: 20E–380E, 90N–90S. Separate layouts per variable.
    const left=product==='sst'?67:98,right=product==='sst'?1720:1689,top=110,bottom=product==='sst'?937:905;
    const west=-100,east=20,north=60,south=-5;
    const sx=left+(west+360-20)/360*(right-left),sy=top+(90-north)/180*(bottom-top);
    const sw=(east-west)/360*(right-left),sh=(north-south)/180*(bottom-top);
    const c=document.createElement('canvas');c.width=900;c.height=650;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,900,650);
    ctx.drawImage(source,0,0,1787,65,0,0,900,33);
    const x=50,y=70,w=800,mh=sh*w/sw;
    ctx.drawImage(source,sx,sy,sw,sh,x,y,w,mh);
    ctx.font='14px sans-serif';ctx.fillStyle='#263644';
    for(let lon=-100;lon<=20;lon+=20){const xx=x+(lon-west)/(east-west)*w;ctx.textAlign='center';ctx.fillText(lonLabel(lon),xx,y-12);}
    for(let lat=0;lat<=60;lat+=20){const yy=y+(north-lat)/(north-south)*mh;ctx.textAlign='right';ctx.fillText(latLabel(lat),x-5,yy+4);}
    ctx.strokeStyle='#627181';ctx.strokeRect(x,y,w,mh);
    ctx.textAlign='center';ctx.font='12px sans-serif';ctx.fillText('Atlantic · 100°W–20°E, 5°S–60°N · NOAA source-image crop',450,y+mh+23);
    const legend=product==='sst'?985:953;ctx.drawImage(source,0,legend,1787,h-legend,0,560,900,(h-legend)*900/1787);
    return c.toDataURL('image/png');
  }
  if(typeof module!=='undefined')module.exports={basinLayout,lonLabel,latLabel};
  else root.OceanBasin={basinLayout,renderBasin,renderNoaaAtlantic};
})(typeof window!=='undefined'?window:globalThis);
