import {ceilingHeight} from './fitout.js?v=0.13';
import {findRooms,pointInPolygon,wallPoints,projectPoint,wallLength} from './model.js?v=0.13';
/** Collision in mm. Circular visitor radius; doors pass only when visibly open. */
export function walkable(p,pt,{radius=180,eyeHeight=1600,rooms=findRooms(p),furniture=true}={}){
 const room=rooms.find(r=>pointInPolygon(pt,r.points));if(!room)return false;
 const roomWalls=p.walls.filter(w=>room.ids.includes(w.a)&&room.ids.includes(w.b));
 if(roomWalls.some(w=>w.height<eyeHeight+100)||ceilingHeight(p,room)<eyeHeight+100)return false;
 for(const w of p.walls){const[a,b]=wallPoints(p,w),q=projectPoint(pt,a,b);if(q.distance>=w.thickness/2+radius)continue;
  const at=q.t*wallLength(p,w);const door=p.openings.find(o=>o.wall===w.id&&o.type==='door'&&(o.openAngle??65)>=35&&o.height>eyeHeight+100&&o.sill<80&&at>o.offset+radius&&at<o.offset+o.width-radius);
  if(!door)return false;
 }
 for(const door of p.openings.filter(o=>o.type==='door')){
  const w=p.walls.find(w=>w.id===door.wall);if(!w)continue;const[a,b]=wallPoints(p,w);
  // Door panel itself remains a collision segment, rather than an invisible obstacle.
  const len=wallLength(p,w),ux=(b.x-a.x)/len,uy=(b.y-a.y)/len,angle=(oAngle(door))*(door.flip?-1:1),hinge={x:a.x+ux*(door.offset+45),y:a.y+uy*(door.offset+45)},width=Math.max(0,door.width-90),tip={x:hinge.x+width*(ux*Math.cos(angle)-uy*Math.sin(angle)),y:hinge.y+width*(uy*Math.cos(angle)+ux*Math.sin(angle))};
  if(projectPoint(pt,hinge,tip).distance<radius+20)return false;
 }
 if(furniture)for(const f of p.furniture){if(f.type==='rug'||(f.elevation||0)>=eyeHeight+100||f.h+(f.elevation||0)<100)continue;const angle=-f.rotation*Math.PI/180,dx=pt.x-f.x,dy=pt.y-f.y,x=dx*Math.cos(angle)-dy*Math.sin(angle),y=dx*Math.sin(angle)+dy*Math.cos(angle),qx=Math.max(Math.abs(x)-f.w/2,0),qy=Math.max(Math.abs(y)-f.d/2,0);if(Math.hypot(qx,qy)<radius)return false;}
 return true;
}
const oAngle=o=>(o.openAngle??65)*Math.PI/180;
export function spawnInRoom(p,room,{eyeHeight=1600,...options}={}){
 const candidates=[room.centroid],xs=room.points.map(n=>n.x),ys=room.points.map(n=>n.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 for(let iy=1;iy<16;iy++)for(let ix=1;ix<16;ix++)candidates.push({x:minX+(maxX-minX)*ix/16,y:minY+(maxY-minY)*iy/16});
 candidates.sort((a,b)=>Math.hypot(a.x-room.centroid.x,a.y-room.centroid.y)-Math.hypot(b.x-room.centroid.x,b.y-room.centroid.y));
 return candidates.find(pt=>pointInPolygon(pt,room.points)&&walkable(p,pt,{eyeHeight,...options}))||null;
}
export function walkStep(p,start,delta,options={}){
 let result={...start};const steps=Math.max(1,Math.ceil(Math.hypot(delta.x,delta.y)/60)),dx=delta.x/steps,dy=delta.y/steps;
 for(let i=0;i<steps;i++){
  const next={x:result.x+dx,y:result.y+dy};if(walkable(p,next,options)){result=next;continue;}
  const x={x:result.x+dx,y:result.y};if(walkable(p,x,options))result=x;
  const y={x:result.x,y:result.y+dy};if(walkable(p,y,options))result=y;
 }return result;
}
export class WalkController{
 constructor(scene){this.scene=scene;this.active=false;this.keys=new Set();this.yaw=0;this.pitch=0;this.eyeHeight=1600;this.speed=1400;this.last=0;this.look=null;
  const canvas=scene.renderer.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','三维空间；漫游模式可用方向键移动或转向');
  canvas.addEventListener('pointerdown',e=>{if(!this.active||e.button!==0)return;e.preventDefault();canvas.focus({preventScroll:true});this.look={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.active||this.look?.id!==e.pointerId)return;this.yaw-=(e.clientX-this.look.x)*.004;this.pitch=Math.max(-1.15,Math.min(1.15,this.pitch-(e.clientY-this.look.y)*.004));this.look={id:e.pointerId,x:e.clientX,y:e.clientY};this.apply();});
  const release=e=>{if(this.look?.id===e.pointerId){this.look=null;if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);}};
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  window.addEventListener('blur',()=>this.pause());document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();});
 }
 pause(){this.keys.clear();this.last=0;this.look=null;}
 setKey(key,on){if(!this.active)return;if(on)this.keys.add(key);else this.keys.delete(key);this.scene.needsRender=true;}
 enter(room){const p=this.scene.project,rooms=findRooms(p),ordered=room?[room,...rooms.filter(r=>r.key!==room.key)]:rooms;let pt=null;for(const r of ordered){pt=spawnInRoom(p,r,{eyeHeight:this.eyeHeight,rooms});if(pt){this.roomKey=r.key;break;}}
  if(!pt)return false;
  if(!this.active){this.saved={position:this.scene.camera.position.clone(),target:this.scene.controls.target.clone(),fov:this.scene.camera.fov};}
  this.active=true;this.pause();this.scene.controls.enabled=false;this.scene.transition=null;this.scene.camera.fov=68;this.scene.camera.updateProjectionMatrix();this.scene.camera.position.set(pt.x/1000,this.eyeHeight/1000,pt.y/1000);this.pitch=-.05;this.apply();return true;
 }
 teleport(room){const pt=spawnInRoom(this.scene.project,room,{eyeHeight:this.eyeHeight});if(!pt)return false;this.pause();this.roomKey=room.key;this.scene.camera.position.set(pt.x/1000,this.eyeHeight/1000,pt.y/1000);this.apply();return true;}
 exit(){if(!this.active)return;this.active=false;this.pause();this.scene.controls.enabled=true;this.scene.camera.fov=this.saved.fov;this.scene.camera.updateProjectionMatrix();this.scene.camera.position.copy(this.saved.position);this.scene.controls.target.copy(this.saved.target);this.scene.controls.update();this.scene.needsRender=true;}
 apply(){const c=this.scene.camera;c.rotation.order='YXZ';c.rotation.set(this.pitch,this.yaw,0);this.scene.needsRender=true;this.scene.callbacks.walkPosition?.({x:c.position.x*1000,y:c.position.z*1000,yaw:this.yaw});}
 tick(now){if(!this.active)return false;const dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;const key=this.keys;
  let forward=(key.has('w')||key.has('arrowup')?1:0)-(key.has('s')||key.has('arrowdown')?1:0),side=(key.has('d')?1:0)-(key.has('a')?1:0),turn=(key.has('arrowleft')?1:0)-(key.has('arrowright')?1:0);
  if(!forward&&!side&&!turn)return false;
  const norm=Math.hypot(forward,side)||1;forward/=norm;side/=norm;const v=this.speed*dt*(key.has('shift')?1.6:1),c=this.scene.camera;this.yaw+=turn*dt*1.25;
  const next=walkStep(this.scene.project,{x:c.position.x*1000,y:c.position.z*1000},{x:(-Math.sin(this.yaw)*forward+Math.cos(this.yaw)*side)*v,y:(-Math.cos(this.yaw)*forward-Math.sin(this.yaw)*side)*v},{eyeHeight:this.eyeHeight,rooms:this.scene.rooms});c.position.set(next.x/1000,this.eyeHeight/1000,next.y/1000);this.apply();return true;
 }
}
