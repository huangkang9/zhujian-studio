import {normalizeStructure} from './structure.js?v=0.12';
import {normalizeDetails} from './project-details.js?v=0.12';
import {normalizeSurfaces} from './surface-styles.js?v=0.12';
import {normalizeAtmosphere} from './atmosphere.js?v=0.12';
/** Canonical project coordinates are millimetres. No renderer owns geometry. */
export const VERSION=1;
export const uid=(prefix='id')=>prefix+'_'+Math.random().toString(36).slice(2,10);
export const clone=x=>JSON.parse(JSON.stringify(x));
export const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const round=(x,step=1)=>Math.round(x/step)*step;
import {furnitureTypes,furnitureValid,materialNames} from './furniture-catalog.js?v=0.12';
export {furnitureTypes} from './furniture-catalog.js?v=0.12';
export function emptyProject(){return {version:VERSION,id:uid('project'),name:'我的新户型',unit:'mm',nodes:[],walls:[],openings:[],furniture:[],roomMeta:{},defaults:{thickness:200,height:2800,wallColor:'#eeeade',floorColor:'#ded5bd',floorStyle:'wood'},background:null,notes:'',example:false};}
export function demoProject(){
 const p=emptyProject();p.name='晴川雅居 · 原创示例';p.example=true;p.demoVersion=12;p.notes='原创展示户型：两卧、书房、双卫与独立厨房。129.6 m² 为墙体轴线围合面积；仅用于软件演示，不是实测或施工图。';
 const points=[[0,0],[4000,0],[7800,0],[10000,0],[12000,0],[12000,4000],[12000,5400],[12000,8200],[12000,10800],[8000,10800],[0,10800],[0,5400],[0,4000],[4000,4000],[7800,4000],[10000,4000],[8000,5400],[8000,8200]];
 p.nodes=points.map(([x,y],i)=>({id:'n'+i,x,y}));
 const edges=[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[10,11],[11,12],[12,0],[1,13],[2,14],[3,15],[12,13],[13,14],[14,15],[15,5],[11,16],[16,6],[16,17],[17,9],[17,7]];
 p.walls=edges.map(([a,b],i)=>({id:'w'+i,a:'n'+a,b:'n'+b,thickness:200,height:2800,structure:'unknown'}));
 const win=(id,wall,offset,width,height=1500,sill=900)=>({id,wall,type:'window',offset,width,height,sill,panes:width>2400?4:2,frameColor:'#59665f'});
 const door=(id,wall,offset,width=900,flip=false)=>({id,wall,type:'door',offset,width,height:2200,sill:0,openAngle:90,flip,frameColor:'#b4a28c',leafColor:'#e2d8c7'});
 p.openings=[win('o1','w0',1400,1800),win('o2','w1',1200,1800),win('o3','w2',350,1500),win('o4','w4',1000,1200,900,1400),win('o5','w6',800,1500,1200,1100),win('o6','w7',800,1300,900,1400),win('o7','w9',2100,4000,2000,500),win('o8','w10',1300,2000,1800,600),door('entry','w11',200,1000),door('main','w16',2700,900,true),door('second','w17',2600,900,true),door('study','w18',300,850,true),door('bath','w19',350,800,true),door('living','w20',1100,1200),door('kitchen','w21',800,1100),door('utility','w23',350,900)];
 const put=(type,x,y,rotation=0,extra={})=>p.furniture.push({id:'f'+p.furniture.length,type,...furnitureTypes[type],x,y,rotation,...extra});
 // Quiet rooms: keep the southern doorway and circulation clear.
 put('bed',2300,1600);put('nightstand',1050,820);put('nightstand',3450,820);put('cabinet',450,1900,90,{w:2200});
 put('singleBed',6200,1600,0,{w:1500});put('nightstand',7250,850);put('cabinet',4450,1700,90,{w:1800});put('plant',7300,2900);
 put('desk',8900,700,0,{w:1600});put('officeChair',8900,1450);put('bookcase',9600,2800,90,{w:1600});
 put('shower',10550,600,0,{w:800,d:800});put('toilet',11500,2300,90);put('vanity',10400,2000,90,{w:1000});
 put('shoeCabinet',3900,5150,0,{w:1800,d:260,h:1100});
 // Living and dining share a broad southern space with clear access to both exits.
 put('rug',2600,8350,0,{w:3400,d:3000,color:'#d6c7ab'});put('sofa',2450,7150,0,{w:2800,color:'#a6b49f',surface:{style:'woven',scale:600,rotation:0,groutWidth:3,groutColor:'#dedcd1'}});put('coffee',2500,8350,0,{w:1200,d:650});put('armchair',4600,8950,90);put('tvstand',2500,10420,0,{w:2400});put('television',2500,10380,0,{elevation:520});put('plant',650,10150);put('floorLamp',4400,6750);
 put('table',6350,7350,0,{w:1800,d:900});for(const x of[5850,6750]){put('chair',x,6500);put('chair',x,8200,180);}put('sideboard',7530,6900,90,{w:1800,d:450});put('pendant',6350,7350,0,{elevation:2050});
 put('kitchen',11550,6900,90,{w:2300});put('fridge',10400,5950);put('counter',9300,7780,0,{w:2100});put('microwave',9750,7780,0,{elevation:880});put('plant',8500,6000);
 put('tub',10750,10150);put('toilet',11500,8850,90);put('doubleVanity',9400,8600,0,{w:1700});put('washer',8650,10250);
 for(const r of findRooms(p)){const {x,y}=r.centroid;let name,color,style;if(y<4000){name=x<4000?'主卧':x<7800?'次卧':x<10000?'书房':'客卫';color=x<10000?'#dfceb0':'#d8e1d9';style=x<10000?'wood':'tiles';}else if(y<5400){name='玄关走廊';color='#dfd8ca';style='tiles';}else if(x<8000){name='客餐厅';color='#dac7a6';style='parquet';}else if(y<8200){name='厨房';color='#d9dfd0';style='tiles';}else{name='洗浴洗衣';color='#d9e1db';style='tiles';}p.roomMeta[r.key]={name,color,floorStyle:style==='tiles'?'tile':'wood',surface:{style,scale:600,rotation:0,groutColor:'#ddd8ce',groutWidth:3}};}
 return p;
}
export function wallPoints(p,w){return [p.nodes.find(n=>n.id===w.a),p.nodes.find(n=>n.id===w.b)];}
export function wallLength(p,w){const [a,b]=wallPoints(p,w);return a&&b?distance(a,b):0;}
export function projectPoint(pt,a,b){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;const t=l2?clamp(((pt.x-a.x)*dx+(pt.y-a.y)*dy)/l2,0,1):0;const q={x:a.x+t*dx,y:a.y+t*dy};return {...q,t,distance:distance(pt,q)};}
export function bounds(p){const pts=[...p.nodes,...p.furniture.flatMap(furnitureCorners)];if(!pts.length)return {x:0,y:0,w:10000,h:8000};const xs=pts.map(n=>n.x),ys=pts.map(n=>n.y),x=Math.min(...xs),y=Math.min(...ys);return {x,y,w:Math.max(1000,Math.max(...xs)-x),h:Math.max(1000,Math.max(...ys)-y)};}
export function polygonArea(points){return points.reduce((s,a,i)=>{const b=points[(i+1)%points.length];return s+a.x*b.y-b.x*a.y;},0)/2;}
export function polygonCentroid(pts){const a=polygonArea(pts);if(Math.abs(a)<1)return pts[0]||{x:0,y:0};let x=0,y=0;for(let i=0;i<pts.length;i++){const p=pts[i],q=pts[(i+1)%pts.length],c=p.x*q.y-q.x*p.y;x+=(p.x+q.x)*c;y+=(p.y+q.y)*c;}return {x:x/(6*a),y:y/(6*a)};}
/** Planar half-edge traversal; closed bounded faces only. Junctions must be split. */
export function findRooms(p){
 const nodes=new Map(p.nodes.map(n=>[n.id,n])),adj=new Map(p.nodes.map(n=>[n.id,[]]));
 for(const w of p.walls){if(nodes.has(w.a)&&nodes.has(w.b)&&w.a!==w.b){adj.get(w.a).push(w.b);adj.get(w.b).push(w.a);}}
 for(const [id,list]of adj){const n=nodes.get(id);list.sort((a,b)=>Math.atan2(nodes.get(a).y-n.y,nodes.get(a).x-n.x)-Math.atan2(nodes.get(b).y-n.y,nodes.get(b).x-n.x));}
 const visited=new Set(),rooms=[];
 for(const w of p.walls)for(const start of [[w.a,w.b],[w.b,w.a]]){if(visited.has(start.join('>')))continue;let [a,b]=start,ids=[],closed=false;
 for(let k=0;k<p.walls.length*2+4;k++){const edge=a+'>'+b;if(visited.has(edge)){closed=a===start[0]&&b===start[1];break;}visited.add(edge);ids.push(a);const ns=adj.get(b);if(!ns?.length)break;const idx=ns.indexOf(a);const c=ns[(idx-1+ns.length)%ns.length];a=b;b=c;}
 if(!closed||ids.length<3||new Set(ids).size!==ids.length)continue;const points=ids.map(id=>nodes.get(id)),area=polygonArea(points);if(area<10000)continue;const key=[...ids].sort().join('|');if(rooms.some(r=>r.key===key))continue;rooms.push({key,ids,points,area:area/1e6,centroid:polygonCentroid(points)});
 }return rooms;
}
export function pointInPolygon(pt,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>pt.y)!==(b.y>pt.y)&&pt.x<(b.x-a.x)*(pt.y-a.y)/(b.y-a.y)+a.x)c=!c;}return c;}
export function roomAt(p,pt){return findRooms(p).find(r=>pointInPolygon(pt,r.points));}
export function nearestWall(p,pt,max=Infinity){let best=null;for(const w of p.walls){const[a,b]=wallPoints(p,w);const q=projectPoint(pt,a,b);if(q.distance<max){max=q.distance;best={wall:w,...q};}}return best;}
export function splitWall(p,wid,pt){const w=p.walls.find(w=>w.id===wid);if(!w)return null;const [a,b]=wallPoints(p,w);const q=projectPoint(pt,a,b);if(distance(q,a)<2)return a;if(distance(q,b)<2)return b;if(w.structure==='bearing')throw Error('承重墙已保护，不能分割');const at=distance(a,q);if(p.openings.some(o=>o.wall===wid&&o.offset<at&&o.offset+o.width>at))throw Error('连接点落在门窗洞口内，请移动连接点');const n={id:uid('n'),x:round(q.x),y:round(q.y)};p.nodes.push(n);const w2={...w,id:uid('w'),a:n.id};w.b=n.id;p.walls.push(w2);for(const o of p.openings.filter(o=>o.wall===wid&&o.offset>=at)){o.wall=w2.id;o.offset-=at;}return n;}
export function ensureNode(p,pt,tolerance=2){const near=p.nodes.find(n=>distance(n,pt)<tolerance);if(near)return near;const w=nearestWall(p,pt,tolerance);if(w)return splitWall(p,w.wall.id,w);const n={id:uid('n'),x:round(pt.x),y:round(pt.y)};p.nodes.push(n);return n;}
export function intersection(a,b,c,d){const dx=b.x-a.x,dy=b.y-a.y,ex=d.x-c.x,ey=d.y-c.y,den=dx*ey-dy*ex;if(Math.abs(den)<1e-8)return null;const t=((c.x-a.x)*ey-(c.y-a.y)*ex)/den,u=((c.x-a.x)*dy-(c.y-a.y)*dx)/den;if(t>1e-6&&t<1-1e-6&&u>1e-6&&u<1-1e-6)return {x:a.x+t*dx,y:a.y+t*dy,t,u};return null;}
export function addWall(p,start,end){if(distance(start,end)<100)throw Error('墙体长度至少 100 mm');
 // Validate all splits before mutating the project.
 const crossings=[];for(const w of p.walls){const[a,b]=wallPoints(p,w),hit=intersection(start,end,a,b);if(hit){if(w.structure==='bearing')throw Error('承重墙已保护，不能分割或新增交叉洞口');const at=distance(a,hit);if(p.openings.some(o=>o.wall===w.id&&o.offset<at&&o.offset+o.width>at))throw Error('新墙穿过门窗，请调整位置');crossings.push({w,hit});}}
 const a=ensureNode(p,start,5),b=ensureNode(p,end,5);const chain=[a,...crossings.map(({w,hit})=>splitWall(p,w.id,hit)),b].sort((n,m)=>distance(start,n)-distance(start,m));
 // Join any existing collinear junctions, to avoid duplicate overlapping walls.
 for(const n of p.nodes){const q=projectPoint(n,a,b);if(q.distance<2&&q.t>0&&q.t<1&&!chain.some(v=>v.id===n.id))chain.push(n);}chain.sort((n,m)=>distance(start,n)-distance(start,m));
 let created=[];for(let i=0;i<chain.length-1;i++){const x=chain[i],y=chain[i+1];if(x.id===y.id||p.walls.some(w=>(w.a===x.id&&w.b===y.id)||(w.a===y.id&&w.b===x.id)))continue;const w={id:uid('w'),a:x.id,b:y.id,thickness:p.defaults.thickness,height:p.defaults.height};p.walls.push(w);created.push(w);}return created;
}
/** Maintain pre-existing horizontal/vertical relationships while applying node moves. */
export function moveNodesConstrained(p,updates,{preserveAxes=true,baseline=p,fixed=[]}={}){
 const nodes=new Map(p.nodes.map(n=>[n.id,n])),old=new Map(baseline.nodes.map(n=>[n.id,n]));
 const proposed=new Map();
 const component=(id,axis)=>{const reached=new Set([id]),queue=[id];while(queue.length){const n=queue.pop();for(const w of baseline.walls){if(w.a!==n&&w.b!==n)continue;const a=old.get(w.a),b=old.get(w.b);if(Math.abs(a[axis]-b[axis])>.5)continue;const other=w.a===n?w.b:w.a;if(!reached.has(other)){reached.add(other);queue.push(other);}}}return reached;};
 for(const update of updates){if(!nodes.has(update.id))throw Error('节点不存在');for(const axis of ['x','y']){if(update[axis]===undefined)continue;if(!Number.isFinite(update[axis]))throw Error('坐标必须是有效数字');const delta=update[axis]-old.get(update.id)[axis],group=preserveAxes?component(update.id,axis):new Set([update.id]);for(const id of group){const next=old.get(id)[axis]+delta,key=id+':'+axis;if(proposed.has(key)&&Math.abs(proposed.get(key)-next)>.5)throw Error('尺寸与已保持的水平／垂直关系冲突');if(fixed.includes(id)&&Math.abs(delta)>.5)throw Error('固定端点与正交约束冲突');proposed.set(key,next);}}}
 for(const w of baseline.walls.filter(w=>w.structure==='bearing'))for(const id of[w.a,w.b])for(const axis of['x','y'])if(proposed.has(id+':'+axis)&&Math.abs(proposed.get(id+':'+axis)-old.get(id)[axis])>.001)throw Error('承重墙已保护，不能移动共享端点');
 for(const[key,value]of proposed){const pos=key.lastIndexOf(':'),id=key.slice(0,pos),axis=key.slice(pos+1);nodes.get(id)[axis]=round(value);}
}
export function setWallLength(p,id,length,anchor='a',preserveAxes=true){
 if(!Number.isFinite(length)||length<100||length>100000)throw Error('墙长应在 100～100000 mm 之间');
 const w=p.walls.find(w=>w.id===id);if(!w)throw Error('墙体不存在');const[a,b]=wallPoints(p,w),l=distance(a,b);if(!l)throw Error('墙体长度为零');
 const fixed=anchor==='a'?a:b,moving=anchor==='a'?b:a,ratio=length/l;
 moveNodesConstrained(p,[{id:moving.id,x:fixed.x+(moving.x-fixed.x)*ratio,y:fixed.y+(moving.y-fixed.y)*ratio}],{preserveAxes,fixed:[fixed.id]});
}
export function addRectangle(p,{x,y,width,depth}){
 if(![x,y,width,depth].every(Number.isFinite)||width<500||depth<500||width>100000||depth>100000)throw Error('房间边长范围 500～100000 mm');
 const points=[{x,y},{x:x+width,y},{x:x+width,y:y+depth},{x,y:y+depth}];for(let i=0;i<4;i++)addWall(p,points[i],points[(i+1)%4]);
}

export function openingValid(p,o,exclude=o.id){if(o.openAngle!==undefined&&(!Number.isFinite(o.openAngle)||o.openAngle<0||o.openAngle>120))return '门扇开合角度范围 0～120°';if(o.panes!==undefined&&(!Number.isInteger(o.panes)||o.panes<1||o.panes>6))return '窗扇分格范围 1～6';if(![o.offset,o.width,o.height,o.sill].every(Number.isFinite))return '门窗尺寸必须为有效数字';const w=p.walls.find(w=>w.id===o.wall);if(!w)return '缺少所属墙体';const len=wallLength(p,w);if(o.offset<0||o.width<100||o.offset+o.width>len+1)return '门窗超出墙体，请调整距起点或宽度';if(o.height<100||o.sill<0||o.height+o.sill>w.height+1)return '门窗高度超出墙高';if(p.openings.some(x=>x.id!==exclude&&x.wall===o.wall&&o.offset<x.offset+x.width-1&&o.offset+o.width>x.offset+1))return '与已有门窗重叠';return null;}
export function validateProject(p){const issues=[];if(p.example)issues.push({type:'info',text:'当前为功能演示户型，非草图识别结果'});if(!p.walls.length)issues.push({type:'info',text:'尚未绘制墙体'});const rooms=findRooms(p);if(p.walls.length&&!rooms.length)issues.push({type:'warn',text:'未形成闭合房间，三维地面暂不生成'});const degrees=new Map();for(const w of p.walls){degrees.set(w.a,(degrees.get(w.a)||0)+1);degrees.set(w.b,(degrees.get(w.b)||0)+1);if(wallLength(p,w)<100)issues.push({type:'warn',text:'存在长度不足 100 mm 的墙体'});}let crossingCount=0;for(let i=0;i<p.walls.length;i++)for(let j=i+1;j<p.walls.length;j++){const a=p.walls[i],b=p.walls[j];if(a.a===b.a||a.a===b.b||a.b===b.a||a.b===b.b)continue;const [aa,ab]=wallPoints(p,a),[ba,bb]=wallPoints(p,b);if(intersection(aa,ab,ba,bb))crossingCount++;}if(crossingCount)issues.push({type:'warn',text:`${crossingCount} 处墙体交叉尚未连接，请撤销调整或重新画墙连接`});const dangling=[...degrees.values()].filter(d=>d===1).length;if(dangling)issues.push({type:'warn',text:`${dangling} 个自由墙端点，请确认是否有意留空`});for(const o of p.openings){const err=openingValid(p,o);if(err)issues.push({type:'warn',text:(o.type==='door'?'门':'窗')+'：'+err});}if(!issues.some(i=>i.type==='warn')&&p.walls.length)issues.push({type:'ok',text:'墙体连接与门窗范围检查通过'});return issues;}
export function normalizeProject(raw){if(!raw||raw.version!==1||raw.unit!=='mm'||!Array.isArray(raw.nodes)||!Array.isArray(raw.walls)||!Array.isArray(raw.openings)||!Array.isArray(raw.furniture))throw Error('不是支持的筑间项目文件（version 1 / mm）');const p=clone(raw);normalizeStructure(p);if(p.nodes.length>5000||p.walls.length>5000||p.furniture.length>1000)throw Error('项目过大，第一版支持最多 5000 面墙及 1000 件家具');const validId=id=>typeof id==='string'&&/^[\w|.-]{1,200}$/.test(id);const finite=(v,a=-1e7,b=1e7)=>typeof v==='number'&&Number.isFinite(v)&&v>=a&&v<=b;const ids=new Set();for(const n of p.nodes){if(!validId(n.id)||ids.has(n.id)||!finite(n.x)||!finite(n.y))throw Error('节点数据无效');ids.add(n.id);}const wids=new Set();for(const w of p.walls){if(!validId(w.id)||wids.has(w.id)||!ids.has(w.a)||!ids.has(w.b)||w.a===w.b||!finite(w.thickness,50,2000)||!finite(w.height,200,20000))throw Error('墙体数据无效');wids.add(w.id);}const oids=new Set();for(const o of p.openings){if(!validId(o.id)||oids.has(o.id)||!wids.has(o.wall)||!['door','window'].includes(o.type)||!finite(o.offset,0)||!finite(o.width,100,100000)||!finite(o.height,100,20000)||!finite(o.sill,0,20000))throw Error('门窗数据无效');if(o.openAngle!==undefined&&!finite(o.openAngle,0,120))throw Error('门扇角度无效');if(o.panes!==undefined&&(!Number.isInteger(o.panes)||o.panes<1||o.panes>6))throw Error('窗扇分格无效');for(const key of ['frameColor','leafColor'])if(o[key]!==undefined&&!/^#[0-9a-f]{6}$/i.test(o[key]))delete o[key];oids.add(o.id);}const fids=new Set();for(const f of p.furniture){if(!validId(f.id)||fids.has(f.id)||!furnitureTypes[f.type]||![f.x,f.y,f.rotation].every(v=>finite(v))||![f.w,f.d,f.h].every(v=>finite(v,1,20000)))throw Error('家具数据无效');const error=furnitureValid(f);if(error)throw Error(error);if(f.material!==undefined&&!materialNames[f.material])delete f.material;fids.add(f.id);if(!/^#[0-9a-f]{6}$/i.test(f.color))f.color=furnitureTypes[f.type].color;}
 p.defaults={...emptyProject().defaults,...p.defaults};if(!finite(p.defaults.thickness,50,2000)||!finite(p.defaults.height,200,20000))throw Error('默认墙体参数无效');for(const key of ['wallColor','floorColor'])if(!/^#[0-9a-f]{6}$/i.test(p.defaults[key]))p.defaults[key]=emptyProject().defaults[key];if(!['wood','tile','plain'].includes(p.defaults.floorStyle))p.defaults.floorStyle='wood';p.roomMeta=p.roomMeta&&typeof p.roomMeta==='object'?p.roomMeta:{};for(const m of Object.values(p.roomMeta)){if(!m||typeof m!=='object')throw Error('房间属性无效');m.name=String(m.name||'空间').slice(0,80);if(!/^#[0-9a-f]{6}$/i.test(m.color||''))m.color=p.defaults.floorColor;if(m.floorStyle!==undefined&&!['wood','tile','plain'].includes(m.floorStyle))m.floorStyle='wood';}if(p.measurements!==undefined){if(!Array.isArray(p.measurements)||p.measurements.length>500||p.measurements.some(m=>!validId(m.id)||![m.a?.x,m.a?.y,m.b?.x,m.b?.y].every(v=>finite(v))))throw Error('测量标注无效');}if(typeof p.id!=='string'||!/^[-\w]{1,200}$/.test(p.id))p.id=uid('project');if(p.updatedAt!==undefined&&(!Number.isFinite(p.updatedAt)||p.updatedAt<0||p.updatedAt>8640000000000000))delete p.updatedAt;p.name=String(p.name||'未命名户型').slice(0,100);p.notes=String(p.notes||'').slice(0,2000);if(p.background?.src==='./assets/original-sketch.jpg')p.background=null;if(p.background){const b=p.background;if(!(typeof b.src==='string'&&(/^data:image\/(png|jpeg|webp);base64,/.test(b.src)||b.src==='./assets/showcase-plan.svg'))||![b.x,b.y,b.w,b.h,b.rotation].every(v=>finite(v))||b.w<=0||b.h<=0||!finite(b.opacity,0,1))throw Error('底图数据无效');}return normalizeDetails(normalizeSurfaces(normalizeAtmosphere(p)));
}
export function furnitureCorners(f){const a=f.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(([x,y])=>({x:f.x+x*c-y*s,y:f.y+x*s+y*c}));}
export function furnitureHitsWall(p,f){if(f.type==='rug')return false;const corners=furnitureCorners(f);for(const w of p.walls){const[a,b]=wallPoints(p,w);if(pointInPolygon(a,corners)||pointInPolygon(b,corners))return true;for(let i=0;i<4;i++)if(intersection(corners[i],corners[(i+1)%4],a,b))return true;}return false;}
