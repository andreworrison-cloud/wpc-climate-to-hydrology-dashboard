const radians = Math.PI / 180;
const tangent = (lat) => Math.tan(Math.PI / 4 + lat / 2);
const north = 30 * radians;
const south = 47 * radians;
const cone = Math.log(Math.cos(north) / Math.cos(south)) / Math.log(tangent(south) / tangent(north));
const origin = Math.cos(north) * tangent(north) ** cone / cone;
const radius = (lat) => origin / tangent(lat * radians) ** cone;

// The basemap and fixes share a Lambert conformal conic projection.
function project(lon, lat) {
  const r = radius(lat);
  const direction = cone * (lon + 74) * radians;
  return [r * Math.sin(direction) / radians, (r * Math.cos(direction) - radius(38)) / radians];
}
const fullCoast = [[-90,23],[-91,48],[-72,51],[-56,49],[-57,24]].map(([lon,lat]) => project(lon,lat));
const labels = [
  ["Miami",-80.19,25.76],["Jacksonville",-81.66,30.33],["Charleston",-79.93,32.78],
  ["Cape Hatteras",-75.53,35.25],["Norfolk",-76.29,36.85],["Washington",-77.04,38.90],
  ["New York",-74.01,40.71],["Boston",-71.06,42.36],["Portland, ME",-70.26,43.66],
  ["Halifax",-63.58,44.65],["Saint John",-66.06,45.27],["Montréal",-73.57,45.5],
];
const placeLabels = labels.map(([name, lon, lat]) => ({name, point: project(lon,lat)}));
const classColor = {noreaster: "#78e5e2", coastal: "#fac879"};

function layer(paths, close = false) {
  const result = new Path2D();
  for (const coordinates of paths) {
    for (let i=0; i<coordinates.length; i+=2) {
      const point = project(coordinates[i], coordinates[i+1]);
      if (i===0) result.moveTo(...point);
      else result.lineTo(...point);
    }
    if (close) result.closePath();
  }
  return result;
}
function sequence(start, end, step) {
  return Array.from({length: Math.round((end-start)/step)+1}, (_, i) => start+i*step);
}
const grid = layer([
  ...sequence(25,50,5).map(lat => sequence(-96,-51,.5).flatMap(lon => [lon,lat])),
  ...sequence(-95,-55,5).map(lon => sequence(21,55,.5).flatMap(lat => [lon,lat])),
]);
function frame(points, useFull, width, height) {
  const xs = points.map(p=>p[0]), ys = points.map(p=>p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(...ys), y1 = Math.max(...ys);
  const wantedWidth = useFull ? x1-x0+2 : Math.max(10, (x1-x0)*1.35+2.5);
  const wantedHeight = useFull ? y1-y0+1.5 : Math.max(7.2, (y1-y0)*1.42+2.2);
  const scale = Math.min(width/wantedWidth, height/wantedHeight);
  const centerX = (x0+x1)/2 - (useFull ? 0 : .55);
  const centerY = (y0+y1)/2;
  return {scale, x: width/2-centerX*scale, y: height/2-centerY*scale};
}
export function sizeCanvas(canvas) {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return null;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(bounds.width*ratio), h = Math.round(bounds.height*ratio);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const context = canvas.getContext("2d");
  context.setTransform(w/bounds.width,0,0,h/bounds.height,0,0);
  return {context, width:bounds.width, height:bounds.height};
}
function drawGeography(ctx, width, height, view, graphics) {
  ctx.fillStyle = "#0f293b";
  ctx.fillRect(0,0,width,height);
  if (!graphics) return;
  ctx.save();
  ctx.translate(view.x,view.y);
  ctx.scale(view.scale,view.scale);
  ctx.fillStyle = "#34535a";
  ctx.fill(graphics.land, "evenodd");
  ctx.strokeStyle = "#759b9e";
  ctx.lineWidth = 1.05/view.scale;
  ctx.stroke(graphics.land);
  ctx.fillStyle = "#153344";
  ctx.fill(graphics.lakes, "evenodd");
  ctx.strokeStyle = "#628990";
  ctx.lineWidth = .75/view.scale;
  ctx.stroke(graphics.lakes);
  ctx.strokeStyle = "#8babaa";
  ctx.globalAlpha = .64;
  ctx.lineWidth = .8/view.scale;
  ctx.stroke(graphics.borders);
  ctx.strokeStyle = "#809eab";
  ctx.globalAlpha = .19;
  ctx.lineWidth = .8/view.scale;
  ctx.stroke(grid);
  ctx.restore();
}
function onScreen(point, view) {
  return [point[0]*view.scale+view.x, point[1]*view.scale+view.y];
}
function drawPlaces(ctx, width, height, view, stormPoints) {
  const used = [];
  ctx.font = '550 11px system-ui';
  ctx.textBaseline = "middle";
  for (const {name,point} of placeLabels) {
    const [x,y] = onScreen(point,view);
    const labelWidth = ctx.measureText(name).width;
    const left = x+labelWidth+9 < width ? x+6 : x-labelWidth-6;
    const rect = [left-2, y-7, left+labelWidth+2, y+7];
    if (x<8 || y<10 || x>width-8 || y>height-10 || left<5 ||
        used.some(([a,b,c,d])=>rect[0]<c && rect[2]>a && rect[1]<d && rect[3]>b) ||
        stormPoints.some(p=>p[0]>rect[0]-10 && p[0]<rect[2]+10 && Math.abs(p[1]-y)<13)) continue;
    used.push(rect);
    ctx.fillStyle = "#e2eff0";
    ctx.beginPath();
    ctx.arc(x,y,1.7,0,Math.PI*2);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#223f4c";
    ctx.strokeText(name,left,y);
    ctx.fillText(name,left,y);
  }
}
function route(ctx, points, color, lineWidth, dashed = false) {
  ctx.beginPath();
  for (const [i,point] of points.entries()) {
    if (i===0) ctx.moveTo(...point);
    else ctx.lineTo(...point);
  }
  ctx.lineJoin = ctx.lineCap = "round";
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.setLineDash(dashed ? [5,4] : []);
  ctx.stroke();
  ctx.setLineDash([]);
}
function lineArrow(ctx, start, end) {
  if (Math.hypot(end[0]-start[0],end[1]-start[1]) < 39) return;
  ctx.save();
  ctx.translate((start[0]+end[0])/2,(start[1]+end[1])/2);
  ctx.rotate(Math.atan2(end[1]-start[1],end[0]-start[0]));
  ctx.beginPath();
  ctx.moveTo(-5,-5);
  ctx.lineTo(5,0);
  ctx.lineTo(-5,5);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = "#f2fdff";
  ctx.stroke();
  ctx.restore();
}
function drawSelected(ctx, points, active, low) {
  route(ctx,points,"#081d2a",7.5);
  route(ctx,points,"#66def7",4);
  for (let i=1;i<points.length;i++) lineArrow(ctx,points[i-1],points[i]);
  for (const [i,[x,y]] of points.entries()) {
    if (i===active || i===low) {
      ctx.beginPath();
      if (i===low) {
        ctx.moveTo(x,y-15); ctx.lineTo(x+15,y); ctx.lineTo(x,y+15); ctx.lineTo(x-15,y); ctx.closePath();
      } else ctx.arc(x,y,13.5,0,Math.PI*2);
      ctx.fillStyle = "#102939";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = i===low ? "#ffd478" : "#e7fcff";
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x,y,9,0,Math.PI*2);
    ctx.fillStyle = i===low ? "#ffd478" : "#b6f2fb";
    ctx.fill();
    ctx.strokeStyle = "#102939";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = "#112b3b";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '750 10px system-ui';
    ctx.fillText(i+1,x,y+.2);
  }
  ctx.textAlign = "start";
}
function drawOverview(ctx, plotted) {
  ctx.globalAlpha = .7;
  for (const {storm,points} of plotted) {
    const color = classColor[storm.classification];
    route(ctx,points,color,1.7,storm.classification==="coastal");
    const last = points.at(-1);
    ctx.beginPath();
    ctx.arc(...last,3,0,Math.PI*2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function distance(x,y,[ax,ay],[bx,by]) {
  const dx = bx-ax, dy = by-ay;
  const length = dx*dx+dy*dy;
  const t = length ? Math.max(0,Math.min(1,((x-ax)*dx+(y-ay)*dy)/length)) : 0;
  return Math.hypot(x-ax-t*dx,y-ay-t*dy);
}

export function createTrackMap(canvas, geography) {
  const graphics = geography && {land:layer(geography.land,true),borders:layer(geography.borders),lakes:layer(geography.lakes,true)};
  let plotted = [];
  let overview = false;
  return {
    draw(storms, selected, active, isOverview, useFull) {
      const size = sizeCanvas(canvas);
      if (!size) return;
      const {context:ctx,width,height} = size;
      overview = isOverview;
      const list = overview ? storms : selected ? [selected] : [];
      const tracks = list.map(storm=>({storm,world:storm.track.points.map(p=>project(p.lon,p.lat))}));
      const full = overview || useFull || !tracks.length;
      const view = frame(full ? fullCoast : tracks[0].world,full,width,height);
      plotted = tracks.map(({storm,world})=>({storm,points:world.map(point=>onScreen(point,view))}));
      drawGeography(ctx,width,height,view,graphics);
      drawPlaces(ctx,width,height,view,overview ? [] : plotted[0]?.points ?? []);
      if (overview) drawOverview(ctx,plotted);
      else if (plotted.length) {
        const first = plotted[0];
        const values = first.storm.track.points.map(p=>p.hpa);
        drawSelected(ctx,first.points,active,values.indexOf(Math.min(...values)));
      }
    },
    match(event) {
      const {left,top} = canvas.getBoundingClientRect();
      let best = event.pointerType==="touch" ? 18 : 12;
      let hit = null;
      for (const {storm,points} of plotted) {
        for (const [index,point] of points.entries()) {
          const d = distance(event.clientX-left,event.clientY-top,overview && index ? points[index-1] : point,point);
          if (d<best) {
            hit = {storm,index};
            best = d;
          }
        }
      }
      return hit;
    },
  };
}
