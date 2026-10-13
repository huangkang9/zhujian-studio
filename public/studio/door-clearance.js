import {wallPoints,wallLength,furnitureCorners,pointInPolygon,projectPoint,intersection,findRooms} from './model.js?v=0.13';
import {ceilingHeight} from './fitout.js?v=0.13';
/** Conservative sampled door sweep, mm; 3° increments and 20 mm leaf half-thickness. */
export function doorSweepConflicts(p){const issues=[];
 for(const o of p.openings.filter(o=>o.type==='door')){const w=p.walls.find(w=>w.id===o.wall);if(!w)continue;const[a,b]=wallPoints(p,w),len=wallLength(p,w);if(!len)continue;const ux=(b.x-a.x)/len,uy=(b.y-a.y)/len,hinge={x:a.x+ux*(o.offset+45),y:a.y+uy*(o.offset+45)},width=Math.max(0,o.width-90),limit=o.openAngle>0?o.openAngle:90,sign=o.flip?-1:1;
  for(const f of p.furniture){if(f.type==='rug'||(f.elevation||0)>=o.sill+o.height||(f.elevation||0)+f.h<=o.sill)continue;if(Math.hypot(f.x-hinge.x,f.y-hinge.y)>width+Math.hypot(f.w,f.d)/2+30)continue;const corners=furnitureCorners(f);let hit=false;const steps=Math.ceil(limit/3);for(let i=0;i<=steps;i++){const angle=limit*i/steps*Math.PI/180*sign,tip={x:hinge.x+width*(ux*Math.cos(angle)-uy*Math.sin(angle)),y:hinge.y+width*(uy*Math.cos(angle)+ux*Math.sin(angle))};if(pointInPolygon(hinge,corners)||pointInPolygon(tip,corners)||corners.some((c,k)=>projectPoint(c,hinge,tip).distance<=20||intersection(hinge,tip,c,corners[(k+1)%4]))){hit=true;break;}}if(hit)issues.push({opening:o,furniture:f,point:hinge,angle:limit});}
 }return issues;
}
export function overheadConflicts(p){const rooms=findRooms(p);return p.furniture.flatMap(f=>{const room=rooms.find(r=>pointInPolygon(f,r.points));if(!room)return[];const top=(f.elevation||0)+f.h,height=ceilingHeight(p,room);return top>height+1?[{furniture:f,room,height,excess:top-height}]:[];});}
