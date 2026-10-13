import {lightSettings,kelvinColor} from './fitout.js?v=0.13';
import * as THREE from './vendor/three.module.js';
import {daylightAt,finishById,atmosphereSettings} from './atmosphere.js?v=0.13';
import {bounds,clone} from './model.js?v=0.13';
import {surfaceTexture} from './furniture-3d.js?v=0.13';
const maps=new Map();
export function finishMaterial(id){const sample=finishById(id);if(!sample)return {};let map=maps.get(id);if(!map&&sample.family!=='paint'){map=surfaceTexture(sample.family).clone();map.repeat.set(sample.family==='wood'?.7:1,sample.family==='wood'?3:1);map.needsUpdate=true;maps.set(id,map);}return {color:sample.color,roughness:sample.roughness,...(map?{map}:{})};}
export function wallUV(mesh){const geo=mesh.geometry,p=geo.attributes.position,n=geo.attributes.normal,uv=geo.attributes.uv;for(let i=0;i<p.count;i++){uv.setXY(i,Math.abs(n.getX(i))>.5?p.getZ(i)+mesh.position.z:p.getX(i)+mesh.position.x,Math.abs(n.getY(i))>.5?p.getZ(i)+mesh.position.z:p.getY(i)+mesh.position.y);}uv.needsUpdate=true;}
export const atmosphereSceneMethods={
 setDaylight(hour,settings={}){
  if(!this.sun||!this.project)return;const d=daylightAt(hour),a={...atmosphereSettings(this.project),...settings};this.daylightHour=d.hour;this.needsRender=true;
  const b=bounds(this.project),cx=(b.x+b.w/2)/1000,cz=(b.y+b.h/2)/1000,size=Math.max(5,b.w/1000,b.h/1000);
  this.sun.target.position.set(cx,0,cz);this.sun.position.set(cx+d.x*size*1.4,d.y*size,cz+d.z*size);this.sun.color.set(d.color);this.sun.intensity=d.sun;this.sun.castShadow=a.shadows;
  this.hemi.intensity=d.ambient;this.hemi.color.set(d.color);this.scene.environmentIntensity=d.environment;this.renderer.toneMappingExposure=a.exposure;this.renderer.setClearColor(d.background);this.scene.fog?.color.set(d.background);
  const power=settings=>{const l=lightSettings(settings);return l.enabled?(l.mode==='always'?Math.max(18,d.lamps):d.lamps+(this.walk?.active?3:0))*l.power/100:0;};
  for(const light of this.roomLights||[]){light.intensity=power(light.userData.lightSettings);light.color.set(kelvinColor(lightSettings(light.userData.lightSettings).kelvin));}
  this.content.traverse(o=>{if(o.userData.luminaire)o.material.emissiveIntensity=power(o.userData.lightSettings)/12;});
  const radius=Math.max(10,size*.9);Object.assign(this.sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius,far:Math.max(80,size*5)});this.sun.shadow.camera.updateProjectionMatrix();
 },
 pickAt(event){this.setRay(event);return this.pick();},
 planeAt(event){this.setRay(event);const v=new THREE.Vector3();return this.ray.ray.intersectPlane(this.plane,v)?{x:v.x*1000,y:v.z*1000}:null;},
 previewFinish(project,target,id,apply){const key=target?target.kind+target.id+id:'';if(key===this.finishPreviewKey)return;if(!target){this.clearFinishPreview();return;}this.previewBase=project;this.finishPreviewKey=key;const copy=clone(project);apply(copy,target,id);this.rebuild(copy,this.lastOptions||{});this.setDaylight(atmosphereSettings(project).hour);},
 clearFinishPreview(){if(!this.previewBase)return;const p=this.previewBase;this.previewBase=null;this.finishPreviewKey=null;this.rebuild(p,this.lastOptions||{});this.setDaylight(atmosphereSettings(p).hour);},
 toggleCinematic(force){const on=force??!this.cinematic;if(on&&this.walk?.active)return false;if(on){const b=bounds(this.project),cx=(b.x+b.w/2)/1000,cz=(b.y+b.h/2)/1000;this.cinematic={start:performance.now(),angle:Math.atan2(this.camera.position.z-cz,this.camera.position.x-cx),radius:Math.max(5,Math.hypot(this.camera.position.x-cx,this.camera.position.z-cz)),height:this.camera.position.y,cx,cz};this.transition=null;}else this.cinematic=null;this.needsRender=true;return !!this.cinematic;},
 updateCinematic(now){if(!this.cinematic)return;const c=this.cinematic,angle=c.angle+(now-c.start)*.00009;this.camera.position.set(c.cx+Math.cos(angle)*c.radius,c.height,c.cz+Math.sin(angle)*c.radius);this.controls.target.set(c.cx,.75,c.cz);},
 captureDaylightSeries(){
  const renderer=this.renderer,camera=this.camera,oldHour=this.daylightHour??16.5,aspect=camera.aspect,oldTarget=renderer.getRenderTarget(),cinematic=this.cinematic,width=320,height=210,target=new THREE.WebGLRenderTarget(width,height,{colorSpace:THREE.SRGBColorSpace}),result=[];
  try{this.cinematic=null;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setRenderTarget(target);
   for(const hour of[7.5,12.5,18.5,22]){this.setDaylight(hour);this.updateVisibility();renderer.render(this.scene,camera);const pixels=new Uint8Array(width*height*4);renderer.readRenderTargetPixels(target,0,0,width,height,pixels);const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d'),img=ctx.createImageData(width,height);for(let y=0;y<height;y++)img.data.set(pixels.subarray((height-1-y)*width*4,(height-y)*width*4),y*width*4);ctx.putImageData(img,0,0);result.push({hour,src:canvas.toDataURL('image/png')});}
  }finally{renderer.setRenderTarget(oldTarget);target.dispose();camera.aspect=aspect;camera.updateProjectionMatrix();this.setDaylight(oldHour);this.cinematic=cinematic;this.needsRender=true;}return result;
 }
};
