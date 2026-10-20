/* Display windows only: dates are observation coordinates, never release timestamps. */
window.HistoryView={
 cutoff(end,period){const d=new Date(end);if(String(period).endsWith('y')){const month=d.getUTCMonth();d.setUTCFullYear(d.getUTCFullYear()-parseInt(period));if(d.getUTCMonth()!==month)d.setUTCDate(0);d.setUTCDate(d.getUTCDate()+1);}else d.setUTCDate(d.getUTCDate()-Number(period)+1);return d.getTime();},
 date(r){return r.date||`${r.year}-${String(['DJF','JFM','FMA','MAM','AMJ','MJJ','JJA','JAS','ASO','SON','OND','NDJ'].indexOf(r.season)+1).padStart(2,'0')}-15`;},
 select(rows,period){if(!rows.length)return [];const start=this.cutoff(this.date(rows.at(-1)),period);return rows.filter(r=>Date.parse(this.date(r))>=start);},
 ticks(begin,end,left,width,bottom){let svg='';for(let i=0;i<=20;i++){const x=left+width*i/20,major=i%5===0;svg+=`<line x1="${x}" x2="${x}" y1="${bottom}" y2="${bottom+(major?7:3)}" stroke="#8daec3"/>`;if(major){const d=new Date(begin+(end-begin)*i/20).toISOString().slice(0,10);svg+=`<text x="${x}" y="${bottom+21}" text-anchor="${i===0?'start':i===20?'end':'middle'}" class="chart-axis-label">${d}</text>`;}}return svg;}
};
