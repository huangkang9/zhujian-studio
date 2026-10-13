import {emptyProject,demoProject,clone,uid,addRectangle,findRooms,pointInPolygon,wallPoints,wallLength,furnitureTypes,normalizeProject} from './model.js?v=0.13';
import {placementError} from './placement.js?v=0.13';
import {doorSweepConflicts} from './door-clearance.js?v=0.13';

// Authored room adjacency plans. A repeated token denotes one rectangular room;
// dots are outdoor voids, not a missing floor. All dimensions are centerlines.
const plan=(id,name,en,beds,x,y,rows,tags)=>({id,name,en,beds,x,y,rows:rows.map(r=>r.split(' ')),tags});
const recipes=[
 plan('nest','晨光小筑','Morning Nest',0,[4400,2200],[2200,3800],['L B','L K'],['开间','独立厨房']),
 plan('slim','长廊微居','Linear Studio',0,[2400,3600],[2200,4600],['B K','L L'],['开间','紧凑生活']),
 plan('corner','转角单身居','Corner Studio',0,[4000,2400],[2600,4200],['K B','L .'],['开间','转角布局']),
 plan('terrace','露台伴居','Terrace Studio',0,[4600,2300],[2000,2200,2200],['L B','L K','T T'],['开间','阳台']),
 plan('city','城中一居','City One',1,[3600,2400,2400],[3200,3800],['M K B','L L L'],['一居','横厅']),
 plan('quiet','静谧南厅','Quiet Living',1,[4000,3600],[2200,2400,3300],['M B','M K','L L'],['一居','动静分区']),
 plan('reader','书香一居','Readers One',1,[3600,2400,2600],[3200,1600,2800],['M S B','H H H','L L K'],['一居','书房']),
 plan('garden','庭边小宅','Garden One',1,[3800,2400,2800],[3000,3200,1800],['M B K','L L L','T T .'],['一居','转角布局','阳台']),
 plan('twin','双卧晴居','Twin Rooms',2,[3400,3400,2400],[3200,1800,3000],['M N B','H H H','L L K'],['两居','独立厨房']),
 plan('wide','横厅两居','Wide Living',2,[3500,3500,2600],[3400,3200],['M N B','L L K'],['两居','横厅']),
 plan('split','左右双卧','Split Bedrooms',2,[3400,4000,3200],[2200,3800],['B K S','M L N'],['两居','书房']),
 plan('north','北庭两居','North Court',2,[3800,3200,2400],[3400,1600,3200,1500],['M N B','H H H','L L K','T T .'],['两居','阳台']),
 plan('step','阶庭两居','Stepped Home',2,[3600,3400,2600],[3200,1800,3400],['M N .','H H B','L L K'],['两居','转角布局']),
 plan('dualbath','双卫两居','Two Baths',2,[3600,3400,2600,2400],[3200,1600,3200],['M N B E','H H H H','L L K U'],['两居','双卫','洗衣房']),
 plan('trio','松影三居','Pine Three',3,[3500,3200,3000,2400],[3400,1700,3200],['M N C B','H H H H','L L K E'],['三居','双卫']),
 plan('family','向阳三居','Sunny Family',3,[3600,3400,3200],[3300,1600,3400],['M N C','H H H','L K B'],['三居','独立厨房']),
 plan('long','长庭三居','Long Court',3,[3800,4000,3200],[2800,2800,2600],['M L B','N L K','C L E'],['三居','纵厅','双卫']),
 plan('study','书庭三居','Study Court',3,[3600,3200,3000,2600],[3300,1600,3000,1800],['M N C S','H H H H','L L K B','T T . .'],['三居','书房','阳台']),
 plan('wing','翼型三居','Wing Home',3,[3600,3600,3000,2600],[3300,1800,3300],['M N C .','H H H B','L L K E'],['三居','转角布局','双卫']),
 plan('dining','双厅三居','Living & Dining',3,[3800,3400,3000,2400],[3200,1800,3500],['M N C B','H H H H','L D K E'],['三居','独立餐厅','双卫']),
 plan('four','四季合居','Four Seasons',4,[3600,3200,3200,3000,2400],[3400,1700,3400],['M N C Q B','H H H H H','L L D K E'],['四居','双卫','独立餐厅']),
 plan('multigen','三代同堂','Generations',4,[3800,3600,3600,3000],[3300,1800,3400],['M N C Q','H H H H','L D K B'],['四居','独立餐厅']),
 plan('courtyard','合院四居','Courtyard Four',4,[3600,3600,3600,2400],[3400,1800,3400,1800],['M N C B','H H H H','Q L K E','. T T .'],['四居','阳台','双卫'])
];
const names={L:'客餐厅',M:'主卧',N:'次卧',C:'儿童房',Q:'卧室',K:'厨房',B:'卫生间',E:'客卫',H:'玄关走廊',S:'书房',T:'阳台',U:'洗衣房',D:'餐厅'};
const tones=['#d9c9ad','#c9d5c4','#dfd2c4','#d3d7d0'];
const cached=new Map();
function compile(recipe){
 const p=emptyProject();p.name=recipe.name;p.example=true;p.caseId=recipe.id;p.notes='原创参考户型，尺寸为演示轴线值，非实测或施工图。';
 const xs=[0],ys=[0];for(const n of recipe.x)xs.push(xs.at(-1)+n);for(const n of recipe.y)ys.push(ys.at(-1)+n);
 const cells=new Map();recipe.rows.forEach((row,j)=>row.forEach((key,i)=>{if(key==='.')return;const r=cells.get(key)||{key,left:i,right:i,top:j,bottom:j};r.left=Math.min(r.left,i);r.right=Math.max(r.right,i);r.top=Math.min(r.top,j);r.bottom=Math.max(r.bottom,j);cells.set(key,r);}));
 const rectangles=[...cells.values()].map(r=>({key:r.key,x:xs[r.left],y:ys[r.top],w:xs[r.right+1]-xs[r.left],h:ys[r.bottom+1]-ys[r.top]}));
 for(const r of rectangles)addRectangle(p,{x:r.x,y:r.y,width:r.w,depth:r.h});
 const rooms=findRooms(p);for(const room of rooms){const r=rectangles.find(r=>pointInPolygon({x:r.x+r.w/2,y:r.y+r.h/2},room.points));if(!r)throw Error('Invalid case room');r.room=room;const tile=['B','E','K','U','T'].includes(r.key);p.roomMeta[room.key]={name:names[r.key],floorStyle:tile?'tile':'wood',color:tile?'#d6dfd7':tones[recipes.indexOf(recipe)%tones.length]};}
 const at=pt=>rectangles.find(r=>pt.x>r.x&&pt.x<r.x+r.w&&pt.y>r.y&&pt.y<r.y+r.h)?.key;
 const edges=p.walls.map(w=>{const[a,b]=wallPoints(p,w),len=wallLength(p,w),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2},dx=-(b.y-a.y)/len*20,dy=(b.x-a.x)/len*20;return{w,len,a,b,left:at({x:m.x+dx,y:m.y+dy}),right:at({x:m.x-dx,y:m.y-dy})};});
 const door=e=>{const width=Math.min(900,e.len-400);p.openings.push({id:'door'+p.openings.length,wall:e.w.id,type:'door',offset:(e.len-width)/2,width,height:2100,sill:0,openAngle:90,flip:false});};
 const external=edges.filter(e=>!!e.left!==!!e.right&&e.len>=1400);
 const entry=external.find(e=>[e.left,e.right].includes('H'))||external.find(e=>[e.left,e.right].includes('L'));if(!entry)throw Error('Missing case entry');door(entry);p.openings[0].id='entry';
 const connected=new Set([entry.left||entry.right]),internal=edges.filter(e=>e.left&&e.right&&e.len>=1200);
 // Prefer doors from the living room / hall, with bathrooms as leaf rooms.
 const priority=k=>k==='H'?0:k==='L'?1:k==='D'?2:['B','E','U'].includes(k)?20:5;
 while(connected.size<rectangles.length){const candidates=internal.filter(e=>connected.has(e.left)!==connected.has(e.right)).sort((a,b)=>priority(connected.has(a.left)?a.left:a.right)-priority(connected.has(b.left)?b.left:b.right)||b.len-a.len);const e=candidates[0];if(!e)throw Error('Disconnected case');door(e);connected.add(e.left);connected.add(e.right);}
 for(const r of rectangles){const e=external.filter(e=>[e.left,e.right].includes(r.key)&&e!==entry).sort((a,b)=>b.len-a.len)[0];if(!e)continue;const wet=['B','E','U'].includes(r.key),width=Math.min(wet?900:2000,e.len-500);p.openings.push({id:'window'+p.openings.length,wall:e.w.id,type:'window',offset:(e.len-width)/2,width,height:wet?800:1400,sill:wet?1500:900,panes:2});}
 const put=(r,type,fx,fy,extra={})=>{const f={id:uid('f'),type,...furnitureTypes[type],x:Math.round(r.x+r.w*fx),y:Math.round(r.y+r.h*fy),rotation:0,...extra};if(!placementError(p,f)){p.furniture.push(f);if(doorSweepConflicts(p).some(hit=>hit.furniture.id===f.id))p.furniture.pop();else return true;}return false;};
 const fit=(r,type,extra={})=>{for(const rotation of [0,90]){const base={...furnitureTypes[type],...extra},w=rotation?base.d:base.w,h=rotation?base.w:base.d;for(const fx of [.25,.75,.5])for(const fy of [.25,.75,.5]){const x=(w/2+180+(r.w-w-360)*fx)/r.w,y=(h/2+180+(r.h-h-360)*fy)/r.h;if(put(r,type,x,y,{...extra,rotation}))return true;}}return false;};
 for(const r of rectangles){
  if(['M','N','C','Q'].includes(r.key)){fit(r,r.key==='M'?'bed':'singleBed',{w:Math.min(r.key==='M'?1800:1300,r.w-700),d:Math.min(2000,r.h-650)});put(r,'cabinet',.5,.86,{w:Math.min(1600,r.w-500),d:400});}
  else if(r.key==='L'){if(!recipe.beds)fit(r,'singleBed',{w:1200,d:1900});put(r,'sofa',.32,.3,{w:Math.min(2100,r.w*.48),d:750});put(r,'coffee',.32,.62,{w:900,d:500});put(r,'table',.75,.7,{w:1100,d:700});put(r,'plant',.12,.86);}
  else if(['B','E'].includes(r.key)){put(r,'shower',.25,.25,{w:800,d:800});put(r,'toilet',.73,.26);put(r,'vanity',.25,.73,{w:700,d:450});}
  else if(r.key==='K'){put(r,'kitchen',.5,.2,{w:Math.min(2200,r.w-500),d:550});put(r,'fridge',.22,.68,{w:650,d:650});}
  else if(r.key==='S'){put(r,'desk',.5,.24,{w:Math.min(1600,r.w-500),d:650});put(r,'officeChair',.5,.53);put(r,'bookcase',.5,.87,{w:1200,d:300});}
  else if(r.key==='D'){put(r,'table',.5,.5,{w:1600,d:850});put(r,'chair',.5,.2);put(r,'chair',.5,.8,{rotation:180});}
  else if(r.key==='U'){put(r,'washer',.25,.25);put(r,'dryer',.75,.25);}
  else if(r.key==='T'){put(r,'plant',.15,.45);put(r,'armchair',.7,.5,{w:700,d:700});}
 }
 return normalizeProject(p);
}
export const cases=[{id:'qingchuan',name:'晴川雅居',en:'Qingchuan Residence',beds:2,tags:['两居','书房','双卫'],featured:true},...recipes.map(({id,name,en,beds,tags})=>({id,name,en,beds,tags}))];
export function caseProject(id){if(!cases.some(c=>c.id===id))throw Error('Unknown case');if(!cached.has(id))cached.set(id,id==='qingchuan'?demoProject():compile(recipes.find(c=>c.id===id)));const p=clone(cached.get(id));p.id=uid('project');delete p.updatedAt;return p;}
export function caseInfo(item){const p=caseProject(item.id);return{...item,area:findRooms(p).reduce((a,r)=>a+r.area,0),rooms:findRooms(p).length,furniture:p.furniture.length};}
export function importProject(raw){const p=normalizeProject(raw);p.id=uid('project');delete p.updatedAt;return p;}
