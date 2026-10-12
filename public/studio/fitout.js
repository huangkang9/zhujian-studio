import {findRooms,wallLength} from './model.js?v=0.12.1';
import {fitoutSettings,normalizeDetails} from './project-details.js?v=0.12.1';
export {fitoutSettings,lightSettings} from './project-details.js?v=0.12.1';
export function roomEdges(p,room){return room.ids.map((id,i)=>{const next=room.ids[(i+1)%room.ids.length],wall=p.walls.find(w=>w.a===id&&w.b===next||w.a===next&&w.b===id);return wall?{wall,side:wall.a===id?1:-1}:null;}).filter(Boolean);}
export function roomHeight(p,room){const edges=roomEdges(p,room);return edges.length?Math.min(...edges.map(e=>e.wall.height)):p.defaults.height;}
export function ceilingHeight(p,room){const c=fitoutSettings(p.roomMeta[room.key]).ceiling;return roomHeight(p,room)-(c.enabled?c.drop:0);}
export function setFitout(p,key,section,property,value){if(!findRooms(p).some(r=>r.key===key))throw Error('请先选择闭合房间');p.roomMeta[key]??={name:'空间',color:p.defaults.floorColor};const f=fitoutSettings(p.roomMeta[key]);if(!['ceiling','skirting','light'].includes(section)||!Object.hasOwn(f[section],property))throw Error('硬装参数无效');f[section][property]=value;p.roomMeta[key].fitout=f;normalizeDetails(p);const room=findRooms(p).find(r=>r.key===key);if(ceilingHeight(p,room)<300)throw Error('下吊后净高不足 300 mm，请减少下吊高度');}
/** Finish quantities use axis-line room boundaries. Shared walls have a face in each room. */
export function roomQuantities(p,room){
 const cfg=fitoutSettings(p.roomMeta[room.key]),edges=roomEdges(p,room),height=ceilingHeight(p,room);let perimeter=0,wallArea=0,skirting=0,openingsArea=0;
 for(const{wall}of edges){const len=wallLength(p,wall),top=Math.min(wall.height,height);perimeter+=len;let openingWidth=0;for(const o of p.openings.filter(o=>o.wall===wall.id)){const start=Math.max(0,o.offset),end=Math.min(len,o.offset+o.width),width=Math.max(0,end-start);openingsArea+=width*Math.max(0,Math.min(top,o.sill+o.height)-o.sill);if(o.sill<=0)openingWidth+=width;}
  wallArea+=len*top;skirting+=Math.max(0,len-openingWidth);
 }
 return{floor:room.area,ceiling:cfg.ceiling.enabled?room.area:0,wall:Math.max(0,wallArea-openingsArea)/1e6,openings:openingsArea/1e6,perimeter:perimeter/1000,skirting:cfg.skirting.enabled?skirting/1000:0,height};
}
/** Approximate Kelvin-to-RGB colour for design previews, not photometric simulation. */
export function kelvinColor(k){const t=Math.max(2200,Math.min(6500,k))/100,limit=x=>Math.max(0,Math.min(255,Math.round(x)));const r=t<=66?255:329.698727446*Math.pow(t-60,-.1332047592),g=t<=66?99.4708025861*Math.log(t)-161.1195681661:288.1221695283*Math.pow(t-60,-.0755148492),b=t>=66?255:t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307;return '#'+[r,g,b].map(x=>limit(x).toString(16).padStart(2,'0')).join('');}
