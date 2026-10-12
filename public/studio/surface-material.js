import * as THREE from './vendor/three.module.js';
import {styleById} from './surface-styles.js?v=0.12';
const cache=new Map(),fract=x=>x-Math.floor(x),rgb=h=>h.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));
export function stylePixels(style,color,groutColor,groutRatio=.005,size=128){const data=new Uint8Array(size*size*4),base=rgb(color),grout=rgb(groutColor);for(let y=0;y<size;y++)for(let x=0;x<size;x++){let u=x/size,v=y/size,k=1,seam=false;const noise=((x*73+y*97+x*y*13)%101)/101;
 if(style==='tiles'||style==='diagonal')seam=u<groutRatio||v<groutRatio;
 if(style==='checker'){seam=u<groutRatio||v<groutRatio||Math.abs(u-.5)<groutRatio||Math.abs(v-.5)<groutRatio;k=(Math.floor(u*2)+Math.floor(v*2))%2?.47:1;}
 if(['subway','brick'].includes(style)){const row=Math.floor(v*2);seam=fract(v*2)<groutRatio*2||fract(u+(row%2)*.5)<groutRatio;k=(style==='brick'?.9:.98)+noise*.08;}
 if(style==='wood'){seam=v<groutRatio||u<groutRatio;k=.90+.065*Math.sin(x*.3+Math.sin(y*.07)*2)+noise*.045;}
 if(style==='parquet'){const bx=Math.floor(u*2),by=Math.floor(v*2),horizontal=(bx+by)%2===0,across=horizontal?fract(v*2):fract(u*2),along=horizontal?x:y;seam=fract(across*3)<groutRatio*6||fract(u*2)<groutRatio*2||fract(v*2)<groutRatio*2;k=.88+Math.sin(along*.4+across*4)*.075+noise*.04;}
 if(style==='slats'){const a=fract(u*8);seam=a<Math.min(.45,groutRatio*8);k=.84+.15*Math.sin(a*Math.PI)+noise*.02;}
 if(style==='panels'){seam=u<groutRatio||v<groutRatio;k=u<.045||v<.035?.8:.98;}
 if(style==='plaster')k=.87+noise*.12;
 if(style==='woven')k=.77+((x+y)%2)*.12+noise*.1;
 if(style==='boucle')k=.75+.22*Math.abs(Math.sin(x*.65)*Math.cos(y*.65))+noise*.04;
 if(style==='leather')k=.88+noise*.11;
 if(style==='marble')k=.99-.27*Math.pow(Math.abs(Math.sin(u*11+v*6+Math.sin(v*14)*.5)),18);
 if(style==='metal')k=.86+noise*.025+.11*Math.sin(y*2.9);
 const at=(y*size+x)*4;for(let i=0;i<3;i++)data[at+i]=Math.round(Math.min(255,Math.max(0,seam?grout[i]:base[i]*k)));data[at+3]=255;
 }return data;}
export function surfaceMaterial(o){const s=o?.surface,def=styleById(s?.style);if(!def)return {};const color=o.color||'#ddd8cc';if(s.style==='plain')return {color,map:null,roughness:def.roughness,metalness:0};const scale=s.scale??600,rotation=s.rotation??0,groutColor=s.groutColor||'#dedcd1',groutWidth=s.groutWidth??3,key=JSON.stringify([s.style,color,scale,rotation,groutColor,groutWidth]);let map=cache.get(key);if(!map){map=new THREE.DataTexture(stylePixels(s.style,color,groutColor,Math.max(1/128,groutWidth/scale)),128,128,THREE.RGBAFormat);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(1000/scale,1000/scale);map.rotation=(rotation+(s.style==='diagonal'?45:0))*Math.PI/180;map.center.set(.5,.5);map.magFilter=THREE.LinearFilter;map.minFilter=THREE.LinearMipmapLinearFilter;map.generateMipmaps=true;map.needsUpdate=true;cache.set(key,map);if(cache.size>96){const first=cache.keys().next().value;cache.get(first).dispose();cache.delete(first);}}return {color:'#ffffff',map,roughness:def.roughness,metalness:def.material==='metal'?.7:0};}
export function physicalUV(geometry){const pos=geometry.attributes.position,norm=geometry.attributes.normal,uv=geometry.attributes.uv;if(!uv||!norm)return;for(let i=0;i<pos.count;i++){const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i)),nz=Math.abs(norm.getZ(i));uv.setXY(i,nx>nz?pos.getZ(i):pos.getX(i),ny>Math.max(nx,nz)?pos.getZ(i):pos.getY(i));}uv.needsUpdate=true;}
