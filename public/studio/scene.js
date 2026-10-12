import {fitoutSettings,roomEdges,ceilingHeight,kelvinColor,lightSettings} from './fitout.js?v=0.12.1';
import {surfaceMaterial} from './surface-material.js?v=0.12.1';
import {atmosphereSceneMethods,finishMaterial,wallUV} from './atmosphere-scene.js?v=0.12.1';
import {createFurniture,studioEnvironment} from './furniture-3d.js?v=0.12.1';
import {WalkController} from './walk.js?v=0.12.1';
import * as THREE from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {wallPoints,wallLength,findRooms,bounds,clamp} from './model.js?v=0.12.1';
const M=.001;

// Procedural, repeatable textures. No CDN or image download at runtime.
export function floorTexture(style){
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let v=245;
  if(style==='tile'){const edge=x<2||y<2;v=edge?195:247+Math.sin(x*.4+y*.2)*2;}
  else if(style==='wood'){const board=Math.floor(y/32),seam=y%32<1||((x+(board%2)*64)%128<1);v=seam?198:239+Math.sin(x*.16+y*.08)*4+Math.sin(x*.55+y*.13)*2+board*1.5;}
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;texture.repeat.set(style==='tile'?1/.6:1/1.8,style==='tile'?1/.6:1/.8);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}

/** Returns the exterior normal from actual room adjacency, not wall drawing order. */
export function exteriorNormal(p,w,rooms=findRooms(p)){
 const adjacent=rooms.filter(r=>r.ids.some((id,i)=>{const next=r.ids[(i+1)%r.ids.length];return(id===w.a&&next===w.b)||(id===w.b&&next===w.a);}));
 if(adjacent.length!==1)return null;
 const[a,b]=wallPoints(p,w),len=wallLength(p,w);if(!len)return null;
 let x=-(b.y-a.y)/len,z=(b.x-a.x)/len;const c=adjacent[0].centroid,mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
 if(x*(c.x-mx)+z*(c.y-my)>0){x=-x;z=-z;}
 return {x,z};
}

export class RoomScene{
 constructor(container,callbacks={}){
  this.container=container;this.callbacks=callbacks;this.textures={};
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;
  this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.setClearColor('#edf0e8');
  this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.12;
  container.appendChild(this.renderer.domElement);
  this.scene=new THREE.Scene();this.scene.environment=studioEnvironment();this.scene.environmentIntensity=.45;this.scene.fog=new THREE.Fog('#edf0e8',45,130);
  this.camera=new THREE.PerspectiveCamera(38,1,.05,300);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.09;
  this.controls.maxPolarAngle=Math.PI*.495;this.controls.minDistance=1.5;this.controls.maxDistance=160;this.controls.target.set(5,0,4);
  this.hemi=new THREE.HemisphereLight('#fffdf4','#b5c2ac',2.4);this.scene.add(this.hemi);
  this.sun=new THREE.DirectionalLight('#fff8e8',2.7);this.sun.position.set(-8,18,5);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);
  Object.assign(this.sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:.5,far:80});this.sun.shadow.bias=-.00035;this.sun.shadow.normalBias=.025;this.sun.shadow.radius=3;
  this.scene.add(this.sun,this.sun.target);
  const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(400,400),this.material('#e5e9df'));backdrop.rotation.x=-Math.PI/2;backdrop.position.y=-.13;backdrop.receiveShadow=true;this.scene.add(backdrop);
  this.content=new THREE.Group();this.scene.add(this.content);this.ray=new THREE.Raycaster();this.plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  this.reducedMotion=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;this.controls.enableDamping=!this.reducedMotion;this.needsRender=true;this.lastControlChange=0;this.renderedFrames=0;this.drag=null;this.press=null;this.selected=null;this.wallMode='auto';this.preset='iso';this.transition=null;
  this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
  const canvas=this.renderer.domElement;
  canvas.addEventListener('pointerdown',e=>this.pointerDown(e),true);canvas.addEventListener('pointermove',e=>this.pointerMove(e),true);
  canvas.addEventListener('pointerup',e=>this.pointerUp(e),true);canvas.addEventListener('pointercancel',e=>this.pointerUp(e,true),true);
  canvas.addEventListener('dblclick',e=>{if(this.walk?.active)return;this.setRay(e);const hit=this.pick();if(hit){this.callbacks.select?.(hit);this.focus(hit);}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.callbacks.message?.('三维上下文已暂停，请刷新页面恢复；项目会自动保存。');});
  this.controls.addEventListener('change',()=>{this.needsRender=true;this.lastControlChange=performance.now();this.updateVisibility();});
  canvas.addEventListener('wheel',e=>{if(!this.drag)return;e.preventDefault();e.stopImmediatePropagation();const f=this.callbacks.dragRotate?.(this.drag.id,e.deltaY>0?15:-15),g=this.content.children.find(g=>g.userData.id===this.drag.id);if(f&&g){g.rotation.y=-f.rotation*Math.PI/180;this.needsRender=true;}},{capture:true,passive:false});
  this.walk=new WalkController(this);
  this.animate=()=>{this.frame=requestAnimationFrame(this.animate);this.tick();};
  this.animate();this.resize();
 }
 tick(now=performance.now()){
  if(!this.container.clientWidth||!this.container.clientHeight||globalThis.document?.hidden)return false;
  this.walk?.tick(now);
  const active=this.needsRender||this.transition||this.cinematic||now-this.lastControlChange<220;if(!active)return false;
  this.updateCinematic(now);this.updateTransition();if(!this.walk?.active)this.controls.update();this.updateVisibility();this.renderer.render(this.scene,this.camera);this.renderedFrames++;this.needsRender=false;return true;
 }

 resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.needsRender=true;}
 material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.78,...extra});}
 box(parent,w,h,d,x,y,z,color,extra={}){
  if(![w,h,d,x,y,z].every(Number.isFinite)||w<=0||h<=0||d<=0)return null;
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.material(color,extra));mesh.position.set(x,y,z);mesh.castShadow=!extra.transparent;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 }
 clear(){this.content.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});this.content.clear();}
 rebuild(p,options={}){
  const {furniture=true,selected=null,cutHeight=1100}=options;
  // The legacy cutaway flag is accepted for previously written integrations.
  this.lastOptions={...options};this.wallMode=this.walk?.active?'full':options.wallMode||(options.cutaway===true?'low':options.cutaway===false?'full':'auto');this.cutHeight=clamp(cutHeight,400,2200)*M;
  this.project=p;this.selected=selected;this.needsRender=true;this.clear();this.textures??={};const rooms=findRooms(p);this.rooms=rooms;this.roomLights=[];const trimSides=new Map();for(const r of rooms)for(const edge of roomEdges(p,r))trimSides.set(edge.wall.id+':'+edge.side,fitoutSettings(p.roomMeta[r.key]).skirting);
  for(const r of rooms){
   const meta=p.roomMeta[r.key]||{},style=meta.floorStyle||(/厨|卫/.test(meta.name||'')?'tile':p.defaults.floorStyle||'wood');
   const shape=new THREE.Shape();r.points.forEach((n,i)=>i?shape.lineTo(n.x*M,-n.y*M):shape.moveTo(n.x*M,-n.y*M));
   const group=new THREE.Group();group.userData={kind:'room',id:r.key};this.content.add(group);
   const slab=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:false,steps:1}),this.material('#c4c4b4'));slab.rotation.x=-Math.PI/2;slab.position.y=-.12;slab.receiveShadow=true;group.add(slab);
   const extra={roughness:style==='tile'?.42:.88};
   if(style!=='plain'){this.textures[style]??=floorTexture(style);extra.map=this.textures[style];}
   const color=meta.color||p.defaults.floorColor;
   const floor=new THREE.Mesh(new THREE.ShapeGeometry(shape),this.material(color,{...extra,...finishMaterial(meta.finish),color,...surfaceMaterial({...meta,color})}));floor.rotation.x=-Math.PI/2;floor.position.y=.008;floor.receiveShadow=true;group.add(floor);
   const cfg=fitoutSettings(meta),height=ceilingHeight(p,r)*M;
   if(this.walk?.active&&cfg.ceiling.enabled){const ceiling=new THREE.Mesh(new THREE.ShapeGeometry(shape),this.material(cfg.ceiling.color,{side:THREE.DoubleSide}));ceiling.rotation.x=-Math.PI/2;ceiling.position.y=height;ceiling.receiveShadow=true;ceiling.userData.ceiling=true;ceiling.name='room-ceiling';group.add(ceiling);}
   if(cfg.light.enabled&&this.roomLights.length<16){const lamp=new THREE.PointLight(kelvinColor(cfg.light.kelvin),0,Math.max(6,Math.sqrt(r.area)*2),2);lamp.position.set(r.centroid.x*M,height-.16,r.centroid.y*M);lamp.userData.lightSettings=cfg.light;group.add(lamp);this.roomLights.push(lamp);}
   const lum=this.box(group,.22,.025,.22,r.centroid.x*M,height-.02,r.centroid.y*M,'#fff3cd',{emissive:kelvinColor(cfg.light.kelvin),emissiveIntensity:0});lum.userData.ceiling=true;lum.userData.luminaire=true;lum.userData.lightSettings=cfg.light;lum.visible=!!this.walk?.active;

  }
  for(const w of p.walls){
   const[a,b]=wallPoints(p,w),len=wallLength(p,w)*M;if(!len)continue;
   const group=new THREE.Group();group.position.set(a.x*M,0,a.y*M);group.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);
   group.userData={kind:'wall',id:w.id,exterior:exteriorNormal(p,w,rooms),midpoint:{x:(a.x+b.x)*M/2,z:(a.y+b.y)*M/2},body:[]};this.content.add(group);
   const fullHeight=w.height*M,high=this.wallMode==='low'?Math.min(fullHeight,this.cutHeight):fullHeight,thick=w.thickness*M;
   const color=!this.walk?.active&&selected?.kind==='wall'&&selected.id===w.id?'#b8d9c5':w.color||p.defaults.wallColor;
   const wallPart=(s,e,y,h,baseboard=false)=>{
    const mesh=this.box(group,e-s,h,thick,(s+e)/2,y+h/2,0,color,{...finishMaterial(w.finish),color,...surfaceMaterial({...w,color:w.color||p.defaults.wallColor})});if(mesh){if(w.finish||w.surface)wallUV(mesh);mesh.userData.wallBody=true;group.userData.body.push(mesh);}
    if(baseboard&&e>s){for(const side of[-1,1]){const cfg=trimSides.get(w.id+':'+side)||(rooms.length?null:fitoutSettings().skirting);if(!cfg?.enabled)continue;const trimHeight=Math.min(cfg.height*M,high,h);const trim=this.box(group,e-s,trimHeight,cfg.depth*M,(s+e)/2,trimHeight/2,side*(thick/2+cfg.depth*M/2),cfg.color);if(trim){trim.name='skirting';trim.userData.wallBody=true;trim.userData.trimSide=side;group.userData.body.push(trim);}}}
   };
   let at=0;const openings=p.openings.filter(o=>o.wall===w.id).sort((a,b)=>a.offset-b.offset);
   for(const o of openings){
    const start=clamp(o.offset*M,0,len),end=clamp((o.offset+o.width)*M,0,len),sill=o.sill*M,top=(o.sill+o.height)*M;
    wallPart(at,start,0,high,true);if(sill>0)wallPart(start,end,0,Math.min(high,sill),true);if(top<high)wallPart(start,end,top,high-top);
    // CRITICAL: door/window geometry ALWAYS uses the measured full height.
    // It must never be limited by the display-only cutaway wall height.
    if(end>start)this.addOpening(group,o,start,end,thick,!this.walk?.active&&selected?.kind==='opening'&&selected.id===o.id);
    at=end;
   }
   wallPart(at,len,0,high,true);
  }
  if(furniture)for(const f of [...p.furniture].sort((a,b)=>(a.type==='rug'?-1:0)-(b.type==='rug'?-1:0)))this.addFurniture(f,!this.walk?.active&&selected?.kind==='furniture'&&selected.id===f.id);
  if(!this.initialized){this.fit(false);this.initialized=true;}
  this.updateVisibility();this.resize();
 }
 addOpening(parent,o,start,end,thick,selected){
  const group=new THREE.Group(),width=end-start,height=o.height*M,sill=o.sill*M,top=sill+height;
  group.userData={kind:'opening',id:o.id,type:o.type,fullHeight:height,sill};parent.add(group);
  const f=Math.min(.055,width/6,height/6),depth=Math.min(.14,thick*.7),frameColor=selected?'#2c927a':o.frameColor||(o.type==='window'?'#758b85':'#b29b7c');
  const piece=(name,w,h,d,x,y,z,color=frameColor,extra={})=>{const m=this.box(group,w,h,d,x,y,z,color,extra);if(m)m.name=name;return m;};
  piece('frame-left',f,height,depth,start+f/2,sill+height/2,0);
  piece('frame-right',f,height,depth,end-f/2,sill+height/2,0);
  piece('frame-top',width,f,depth,(start+end)/2,top-f/2,0);
  if(o.type==='window'){
   piece('frame-bottom',width,f,depth,(start+end)/2,sill+f/2,0);
   piece('window-sill',width+.10,.035,thick+.10,(start+end)/2,sill-.018,0,'#e4dfd1');
   const panes=clamp(Math.round(o.panes||width/.85),1,6),innerWidth=width-2*f,gap=f*.68;
   for(let i=1;i<panes;i++)piece('mullion-'+i,gap,height-2*f,depth*.75,start+f+innerWidth*i/panes,sill+height/2,0);
   for(let i=0;i<panes;i++){
    const paneWidth=innerWidth/panes-gap*.7,x=start+f+innerWidth*(i+.5)/panes;
    const glass=piece('glass-'+i,paneWidth,height-2*f,.008,x,sill+height/2,0,'#a6d0d0',{transparent:true,opacity:.23,roughness:.13,metalness:.15,depthWrite:false,side:THREE.DoubleSide});
    if(glass){glass.castShadow=false;glass.renderOrder=2;}
   }
   // Small opening handle, present on both viewing sides.
   for(const side of[-1,1])piece('window-handle',.015,Math.min(.12,height*.3),.025,end-f*.65,sill+height*.48,side*(depth/2+.013),'#d4d6cb',{metalness:.45,roughness:.32});
  }else{
   // Door casing and the leaf share the exact same hinge and opening angle in 2D and 3D.
   for(const side of[-1,1]){
    piece('casing-top',width+.075,.065,.016,(start+end)/2,top+.02,side*(thick/2+.008),'#c3ae8e');
    for(const x of[start-.014,end+.014])piece('casing-side',.065,height+.045,.016,x,sill+height/2,side*(thick/2+.008),'#c3ae8e');
   }
   const leaf=new THREE.Group();leaf.name='door-leaf';leaf.position.set(start+f,0,0);leaf.rotation.y=(o.flip?1:-1)*(o.openAngle??65)*Math.PI/180;group.add(leaf);
   const leafWidth=Math.max(.015,width-2*f),leafHeight=Math.max(.02,height-f-.012),leafColor=o.leafColor||'#c5b18e';
   this.box(leaf,leafWidth,leafHeight,.038,leafWidth/2,sill+leafHeight/2+.01,0,leafColor);
   for(const side of[-1,1]){
    this.box(leaf,leafWidth*.75,leafHeight*.63,.006,leafWidth/2,sill+leafHeight*.57,side*.022,'#d0bd9c');
    this.box(leaf,.025,.16,.012,leafWidth-.09,sill+Math.min(1,leafHeight*.48),side*.029,'#8a9186',{metalness:.6,roughness:.3});
    this.box(leaf,.12,.018,.023,leafWidth-.13,sill+Math.min(1,leafHeight*.48)+.02,side*.045,'#8a9186',{metalness:.6,roughness:.3});
   }
  }
  return group;
 }
 updateVisibility(){
  if(!this.camera)return;
  for(const group of this.content.children){
   if(group.userData.kind!=='wall')continue;
   const normal=group.userData.exterior,mid=group.userData.midpoint;
   const facing=normal?normal.x*(this.camera.position.x-mid.x)+normal.z*(this.camera.position.z-mid.z):0;
   const isSelected=this.selected?.kind==='wall'&&this.selected.id===group.userData.id;
   const fade=!this.walk?.active&&this.wallMode==='auto'&&normal&&facing>.20&&!isSelected;
   for(const mesh of group.userData.body){
    const opacity=fade?.10:1,m=mesh.material;
    if(m.opacity!==opacity){const changed=m.transparent!==!!fade;m.opacity=opacity;m.transparent=!!fade;m.depthWrite=!fade;if(changed)m.needsUpdate=true;mesh.castShadow=!fade;mesh.renderOrder=fade?3:0;}
    mesh.userData.pickThrough=!!fade;
   }
  }
 }
 setLighting(mode='day'){this.lightMode=mode;this.setDaylight({day:12.5,warm:18.1,night:22}[mode]??12.5);}

 addFurniture(f,selected){const g=createFurniture(f,selected);this.content.add(g);g.updateMatrixWorld(true);const settings=lightSettings(f.light);g.traverse(o=>{if(!o.userData.luminaire)return;o.userData.lightSettings=settings;o.material.emissive.set(kelvinColor(settings.kelvin));if(settings.enabled&&this.roomLights.length<16){const pos=o.getWorldPosition(new THREE.Vector3()),lamp=new THREE.PointLight(kelvinColor(settings.kelvin),0,6,2);lamp.position.copy(pos);lamp.userData.lightSettings=settings;this.content.add(lamp);this.roomLights.push(lamp);}});return g;} fit(animate=true){this.preset='iso';this.setPreset('iso',animate);if(this.project?.atmosphere)this.setDaylight(this.project.atmosphere.hour);else this.setLighting(this.lightMode||'day');}
 setPreset(name='iso',animate=true){
  this.preset=name;const b=this.project?bounds(this.project):{x:0,y:0,w:10000,h:8000},cx=(b.x+b.w/2)*M,cz=(b.y+b.h/2)*M,size=Math.max(b.w,b.h)*M;
  // Narrow split panes need additional camera distance to fit the complete room.
  const aspect=this.camera?.aspect||1,extent=Math.max(b.h*M,b.w*M/Math.max(.4,aspect)),dist=Math.max(size,extent)*1.35;
  const target=new THREE.Vector3(cx,.65,cz);let position;
  if(this.walk?.active)return;
  if(name==='top')position=new THREE.Vector3(cx,dist*1.3,cz+.01);
  else if(name==='front')position=new THREE.Vector3(cx,Math.max(2,size*.32),cz+dist*1.5);
  else position=new THREE.Vector3(cx+dist*.63,dist*.94,cz+dist*.80);
  this.moveCamera(position,target,animate);
 }
 focus(selected=this.selected){
  if(this.walk?.active||!selected||!this.camera)return false;
  const group=this.content.children.find(g=>g.userData.kind===selected.kind&&g.userData.id===selected.id)||this.content.getObjectsByProperty('type','Group').find(g=>g.userData.kind===selected.kind&&g.userData.id===selected.id);
  if(!group)return false;this.content.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(group),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
  const d=Math.max(2.7,size.length()*1.3),direction=this.camera.position.clone().sub(this.controls.target).normalize();direction.y=Math.max(direction.y,.6);direction.normalize();this.moveCamera(center.clone().addScaledVector(direction,d),center,true);return true;
 }
 moveCamera(position,target,animate=true){
  if(!this.camera||!this.controls)return;
  if(this.reducedMotion)animate=false;this.needsRender=true;if(!animate){this.camera.position.copy(position);this.controls.target.copy(target);this.controls.update();return;}
  this.transition={start:performance.now(),from:this.camera.position.clone(),to:position,fromTarget:this.controls.target.clone(),toTarget:target};
 }
 updateTransition(){if(!this.transition)return;const t=this.transition,x=Math.min(1,(performance.now()-t.start)/500),ease=1-Math.pow(1-x,3);this.camera.position.lerpVectors(t.from,t.to,ease);this.controls.target.lerpVectors(t.fromTarget,t.toTarget,ease);if(x===1)this.transition=null;}
 setRay(e){const r=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);}
 pick(){
  const hits=this.ray.intersectObjects(this.content.children,true);
  for(const hit of hits){if(hit.object.userData.pickThrough)continue;let object=hit.object;while(object&&object!==this.content&&!object.userData.kind)object=object.parent;if(object?.userData.kind)return {kind:object.userData.kind,id:object.userData.id};}return null;
 }
 pointerDown(e){
  if(this.walk?.active||e.button!==0)return;this.toggleCinematic(false);this.clearFinishPreview();this.transition=null;this.setRay(e);const item=this.pick();if(this.callbacks.placeClick?.(e,item)){e.preventDefault();e.stopImmediatePropagation();return;}this.press={item,x:e.clientX,y:e.clientY};
  // First click selects. Only dragging an already selected item moves furniture.
  if(item?.kind==='furniture'&&this.selected?.kind==='furniture'&&item.id===this.selected.id){
   const f=this.project.furniture.find(f=>f.id===item.id),pos=new THREE.Vector3();if(!f||!this.ray.ray.intersectPlane(this.plane,pos))return;
   this.drag={id:f.id,offsetX:f.x-pos.x/M,offsetY:f.y-pos.z/M};this.callbacks.dragStart?.();this.controls.enabled=false;this.renderer.domElement.setPointerCapture(e.pointerId);e.stopImmediatePropagation();
  }
 }
 pointerMove(e){
  if(!this.drag)return;this.setRay(e);const pos=new THREE.Vector3();if(!this.ray.ray.intersectPlane(this.plane,pos))return;
  const v=this.callbacks.drag?.(this.drag.id,pos.x/M+this.drag.offsetX,pos.z/M+this.drag.offsetY),g=this.content.children.find(g=>g.userData.id===this.drag.id);
  if(g&&v){g.position.set(v.x*M,(v.elevation||0)*M,v.y*M);this.needsRender=true;}e.stopImmediatePropagation();
 }
 pointerUp(e,cancel=false){
  if(this.walk?.active)return;
  if(this.drag){this.drag=null;this.press=null;this.controls.enabled=true;this.callbacks.dragEnd?.(cancel);if(this.renderer.domElement.hasPointerCapture?.(e.pointerId))this.renderer.domElement.releasePointerCapture(e.pointerId);e.stopImmediatePropagation();return;}
  if(this.press&&!cancel&&Math.hypot(e.clientX-this.press.x,e.clientY-this.press.y)<5)this.callbacks.select?.(this.press.item||{kind:null,id:null});this.press=null;
 }
 screenshot(){this.updateVisibility();this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
}

Object.assign(RoomScene.prototype,atmosphereSceneMethods);
