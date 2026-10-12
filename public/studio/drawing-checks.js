import {doorSweepConflicts,overheadConflicts} from './door-clearance.js?v=0.12.1';
import {findRooms,wallPoints,wallLength,openingValid,intersection,projectPoint,furnitureHitsWall,pointInPolygon} from './model.js?v=0.12.1';
/** Advisory geometry checks. These do not certify measured dimensions or construction compliance. */
export function drawingChecks(p){
 const issues=[],rooms=findRooms(p),degree=new Map(),used=new Map();
 const add=(severity,title,detail,target=null,point=null)=>issues.push({id:'check-'+issues.length,severity,title,detail,target,point});
 const unknown=p.walls.filter(w=>!w.structure||w.structure==='unknown');if(unknown.length)add('warning','墙体结构待核实',`${unknown.length} 面墙未标明结构性质。依据结构资料手动标记；软件不能判定是否允许拆改。`,{kind:'wall',id:unknown[0].id});
 if(p.example)add('info','演示方案','当前是功能示例；尺寸不是你的房屋实测值。');
 if(p.background&&!p.background.calibrated)add('warning','草图尚未校准','使用底图面板的两点校准，再逐段核对实测尺寸。');
 if(p.recognition)add('warning','识别结果仍需现场复核','已采用的标注不能证明其他几何准确；墙厚、墙高和未标尺寸可能仍为估计。');
 if(!p.walls.length)add('info','还没有墙体','创建矩形房间，或沿底图画墙后再出图。');
 else if(!rooms.length)add('warning','没有闭合空间','请连接墙体端点；闭合后才能生成房间地面和面积。');
 for(const w of p.walls){for(const id of[w.a,w.b]){degree.set(id,(degree.get(id)||0)+1);used.set(id,w);}if(wallLength(p,w)<100)add('error','墙体过短','墙体轴线长度不足 100 mm。',{kind:'wall',id:w.id});}
 for(const[id,count]of degree)if(count===1){const n=p.nodes.find(n=>n.id===id);add('warning','自由墙端点','可为有意留空；若要闭合房间，请连接此端点。',{kind:'wall',id:used.get(id).id},n);}
 const segments=p.walls.map(w=>{const[a,b]=wallPoints(p,w);return{w,a,b,left:Math.min(a.x,b.x),right:Math.max(a.x,b.x),top:Math.min(a.y,b.y),bottom:Math.max(a.y,b.y)}}).sort((a,b)=>a.left-b.left);
 for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
  const a=segments[i],b=segments[j];if(b.left>a.right+5)break;if(b.top>a.bottom+5||b.bottom<a.top-5)continue;
  const hit=intersection(a.a,a.b,b.a,b.b);if(hit){add('error','墙体交叉未连接','选中墙体后调整，或重画此连接；仅视觉交叉不会形成房间节点。',{kind:'wall',id:a.w.id},hit);continue;}
  const collinear=projectPoint(b.a,a.a,a.b).distance<1&&projectPoint(b.b,a.a,a.b).distance<1||projectPoint(a.a,b.a,b.b).distance<1&&projectPoint(a.b,b.a,b.b).distance<1;
  const share=[a.w.a,a.w.b].some(id=>id===b.w.a||id===b.w.b);
  // Detect both partial overlaps and duplicate spans, independent of node IDs.
  const cross=Math.abs((a.b.x-a.a.x)*(b.b.y-b.a.y)-(a.b.y-a.a.y)*(b.b.x-b.a.x));
  const parallel=cross<.01,axis=Math.abs(a.b.x-a.a.x)>=Math.abs(a.b.y-a.a.y)?'x':'y';
  const overlap=Math.min(Math.max(a.a[axis],a.b[axis]),Math.max(b.a[axis],b.b[axis]))-Math.max(Math.min(a.a[axis],a.b[axis]),Math.min(b.a[axis],b.b[axis]));
  const onLine=Math.min(projectPoint(a.a,b.a,b.b).distance,projectPoint(a.b,b.a,b.b).distance,projectPoint(b.a,a.a,a.b).distance,projectPoint(b.b,a.a,a.b).distance)<1;
  if((collinear||parallel&&onLine)&&overlap>1)add('error','墙体重复或共线重叠','检查选中墙体与同位置墙体，保留需要的部分。',{kind:'wall',id:a.w.id});
  else if(!share){const contact=[a.a,a.b].find(n=>projectPoint(n,b.a,b.b).distance<=5)||[b.a,b.b].find(n=>projectPoint(n,a.a,a.b).distance<=5);if(contact)add('warning','墙端点靠近但未连接','两段墙相距不超过 5 mm，但没有共享节点；请重画连接。',{kind:'wall',id:a.w.id},contact);}
 }
 for(const o of p.openings){const error=openingValid(p,o);if(error)add('error',(o.type==='door'?'门':'窗')+'尺寸异常',error,{kind:'opening',id:o.id});}
 for(const f of p.furniture){if(furnitureHitsWall(p,f))add('warning',(f.name||'家具')+'与墙线相交','轴线轮廓初筛，请调整位置或尺寸；未校核墙厚、门扇和通行净距。',{kind:'furniture',id:f.id});else if(rooms.length&&!rooms.some(r=>pointInPolygon(f,r.points)))add('warning',(f.name||'家具')+'位于房间外','家具中心不在已识别的闭合房间内，请确认是否有意放置。',{kind:'furniture',id:f.id});}
 for(const hit of doorSweepConflicts(p))add('warning','门扇开启可能碰到'+(hit.furniture.name||'家具'),`从关闭到 ${hit.angle}° 的开启范围与家具轮廓相交；闭门按 90° 预检。请选择门调整方向、角度或移动家具。`,{kind:'opening',id:hit.opening.id},hit.point);
 for(const hit of overheadConflicts(p))add('warning',(hit.furniture.name||'家具')+'超出顶下净高',`物品顶端超出 ${Math.round(hit.excess)} mm；请调整离地高度、家具高度或吊顶。`,{kind:'furniture',id:hit.furniture.id});
 if(p.measurements?.length)add('info','自由测量线不会随墙体移动','户型修改后，请复核保存的测量端点。');
 issues.sort((a,b)=>({error:0,warning:1,info:2}[a.severity]-{error:0,warning:1,info:2}[b.severity]));
 return {issues,rooms:rooms.length,errors:issues.filter(i=>i.severity==='error').length,warnings:issues.filter(i=>i.severity==='warning').length};
}
export function checkTargetPoint(p,issue){
 if(issue.point)return issue.point;const t=issue.target;if(!t)return null;
 if(t.kind==='furniture')return p.furniture.find(f=>f.id===t.id);
 const w=t.kind==='wall'?p.walls.find(w=>w.id===t.id):p.walls.find(w=>w.id===p.openings.find(o=>o.id===t.id)?.wall);if(!w)return null;
 const[a,b]=wallPoints(p,w);return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};
}
