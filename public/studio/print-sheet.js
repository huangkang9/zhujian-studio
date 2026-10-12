import {localizeMarkup,getLanguage} from './i18n.js?v=0.12';
import {bounds,wallPoints,findRooms} from './model.js?v=0.12';
import {renderPlan,esc} from './plan.js?v=0.12';
export const printScales=[25,50,75,100,150,200,500];
export function printLayout(p,{paper='A3',orientation='landscape',scale=100,furniture=true}={}){
 if(!['A4','A3'].includes(paper)||!['landscape','portrait'].includes(orientation)||!printScales.includes(+scale))throw Error('不支持的纸张或比例');
 scale=+scale;const dims=paper==='A3'?[420,297]:[297,210],[width,height]=orientation==='landscape'?dims:[...dims].reverse();
 const margin=10,header=16,footer=29,area={x:margin,y:margin+header,w:width-2*margin,h:height-2*margin-header-footer};
 const b=bounds({...p,furniture:furniture?p.furniture:[]}),pts=[{x:b.x,y:b.y},{x:b.x+b.w,y:b.y+b.h},...(p.measurements||[]).flatMap(m=>[m.a,m.b])];
 // Include complete open door leaves: endpoints may extend beyond the wall bounds.
 for(const o of p.openings.filter(o=>o.type==='door')){const w=p.walls.find(w=>w.id===o.wall);if(!w)continue;const[a,z]=wallPoints(p,w),l=Math.hypot(z.x-a.x,z.y-a.y)||1;const h={x:a.x+(z.x-a.x)*o.offset/l,y:a.y+(z.y-a.y)*o.offset/l};pts.push({x:h.x-o.width,y:h.y-o.width},{x:h.x+o.width,y:h.y+o.width});}
 const pad=Math.max(0,...p.walls.map(w=>w.thickness/2))+scale*9,minX=Math.min(...pts.map(p=>p.x))-pad,maxX=Math.max(...pts.map(p=>p.x))+pad,minY=Math.min(...pts.map(p=>p.y))-pad,maxY=Math.max(...pts.map(p=>p.y))+pad;
 const extent={x:minX,y:minY,w:maxX-minX,h:maxY-minY},fits=extent.w/scale<=area.w&&extent.h/scale<=area.h;
 const view={x:(minX+maxX)/2-area.w*scale/2,y:(minY+maxY)/2-area.h*scale/2,w:area.w*scale,h:area.h*scale};
 return{paper,orientation,scale,furniture,width,height,area,extent,view,fits};
}
function sheetSource(p,options={}){
 const l=printLayout(p,options);if(!l.fits)throw Error('当前纸张与比例放不下完整图纸，请改用较小比例或更大纸张');
 const {width:w,height:h,area:a,view,scale}=l;
 const plan=renderPlan(p,{view,width:view.w/(scale*.25),dims:true,furniture:l.furniture},{exporting:true});
 const titleLimit=Math.min(36,Math.floor((w-100)/4));
 const y=h-10-26,barMm=50,barReal=barMm*scale/1000,rooms=findRooms(p),date=options.date||new Date().toISOString().slice(0,10);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(p.name)}，${l.paper}，比例 1:${scale}"><rect width="${w}" height="${h}" fill="white"/><g font-family="Arial,PingFang SC,Microsoft YaHei,Noto Sans CJK SC,sans-serif" fill="#253e35"><rect x="10" y="10" width="${w-20}" height="${h-20}" fill="none" stroke="#34493e" stroke-width=".3"/><text x="15" y="19" font-size="4.2" font-weight="bold">${getLanguage()==='en'?'SPACE STUDIO':'筑间 / SPACE STUDIO'}</text><text x="${w-15}" y="19" font-size="3" text-anchor="end">一层平面 · 轴线尺寸 / mm</text><svg x="${a.x}" y="${a.y}" width="${a.w}" height="${a.h}" viewBox="${view.x} ${view.y} ${view.w} ${view.h}">${plan}</svg><path d="M10 ${y}H${w-10}" stroke="#34493e" stroke-width=".3"/><text x="15" y="${y+7}" font-size="4" data-i18n-user="">${esc(p.name.length>titleLimit?p.name.slice(0,titleLimit-1)+'…':p.name)}</text><text x="15" y="${y+13}" font-size="2.8">${l.paper} · 1:${scale} · ${esc(date)} · ${rooms.reduce((sum,r)=>sum+r.area,0).toFixed(2)} m²（轴线）</text><text x="15" y="${y+21}" font-size="2.6">${getLanguage()==='en'?`${p.example?'Demo · ':''}Draft: verify on site. Print 100%; no headers/footers.`:`${p.example?'功能演示方案 · ':''}设计草案，须复核现场尺寸；打印请使用实际大小 / 100%，关闭页眉页脚。`}</text><g transform="translate(${w-75} ${y+8})"><text y="-2" font-size="2.5">比例尺 / m</text><rect width="${barMm}" height="2" fill="none" stroke="#253e35" stroke-width=".2"/><rect width="${barMm/2}" height="2" fill="#253e35"/><text y="6" font-size="2.5">0</text><text x="${barMm/2}" y="6" font-size="2.5" text-anchor="middle">${barReal/2}</text><text x="${barMm}" y="6" font-size="2.5" text-anchor="end">${barReal}</text></g></g></svg>`;
}
function documentSource(p,options={}){const l=printLayout(p,options);return `<!doctype html><html lang="${getLanguage()}"><head><meta charset="utf-8"><title data-i18n-user="">${esc(p.name)} · 1:${l.scale}</title><style>@page{size:${l.width}mm ${l.height}mm;margin:0}*{box-sizing:border-box}body{margin:0;background:#e8ece7;font-family:Arial,sans-serif}.sheet{width:${l.width}mm;height:${l.height}mm;margin:20px auto;background:white}.sheet>svg{display:block;width:100%;height:100%}.tools{text-align:center;padding:14px;color:#253e35}button{padding:12px 22px;border:0;border-radius:8px;background:#176b5b;color:white;cursor:pointer}@media print{body{background:white}.tools{display:none}.sheet{margin:0;break-inside:avoid}}</style></head><body><div class="tools"><p>纸张 ${l.paper} · 比例 1:${l.scale} · 实际大小 / 100% · 关闭页眉页脚；用图中比例尺校核输出。</p><button onclick="window.print()">打印 / 保存 PDF</button></div><div class="sheet">${printSheetSVG(p,options)}</div></body></html>`;}

export function printSheetSVG(p,options={}){return localizeMarkup(sheetSource(p,options));}
export function printDocument(p,options={}){return localizeMarkup(documentSource(p,options));}
