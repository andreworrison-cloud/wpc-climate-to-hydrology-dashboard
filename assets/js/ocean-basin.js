/* Display-only crops of NASA's verified global PNG layout. No data values inferred.
 * Pacific panels join at the original dateline seam; colors remain source pixels.
 */
(function(root){
  function basinLayout(width,height,region){
    if(width!==1548||height!==892)throw new Error('NASA global image layout changed; basin rendering requires review.');
    const regions={pacific:[[1229,289],[30,455]],atlantic:[[361,537]]};
    if(!regions[region])throw new Error('Unknown basin');
    const segments=regions[region],w=segments.reduce((sum,r)=>sum+r[1],0);
    return {segments,width:w,mapY:101,mapHeight:661,headerHeight:Math.round(100*w/1548),legendHeight:Math.round(130*w/1548)};
  }
  function renderBasin(source,region){
    const p=basinLayout(source.naturalWidth,source.naturalHeight,region);
    const canvas=document.createElement('canvas');canvas.width=p.width;canvas.height=p.headerHeight+p.mapHeight+p.legendHeight;
    const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(source,0,0,1548,100,0,0,p.width,p.headerHeight);
    let x=0;
    for(const [start,width] of p.segments){ctx.drawImage(source,start,p.mapY,width,p.mapHeight,x,p.headerHeight,width,p.mapHeight);x+=width;}
    // Include the complete original scale, ticks and unit label beneath each basin.
    ctx.drawImage(source,0,762,1548,130,0,p.headerHeight+p.mapHeight,p.width,p.legendHeight);
    return canvas.toDataURL('image/png');
  }
  if(typeof module!=='undefined')module.exports={basinLayout};
  else root.OceanBasin={basinLayout,renderBasin};
})(typeof window!=='undefined'?window:globalThis);
