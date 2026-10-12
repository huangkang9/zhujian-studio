/** Local material samples and illustrative lighting; no external assets or solar-location claim. */
const sample=(id,name,family,color,roughness,warmth)=>({id,name,family,color,roughness,warmth});
export const materialSamples=[
 sample('oak','浅橡木','wood','#c9ad82',.68,.8),sample('walnut','烟熏胡桃','wood','#72513e',.6,.8),sample('ash','白蜡木','wood','#dfd3b8',.72,.6),sample('teak','蜜色柚木','wood','#b77d46',.58,1),sample('charcoal-oak','炭化橡木','wood','#4a4840',.8,.25),sample('rosewood','赤褐木','wood','#955d47',.62,.9),
 sample('travertine','暖灰洞石','stone','#c9bd9f',.8,.55),sample('marble','奶白大理石','stone','#e5e2d8',.24,.2),sample('slate','墨色板岩','stone','#535b58',.87,.1),sample('terrazzo','浅色水磨石','stone','#d2c9b9',.58,.4),sample('sandstone','砂岩','stone','#b89c78',.92,.8),sample('limestone','石灰岩','stone','#b2b4a7',.78,.2),
 sample('linen','原色亚麻','fabric','#d7c9af',.96,.75),sample('boucle','奶油圈绒','fabric','#e7dfcc',1,.65),sample('sage','鼠尾草织物','fabric','#839480',.95,.35),sample('rust','赤陶绒布','fabric','#af7054',.92,1),sample('ink','午夜蓝绒','fabric','#394b58',.93,.05),sample('cocoa','可可羊毛','fabric','#816859',.98,.75),
 sample('chalk','暖白','paint','#eee9dd',.92,.6),sample('clay','陶土','paint','#c89b7e',.95,1),sample('olive','灰橄榄','paint','#7d896d',.96,.45),sample('mist','雾灰','paint','#c5cdd0',.88,.05),sample('forest','深森林','paint','#364e43',.95,.3),sample('graphite','石墨','paint','#45494a',.9,.05)
];
export const materialFamilies={wood:'木材',stone:'石材',fabric:'织物',paint:'涂料'};
export const finishById=id=>materialSamples.find(m=>m.id===id)||null;
export const defaultAtmosphere={hour:16.5,exposure:1.08,shadows:true,grid:true,collision:true,preset:'custom'};
export function atmosphereSettings(p){return {...defaultAtmosphere,...p.atmosphere};}
export function normalizeAtmosphere(p){
 if(p.atmosphere){const a=p.atmosphere;if(typeof a!=='object'||!Number.isFinite(a.hour)||a.hour<0||a.hour>24)throw Error('日照时间范围 0～24 小时');if(a.exposure!==undefined&&(!Number.isFinite(a.exposure)||a.exposure<.4||a.exposure>2))throw Error('曝光范围 0.4～2.0');p.atmosphere={...defaultAtmosphere,hour:a.hour,exposure:a.exposure??1.08,shadows:a.shadows!==false,grid:a.grid!==false,collision:a.collision!==false,preset:['cozy','bright','moody'].includes(a.preset)?a.preset:'custom'};}
 for(const o of [...p.walls,...p.furniture,...Object.values(p.roomMeta)])if(o.finish&&!finishById(o.finish))delete o.finish;
 for(const w of p.walls)if(w.color&&!/^#[0-9a-f]{6}$/i.test(w.color))delete w.color;
 return p;
}
export function acceptsFinish(p,target,id){
 const m=finishById(id);if(!target||!m)return false;
 if(target.kind==='room')return ['wood','stone'].includes(m.family)&&!!p.roomMeta;
 if(target.kind==='wall')return m.family!=='fabric'&&p.walls.some(w=>w.id===target.id);
 if(target.kind==='furniture'){const f=p.furniture.find(f=>f.id===target.id);if(!f)return false;return m.family!=='fabric'||['sofa','loveseat','sectional','armchair','ottoman','bed','singleBed','rug','chair','officeChair','floorLamp','tableLamp','pendant'].includes(f.type);}
 return false;
}
export function applyFinish(p,target,id){
 if(!acceptsFinish(p,target,id))throw Error('这块材质不适用于当前表面：地面用木材／石材，织物用于软包家具。');
 const m=finishById(id),existing=target.kind==='room'?p.roomMeta[target.id]:target.kind==='wall'?p.walls.find(w=>w.id===target.id):p.furniture.find(f=>f.id===target.id),color=existing?.colorCustomized?existing.color:m.color;if(existing)delete existing.surface;
 if(target.kind==='room'){p.roomMeta[target.id]={...p.roomMeta[target.id],finish:id,color,floorStyle:m.family==='wood'?'wood':'tile'};}
 if(target.kind==='wall'){const w=p.walls.find(w=>w.id===target.id);w.finish=id;w.color=color;}
 if(target.kind==='furniture'){const f=p.furniture.find(f=>f.id===target.id);f.finish=id;f.color=color;f.material=m.family==='paint'?'lacquer':m.family;}
}
export const moodPresets={cozy:{name:'温馨',subtitle:'木色 · 亚麻 · 夕照',hour:18.1,floor:'oak',wall:'chalk',soft:'linen',hard:'walnut'},bright:{name:'明亮',subtitle:'浅石 · 暖白 · 正午',hour:12.5,floor:'marble',wall:'chalk',soft:'boucle',hard:'ash'},moody:{name:'静谧',subtitle:'深木 · 墨绿 · 灯光',hour:21.5,floor:'walnut',wall:'forest',soft:'ink',hard:'charcoal-oak'}};
export function applyMood(p,name,roomIds){const preset=moodPresets[name];if(!preset)throw Error('未知氛围');for(const id of roomIds)applyFinish(p,{kind:'room',id},preset.floor);for(const w of p.walls)applyFinish(p,{kind:'wall',id:w.id},preset.wall);for(const f of p.furniture)applyFinish(p,{kind:'furniture',id:f.id},acceptsFinish(p,{kind:'furniture',id:f.id},preset.soft)?preset.soft:preset.hard);p.atmosphere={...atmosphereSettings(p),hour:preset.hour,preset:name};}
const lerp=(a,b,t)=>a+(b-a)*t;
const rgb=h=>h.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
const mix=(a,b,t)=>'#'+rgb(a).map((v,i)=>Math.round(lerp(v,rgb(b)[i],t)).toString(16).padStart(2,'0')).join('');
const lights=[
 [0,.12,.3,.09,24,'#91aee0','#14252f'],[5,.12,.36,.12,22,'#b5c6ee','#293d49'],[7,1.7,1.25,.32,4,'#ffc996','#e4ddd0'],[12,2.9,2.15,.5,0,'#fff9ed','#e8ede5'],[16,2.4,1.8,.42,0,'#ffdfa9','#e9e7dc'],[18.5,1.55,1.05,.25,7,'#ffb878','#dcd0bc'],[20,.2,.4,.12,21,'#93a9df','#24313d'],[24,.12,.3,.09,24,'#91aee0','#14252f']
];
export function daylightAt(hour){const h=Math.max(0,Math.min(24,hour));let i=lights.findIndex(k=>k[0]>=h);if(i<1)i=1;const a=lights[i-1],b=lights[i],t=(h-a[0])/(b[0]-a[0]),angle=(h-6)/12*Math.PI;return {hour:h,sun:lerp(a[1],b[1],t),ambient:lerp(a[2],b[2],t),environment:lerp(a[3],b[3],t),lamps:lerp(a[4],b[4],t),color:mix(a[5],b[5],t),background:mix(a[6],b[6],t),x:-Math.cos(angle),y:Math.max(.18,Math.sin(angle)*1.6),z:Math.sin(angle*.7)*.75};}
export const timeLabel=h=>{const n=Math.round(h*60)%1440;return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');};
export function moodScores(p){const a=atmosphereSettings(p),colors=[...p.walls.map(w=>w.color||p.defaults.wallColor),...Object.values(p.roomMeta).map(r=>r.color||p.defaults.floorColor),...p.furniture.map(f=>f.color)].filter(c=>/^#[0-9a-f]{6}$/i.test(c||''));const light=colors.reduce((n,c)=>{const v=rgb(c);return n+(v[0]*.2126+v[1]*.7152+v[2]*.0722)/255;},0)/(colors.length||1);const finishes=[...p.walls,...p.furniture,...Object.values(p.roomMeta)].map(o=>finishById(o.finish)).filter(Boolean),warm=finishes.reduce((v,m)=>v+m.warmth,0)/(finishes.length||1),soft=p.furniture.filter(f=>['fabric','leather'].includes(f.material)).length/(p.furniture.length||1),day=daylightAt(a.hour),raw=[.3+warm*.9+soft*.5+(a.hour>16&&a.hour<20?.6:0),.1+light*day.ambient*.7,.15+(1-light)*1.1+(day.lamps/24)*.75],sum=raw.reduce((a,b)=>a+b);const values=raw.map(v=>Math.round(v/sum*100));values[2]=100-values[0]-values[1];return {cozy:values[0],bright:values[1],moody:values[2]};}
