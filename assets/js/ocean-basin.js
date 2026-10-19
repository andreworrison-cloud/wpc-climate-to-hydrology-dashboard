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
  if(typeof module!=='undefined')module.exports={basinLayout,lonLabel,latLabel};
  else root.OceanBasin={basinLayout,renderBasin};
})(typeof window!=='undefined'?window:globalThis);
