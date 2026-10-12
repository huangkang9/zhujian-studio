import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../public/studio/vendor/three.module.js';
import {furnitureTypes,resizeFurniture} from '../public/studio/furniture-catalog.js';
import {createFurniture} from '../public/studio/furniture-3d.js';
import {emptyProject,normalizeProject,furnitureCorners} from '../public/studio/model.js';
import {furnitureSVG} from '../public/studio/plan.js';
import {dxfString} from '../public/studio/export.js';
const fixture=(type,changes={})=>({id:'f1',type,...furnitureTypes[type],x:0,y:0,rotation:0,...changes});
test('all 60 furniture assets have finite geometry and match edited bounding dimensions',()=>{
 assert.equal(Object.keys(furnitureTypes).length,60);
 for(const type of Object.keys(furnitureTypes))for(const scale of[1,.53,1.73]){
  const def=furnitureTypes[type],f=fixture(type,{w:def.w*scale,d:def.d*.76,h:def.h*1.21,elevation:420}),g=createFurniture(f);g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(g),size=b.getSize(new THREE.Vector3());
  for(const[a,v]of[['x',f.w],['y',f.h],['z',f.d]])assert.ok(Math.abs(size[a]*1000-v)<.05,`${type} ${a}: ${size[a]*1000} vs ${v}`);
  assert.ok(Math.abs(b.min.y-.42)<1e-6,type+' elevation');
  g.traverse(o=>{if(o.isMesh){assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite),type);assert.ok(o.matrixWorld.elements.every(Number.isFinite),type);o.geometry.dispose();o.material.dispose();}});
  const svg=furnitureSVG(f,true);assert.ok(!/NaN|undefined/.test(svg),type+' SVG');
 }
});
test('independent and proportional resize are atomic and preserve position',()=>{
 const f=fixture('sofa');resizeFurniture(f,'w',2500);assert.equal(f.d,900);resizeFurniture(f,'w',1250,true);assert.equal(f.d,450);assert.equal(f.h,410);assert.equal(f.x,0);const previous={...f};assert.throws(()=>resizeFurniture(f,'h',20000,true));assert.deepEqual(f,previous);assert.throws(()=>resizeFurniture(f,'d',NaN));
});
test('dimensions, material and elevation survive JSON and DXF footprint uses resized geometry',()=>{
 const p=emptyProject(),f=fixture('desk',{w:1800,d:720,h:800,elevation:150,material:'metal',rotation:90});p.furniture=[f];const q=normalizeProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(q.furniture[0],f);const corners=furnitureCorners(f);assert.equal(Math.round(Math.max(...corners.map(p=>p.x))-Math.min(...corners.map(p=>p.x))),720);assert.ok(dxfString(q).includes('FURNITURE'));q.furniture[0].elevation=-1;assert.throws(()=>normalizeProject(q),/离地/);
});
test('custom primary material changes actual roughness and texture',()=>{
 const a=createFurniture(fixture('sofa',{material:'fabric'})),b=createFurniture(fixture('sofa',{material:'metal'}));let fabrics=0,metals=0;a.traverse(o=>{if(o.material?.map&&o.material.roughness===.96)fabrics++;});b.traverse(o=>{if(o.material?.metalness===.7)metals++;});assert.ok(fabrics>0);assert.ok(metals>0);
});
