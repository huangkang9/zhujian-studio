import {surfaceMaterial,physicalUV} from './surface-material.js?v=0.13';
import * as THREE from './vendor/three.module.js';
import {furnitureTypes} from './furniture-catalog.js?v=0.13';
const textures={};
/** Small offline studio environment for subtle metal/glass reflections. */
export function studioEnvironment(){
 const w=128,h=64,data=new Uint8Array(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const t=y/h,sky=t<.5;let color=sky?[174+55*t,193+44*t,203+35*t]:[133,145,122];
  if(y>13&&y<32&&((x>10&&x<29)||(x>80&&x<94)))color=[250,244,223];
  const i=(y*w+x)*4;data[i]=color[0];data[i+1]=color[1];data[i+2]=color[2];data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,w,h,THREE.RGBAFormat);texture.mapping=THREE.EquirectangularReflectionMapping;texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;return texture;
}

export function surfaceTexture(style){
 if(textures[style])return textures[style];
 const n=128,data=new Uint8Array(n*n*4);
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const noise=((x*73+y*97+x*y*13)%29)/29;
  let v=246;
  if(style==='fabric')v=215+((x+y)%2)*22+noise*15;
  if(style==='wood')v=224+Math.sin(x*.32+Math.sin(y*.035)*3)*12+Math.sin(x*.92+y*.06)*5;
  if(style==='leather')v=230+noise*21;
  if(style==='stone')v=240+Math.sin(x*.045+y*.06+Math.sin(y*.08))*8-noise*4;
  const i=(y*n+x)*4;data[i]=data[i+1]=data[i+2]=v;data[i+3]=255;
 }
 const t=new THREE.DataTexture(data,n,n,THREE.RGBAFormat);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(style==='fabric'?8:2,style==='fabric'?8:2);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;return textures[style]=t;
}
function material(color,style='lacquer',extra={}){
 return new THREE.MeshStandardMaterial({color,roughness:{fabric:.96,wood:.65,leather:.53,metal:.28,stone:.30,lacquer:.48}[style]??.7,metalness:style==='metal'?.7:0,...(['fabric','wood','leather','stone'].includes(style)?{map:surfaceTexture(style)}:{}),...extra});
}
function roundedGeometry(w,h,d,r){
 r=Math.min(r,w/2,h/2,d/2);const geo=new THREE.BoxGeometry(w,h,d,5,5,5),a=geo.attributes.position,v=new THREE.Vector3(),q=new THREE.Vector3();
 for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i);q.set(Math.max(-w/2+r,Math.min(w/2-r,v.x)),Math.max(-h/2+r,Math.min(h/2-r,v.y)),Math.max(-d/2+r,Math.min(d/2-r,v.z)));v.sub(q).normalize().multiplyScalar(r).add(q);a.setXYZ(i,v.x,v.y,v.z);}geo.computeVertexNormals();return geo;
}
/** Build in default dimensions then fit exact requested W × D × H, including feet. */
export function createFurniture(f,selected=false){
 const def=furnitureTypes[f.type],shape=def.shape,w=def.w/1000,d=def.d/1000,h=def.h/1000,c=f.color||def.color,style=f.material||def.material;
 const root=new THREE.Group(),g=new THREE.Group();root.add(g);root.userData={kind:'furniture',id:f.id};
 const add=(geo,x,y,z,col=c,mat=style,extra={})=>{const mesh=new THREE.Mesh(geo,material(col,mat,{...extra,...(col===c?surfaceMaterial(f):{})}));if(col===c&&f.surface)physicalUV(geo);mesh.position.set(x,y,z);mesh.castShadow=!extra.transparent;mesh.receiveShadow=true;g.add(mesh);return mesh;};
 const box=(ww,hh,dd,x,y,z,col=c,mat=style,r=0,extra={})=>add(r?roundedGeometry(ww,hh,dd,r):new THREE.BoxGeometry(ww,hh,dd),x,y,z,col,mat,extra);
 const cyl=(r1,r2,hh,x,y,z,col=c,mat=style)=>add(new THREE.CylinderGeometry(r1,r2,hh,32),x,y,z,col,mat);
 const sphere=(ww,hh,dd,x,y,z,col=c,mat=style)=>{const m=add(new THREE.SphereGeometry(1,20,12),x,y,z,col,mat);m.scale.set(ww/2,hh/2,dd/2);return m;};
 const leg=(x,z,height)=>box(.045,height,.045,x,height/2,z,'#6f5842','wood',.008);
 const legs=(height,wx=.4,dz=.37)=>{for(const x of[-w*wx,w*wx])for(const z of[-d*dz,d*dz])leg(x,z,height);};
 const handle=(x,y,z)=>box(.12,.016,.03,x,y,z,'#a69b84','metal',.007);
 const white='#eeeae1',dark='#374441',wood='#a48360';
 if(['sofa','armchair','sectional'].includes(shape)){
  legs(.13);const depth=shape==='sectional'?.9:d;
  box(w,h*.32,depth,0,h*.31,-d/2+depth/2,c,style,.085);
  box(w,h*.60,.19,0,h*.70,-d/2+.095,c,style,.07);
  const count=shape==='armchair'?1:Math.max(2,Math.round(w/.85)),cw=(w-.28)/count;
  for(let i=0;i<count;i++){
   const x=-w/2+.14+cw*(i+.5);
   box(cw-.022,.16,depth*.68,x,h*.56,-d/2+depth*.57,c,style,.06);
   const cushion=box(cw-.02,h*.35,.14,x,h*.77,-d/2+.24,c,style,.07);cushion.rotation.x=-.09;
  }
  for(const x of[-w/2+.08,w/2-.08])box(.16,h*.55,depth,x,h*.46,-d/2+depth/2,c,style,.065);
  for(const x of[-w*.30,w*.30]){const p=box(.32,.33,.13,x,h*.73,-d/2+.40,'#d9c4a3','fabric',.07);p.rotation.z=x>0?.16:-.14;}
  if(shape==='sectional'){box(w*.34,h*.42,d*.64,w*.30,h*.35,d*.18,c,style,.08);box(w*.34,.15,d*.57,w*.30,h*.60,d*.20,c,style,.07);}
 }else if(shape==='bed'){
  legs(.09);box(w,.24,d,0,.22,0,wood,'wood',.035);box(w,.74,.13,0,h-.37,-d/2+.065,c,style,.075);
  box(w-.06,.19,d-.15,0,.425,.05,white,'fabric',.065);
  box(w-.07,.05,d*.57,0,.55,d*.17,c,style,.04);
  for(const x of w>1.3?[-w*.23,w*.23]:[0]){const p=box(w>1.3?w*.41:w*.73,.12,.43,x,.56,-d*.30,white,'fabric',.06);p.rotation.y=x>0?.04:-.04;}
  box(w-.05,.025,d*.13,0,.59,d*.27,'#adbaab','fabric',.01);
 }else if(shape==='ottoman'){
  legs(.07);box(w,h-.05,d,0,h/2+.025,0,c,style,.10);box(w*.97,.07,d*.97,0,h-.03,0,c,style,.045);
 }else if(['table','coffee','desk','roundtable','stool'].includes(shape)){
  if(shape==='roundtable'){cyl(Math.min(w,d)/2,Math.min(w,d)/2,.06,0,h-.03,0);cyl(w*.08,w*.16,h-.07,0,(h-.07)/2,0,wood,'wood');cyl(w*.3,w*.3,.045,0,.0225,0,wood,'wood');}
  else if(shape==='stool'){legs(h-.08);box(w,.08,d,0,h-.04,0,c,style,.10);for(const z of[-d*.37,d*.37])box(w*.8,.03,.03,0,h*.3,z,wood,'wood');}
  else{legs(h-.06);box(w,.06,d,0,h-.03,0,c,style,.025);if(shape==='desk'){box(w*.26,h*.58,d*.83,w*.28,h*.48,0,white,'lacquer',.012);for(const y of[h*.37,h*.64])handle(w*.28,y,d*.43);}}
  if(shape==='coffee'){box(w*.22,.023,d*.33,-w*.20,h+.011,0,'#e4dfcc');box(w*.18,.022,d*.26,-w*.19,h+.035,.025,'#82977e');cyl(.075,.075,.08,w*.25,h+.04,0,'#a2a389','stone');}
 }else if(['chair','officechair'].includes(shape)){
  if(shape==='chair')legs(h*.51);else{cyl(.032,.045,h*.48,0,h*.24,0,dark,'metal');for(let i=0;i<5;i++){const a=i*Math.PI*2/5,m=box(.035,.035,d*.42,Math.sin(a)*d*.2,.065,Math.cos(a)*d*.2,dark,'metal',.01);m.rotation.y=a;sphere(.07,.07,.07,Math.sin(a)*d*.38,.035,Math.cos(a)*d*.38,dark,'metal');}}
  box(w,.095,d*.9,0,h*.53,0,c,style,.04);const back=box(w*.94,h*.43,.09,0,h*.78,-d*.4,c,style,.07);back.rotation.x=-.08;
  if(shape==='officechair')for(const x of[-w*.44,w*.44]){box(.045,h*.22,.04,x,h*.63,0,dark,'metal');box(.07,.045,d*.55,x,h*.75,0,dark,'metal',.02);}
 }else if(['cabinet','lowcabinet','drawers','bookcase','kitchen','island','oven','vanity'].includes(shape)){
  const bodyHeight=h-(shape==='vanity'?.10:0),front=d/2;
  box(w,.06,d,0,.05,0,dark,'lacquer');box(w,.045,d,0,bodyHeight-.023,0);box(.04,bodyHeight,d,-w/2+.02,bodyHeight/2,0);box(.04,bodyHeight,d,w/2-.02,bodyHeight/2,0);box(w,bodyHeight,.025,0,bodyHeight/2,-d/2+.0125);
  if(shape==='bookcase'){
   for(let j=1;j<5;j++){const y=j*(h-.06)/4;box(w,.028,d,0,y,0);for(let i=0;i<7;i++){const bh=.16+((i*17+j*11)%10)*.013;box(.045,bh,d*.62,-w*.36+i*.07,y+bh/2+.02,-d*.05,['#93856f','#b9bb9d','#6d857e','#c6a486'][(i+j)%4],'fabric',.003);}}
  }else if(shape==='oven'){
   box(w-.06,h-.10,.03,0,h/2,d/2,dark,'metal',.012);box(w*.76,h*.60,.014,0,h*.47,d/2+.02,'#192b2c','metal');handle(0,h*.78,d/2+.045);for(const x of[-w*.27,w*.27])sphere(.055,.055,.025,x,h*.89,d/2+.03,'#b4bbb5','metal');
  }else if(shape==='drawers'||shape==='lowcabinet'){
   const count=shape==='lowcabinet'?2:3;
   for(let i=0;i<count;i++){const hh=(bodyHeight-.09)/count,y=.065+(i+.5)*hh;box(w-.06,hh-.012,.025,0,y,front);handle(0,y+.01,front+.025);}
  }else{
   const n=Math.max(1,Math.round(w/.55));for(let i=0;i<n;i++){const ww=(w-.05)/n,x=-w/2+.025+(i+.5)*ww;box(ww-.008,bodyHeight-.10,.03,x,bodyHeight/2,front);handle(x,bodyHeight*.61,front+.024);}
  }
  if(['kitchen','island','vanity'].includes(shape))box(w+.04,.035,d+.03,0,bodyHeight+.017,0,'#e0ddd0','stone',.007);
  if(shape==='kitchen'||shape==='vanity'){
   const x=shape==='kitchen'?-w*.25:0,ww=shape==='kitchen'?w*.25:w*.66;
   box(ww,.025,d*.66,x,bodyHeight+.043,0,'#a0b0a9','metal',.035);box(ww-.07,.012,d*.50,x,bodyHeight+.06,0,white,'stone',.03);
   cyl(.016,.016,.19,x,bodyHeight+.095,-d*.30,'#abb8b5','metal');box(.028,.025,.15,x,bodyHeight+.18,-d*.20,'#abb8b5','metal',.01);
   if(shape==='kitchen'){box(w*.3,.018,d*.70,w*.23,bodyHeight+.043,0,dark,'metal',.012);for(const x2 of[w*.15,w*.31])for(const z of[-d*.18,d*.18])cyl(.075,.075,.012,x2,bodyHeight+.06,z,'#1a2523','metal');}
  }
 }else if(['counter','doublevanity','talloven'].includes(shape)){
  box(w,h,d,0,h/2,0,c,style,.014);box(w,.03,d,0,h-.015,0,'#e6e1d5','stone');
  const n=shape==='doublevanity'?4:Math.max(2,Math.round(w/.5));for(let i=0;i<n;i++){const x=-w/2+w/n*(i+.5);box(w/n-.012,h-.12,.025,x,h/2,d/2,c,style,.004);handle(x,h*.63,d/2+.025);}
  if(shape==='doublevanity')for(const x of[-w*.25,w*.25]){sphere(w*.36,.05,d*.7,x,h,0,white,'stone');sphere(w*.29,.02,d*.52,x,h+.025,0,'#a8b7b0','stone');cyl(.014,.014,.18,x,h+.09,-d*.32,'#a5b2ac','metal');box(.025,.025,.13,x,h+.17,-d*.22,'#a5b2ac','metal');}
  if(shape==='talloven')for(const y of[h*.38,h*.67]){box(w*.88,h*.22,.035,0,y,d/2+.018,dark,'metal');box(w*.70,h*.15,.01,0,y-.01,d/2+.04,'#172d2d','metal');handle(0,y+h*.08,d/2+.07);}
 }else if(shape==='crib'){
  for(const x of[-w*.47,w*.47])for(const z of[-d*.44,d*.44])box(.045,h,.045,x,h/2,z);
  box(w,.06,d,0,h*.27,0);box(w-.09,.08,d-.08,0,h*.34,0,white,'fabric',.025);
  for(const z of[-d*.46,d*.46]){box(w,.055,.04,0,h-.03,z);for(let i=0;i<14;i++)box(.024,h*.58,.024,-w*.44+i*w*.88/13,h*.63,z);}
  for(const x of[-w*.48,w*.48]){box(.04,.055,d,x,h-.03,0);for(let i=0;i<7;i++)box(.024,h*.58,.024,x,h*.63,-d*.4+i*d*.8/6);}
 }else if(shape==='beanbag'){
  sphere(w,h*.72,d,0,h*.36,d*.04);sphere(w*.84,h*.8,d*.50,0,h*.6,-d*.20);sphere(w*.76,h*.18,d*.60,0,h*.51,d*.15,c,style);
 }else if(shape==='cushion'){
  box(w,h*.65,d,0,h*.325,0,c,style,.05);for(const x of[-w*.34,w*.34])box(w*.22,h*.6,d*.6,x,h*.7,-d*.13,'#ebe3d4','fabric',.04);
 }else if(shape==='bench'){
  legs(h*.7);box(w,.075,d,0,h*.72,0,wood,'wood',.008);box(w,h*.23,d,0,h*.88,0,c,style,.04);box(w*.88,.035,d*.8,0,h*.22,0,wood,'wood');
 }else if(shape==='stove'){
  box(w,h*.5,d,0,h*.25,0,c,style,.025);for(const x of[-w*.26,w*.26]){cyl(d*.25,d*.25,h*.13,x,h*.55,0,dark,'metal');cyl(d*.17,d*.17,h*.2,x,h*.65,0,'#708178','metal');for(const a of[0,Math.PI/2]){const bar=box(d*.62,.014,.025,x,h*.80,0,dark,'metal');bar.rotation.y=a;}cyl(.025,.025,.02,x,h*.55,d*.35,'#a4aca1','metal');}
 }else if(shape==='sink'){
  box(w,.03,d,0,h-.015,0,c,style,.025);for(const x of[-w*.24,w*.24]){box(w*.43,h*.75,d*.78,x,h*.4,0,c,style,.04);box(w*.35,.01,d*.62,x,h+.003,0,'#879c93','metal',.03);cyl(.018,.018,.008,x,h+.01,0,dark,'metal');}cyl(.015,.015,.16,0,h+.08,-d*.32,'#c2ccc7','metal');box(.025,.025,.16,0,h+.15,-d*.17,'#c2ccc7','metal',.01);
 }else if(shape==='hood'){
  box(w,h*.16,d,0,h*.08,0,c,style,.02);box(w*.35,h*.8,d*.45,0,h*.6,-d*.22,c,style,.01);box(w*.82,.015,d*.68,0,.005,0,dark,'metal');for(const x of[-w*.35,w*.35])cyl(.025,.025,.012,x,.018,d*.34,white,'lacquer');
 }else if(shape==='dishwasher'||shape==='microwave'){
  box(w,h,d,0,h/2,0,c,style,.018);box(w*.94,h*.15,.02,0,h*.88,d/2,dark,'metal');handle(0,h*.84,d/2+.03);
  if(shape==='microwave'){box(w*.73,h*.66,.024,-w*.08,h*.43,d/2,dark,'metal',.01);box(w*.65,h*.54,.008,-w*.08,h*.43,d/2+.016,'#263b39','metal');for(const y of[h*.26,h*.55])sphere(.04,.04,.025,w*.39,y,d/2+.02,'#82958d','metal');}
 }else if(shape==='aircon'||shape==='wallaircon'||shape==='purifier'){
  box(w,h,d,0,h/2,0,c,style,Math.min(w,h)*.1);const tall=shape==='aircon';
  for(let i=0;i<8;i++)box(w*.80,.009,.008,0,tall?h*.60+i*h*.037:h*.12+i*h*.033,d/2+.003,dark,'metal');
  box(w*.25,h*.07,.01,0,tall?h*.92:h*.66,d/2+.005,'#628d80','metal',.005);
  if(shape==='purifier')for(let i=0;i<12;i++)box(.008,h*.42,.006,-w*.36+i*w*.72/11,h*.55,d/2+.008,'#7f8b82','metal');
 }else if(shape==='waterheater'){
  const body=cyl(d/2,d/2,w,0,h/2,0,c,style);body.rotation.z=Math.PI/2;
  for(const x of[-w*.25,w*.25])cyl(.023,.023,.10,x,.01,0,x<0?'#708fa9':'#af7f68','metal');box(w*.24,h*.13,.012,0,h*.40,d*.48,dark,'metal',.01);
 }else if(shape==='piano'){
  box(w,h,d*.43,0,h/2,-d*.28,c,style,.015);box(w,.12,d*.62,0,h*.56,d*.18,c,style,.01);box(w*.92,.055,d*.42,0,h*.63,d*.20,white,'lacquer');
  const kw=w*.92/30;for(let i=0;i<30;i++){box(.004,.003,d*.42,-w*.46+kw*i,h*.66,d*.20,dark,'metal');if(![2,6].includes(i%7))box(kw*.55,.025,d*.26,-w*.46+kw*(i+1),h*.67,d*.12,dark,'lacquer');}
  for(const x of[-w*.45,w*.45])box(.065,h*.55,.08,x,h*.275,d*.36);for(const x of[-.06,0,.06])box(.026,.03,.13,x,.08,d*.27,'#a89765','metal');box(w*.40,h*.17,.025,0,h*.76,-d*.045,c,style);
 }else if(shape==='treadmill'){
  box(w,h*.13,d,0,h*.065,0,c,style,.05);box(w*.72,.018,d*.76,0,h*.14,d*.03,dark,'metal');
  for(const x of[-w*.44,w*.44]){box(.05,h*.81,.07,x,h*.51,-d*.32);box(.06,.06,d*.46,x,h*.81,-d*.12,c,style,.02);}
  const screen=box(w*.85,h*.16,d*.16,0,h*.91,-d*.32,c,style,.025);screen.rotation.x=-.2;box(w*.50,.06,.02,0,h*.94,-d*.23,'#426861','metal');
 }else if(shape==='dresser'){
  legs(.7);box(w,.06,d,0,.73,0,c,style,.015);box(w*.8,.15,d*.9,0,.62,0);handle(0,.63,d*.48);box(w*.58,h*.44,.04,0,h*.78,-d*.42,wood,'wood',.08);box(w*.53,h*.4,.008,0,h*.78,-d*.39,'#b3ccc7','metal',.075);
 }else if(shape==='fridge'){
  box(w,h,d,0,h/2,0,c,style,.035);for(const [yy,hh] of[[h*.29,h*.55],[h*.79,h*.40]]){box(w-.04,hh,.035,0,yy,d/2,c,style,.012);box(.035,.26,.04,w*.35,yy,d/2+.03,dark,'metal',.01);}box(w*.20,.09,.008,w*.22,h*.83,d/2+.023,dark,'metal');
 }else if(shape==='washer'||shape==='dryer'){
  box(w,h,d,0,h/2,0,c,style,.02);box(w*.90,h*.12,.02,0,h*.90,d/2,white,'lacquer');const door=cyl(w*.34,w*.34,.028,0,h*.47,d/2+.02,'#65736d','metal');door.rotation.x=Math.PI/2;const glass=cyl(w*.27,w*.27,.03,0,h*.47,d/2+.04,'#263e3b','metal');glass.rotation.x=Math.PI/2;sphere(.065,.065,.035,w*.28,h*.90,d/2+.023,'#b6c2bb','metal');
 }else if(shape==='television'){
  box(w,h*.87,.055,0,h*.56,0,dark,'metal',.01);box(w*.96,h*.82,.005,0,h*.56,.03,'#193c40','metal',.008,{roughness:.2});box(w*.30,.025,d,0,.016,0,dark,'metal',.01);box(.04,h*.16,.04,0,h*.08,0,dark,'metal');
 }else if(shape==='tub'){
  box(w,h*.3,d,0,h*.15,0,white,'stone',.14);for(const x of[-w/2+.055,w/2-.055])box(.11,h*.9,d,x,h*.55,0,c,style,.05);for(const z of[-d/2+.045,d/2-.045])box(w-.12,h*.9,.09,0,h*.55,z,c,style,.04);box(w-.19,.035,d-.14,0,h*.32,0,'#c0dcd8','stone',.10);
 }else if(shape==='toilet'){
  box(w*.94,h*.66,d*.22,0,h*.67,-d*.37,white,'lacquer',.05);sphere(w*.95,h*.44,d*.76,0,h*.36,d*.1,white,'lacquer');box(w*.64,h*.36,d*.49,0,h*.18,d*.07,white,'lacquer',.08);sphere(w,h*.09,d*.75,0,h*.59,d*.08,white,'lacquer');sphere(w*.60,h*.012,d*.46,0,h*.64,d*.10,'#a8beb8','lacquer');
 }else if(shape==='shower'){
  box(w,.055,d,0,.0275,0,white,'stone',.015);for(const x of[-w/2,w/2])for(const z of[-d/2,d/2])box(.023,h,.023,x,h/2,z,c,'metal');
  for(const z of[-d/2,d/2])box(w,h,.006,0,h/2,z,'#b8d7d3','lacquer',0,{transparent:true,opacity:.16,depthWrite:false,side:THREE.DoubleSide});box(.006,h,d,w/2,h/2,0,'#b8d7d3','lacquer',0,{transparent:true,opacity:.16,depthWrite:false});box(.03,h*.6,.035,-w*.30,h*.61,-d*.46,'#aab9b0','metal');cyl(.11,.11,.015,-w*.30,h*.9,-d*.30,'#aab9b0','metal');
 }else if(['floorlamp','tablelamp','pendant'].includes(shape)){
  if(shape!=='pendant'){cyl(w*.32,w*.36,.04,0,.02,0,'#9b886d','metal');cyl(.018,.022,h*.73,0,h*.365,0,'#a28b68','metal');}
  else cyl(.009,.009,h*.48,0,h*.76,0,'#7d7463','metal');
  cyl(w*.30,w*.48,h*.32,0,shape==='pendant'?h*.20:h*.82,0,c,style);const bulb=sphere(w*.30,h*.08,d*.30,0,shape==='pendant'?h*.06:h*.67,0,'#fff1c8','lacquer');bulb.material.emissive.set('#ffd29d');bulb.material.emissiveIntensity=.65;bulb.userData.luminaire=true;
 }else if(shape==='plant'){
  cyl(w*.34,w*.25,h*.29,0,h*.145,0,'#b6a98f','stone');cyl(w*.29,w*.29,.012,0,h*.29,0,'#6b6450','stone');box(.025,h*.61,.025,0,h*.57,0,'#706d44','wood');for(let i=0;i<12;i++){const a=i*2.4,leaf=sphere(w*.46,h*.21,w*.18,Math.cos(a)*w*.24,h*.45+(i%4)*h*.12,Math.sin(a)*d*.24,i%2?c:'#72875b','lacquer');leaf.rotation.z=Math.sin(a)*.8;leaf.rotation.y=a;}
 }else if(shape==='rug'){
  box(w,h,d,0,h/2,0,c,'fabric',.02);for(let i=0;i<14;i++)box(w*.95,.001,.008,0,h+.0005,-d*.44+i*d*.068,'#e2d6bd','fabric');
 }else if(shape==='mirror'||shape==='artwork'){
  box(w,h,d,0,h/2,0,c,'wood',.025);box(w-.05,h-.05,.008,0,h/2,d/2+.004,shape==='mirror'?'#bbd0c8':'#e6d7b9',shape==='mirror'?'metal':'fabric',.016);
  if(shape==='artwork'){const sun=cyl(w*.18,w*.18,.012,w*.16,h*.70,d/2+.014,'#b7855a','lacquer');sun.rotation.x=Math.PI/2;box(w*.74,h*.18,.012,-w*.05,h*.3,d/2+.018,'#778c7f','fabric',.045);}
 }
 g.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(g),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());
 if(![size.x,size.y,size.z].every(n=>n>0&&Number.isFinite(n)))throw Error('无法生成家具模型：'+f.type);
 const scale=new THREE.Vector3(f.w/1000/size.x,f.h/1000/size.y,f.d/1000/size.z);g.scale.copy(scale);g.position.set(-center.x*scale.x,-b.min.y*scale.y,-center.z*scale.z);
 root.position.set(f.x/1000,(f.elevation||0)/1000,f.y/1000);root.rotation.y=-f.rotation*Math.PI/180;
 if(selected){const outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(f.w/1000+.025,f.h/1000+.025,f.d/1000+.025)),new THREE.LineBasicMaterial({color:'#258565'}));outline.position.y=f.h/2000;outline.userData.selectionOutline=true;root.add(outline);}
 return root;
}
