import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../public/studio/vendor/three.module.js';
import {RoomScene} from '../public/studio/scene.js';
import {demoProject} from '../public/studio/model.js';
function geometryScene(){const s=Object.create(RoomScene.prototype);s.content=new THREE.Group();s.initialized=true;s.resize=()=>{};return s;}
test('3D shared model builds finite wall, opening, floor and furniture geometry',()=>{const p=demoProject(),s=geometryScene();s.rebuild(p,{cutaway:false});const walls=s.content.children.filter(x=>x.userData.kind==='wall'),furniture=s.content.children.filter(x=>x.userData.kind==='furniture');assert.equal(walls.length,p.walls.length);assert.equal(furniture.length,p.furniture.length);assert.equal(s.content.children.filter(x=>x.userData.kind==='room').length,8);let meshes=0;s.content.updateMatrixWorld(true);s.content.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.matrixWorld.elements.every(Number.isFinite));assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});assert.ok(meshes>100);s.clear();assert.equal(s.content.children.length,0);});
test('window wall retains sill and lintel, full opening not filled by solid wall',()=>{const p=demoProject(),s=geometryScene();s.rebuild(p,{cutaway:false,furniture:false});const w=s.content.children.find(x=>x.userData.id==='w0'),segments=w.children.filter(x=>x.isMesh);assert.ok(segments.some(m=>Math.abs(m.geometry.parameters.height-.9)<.001));assert.ok(segments.some(m=>Math.abs(m.geometry.parameters.height-.4)<.001));const solidAtWindow=segments.some(m=>Math.abs(m.position.x-2.3)<.01&&m.geometry.parameters.height>2.7);assert.equal(solidAtWindow,false);});
test('cutaway wall height and furniture visibility are honoured',()=>{const p=demoProject(),s=geometryScene();s.rebuild(p,{cutaway:true,furniture:false});assert.equal(s.content.children.filter(x=>x.userData.kind==='furniture').length,0);for(const w of s.content.children.filter(x=>x.userData.kind==='wall'))for(const m of w.children.filter(x=>x.isMesh))assert.ok(m.position.y+m.geometry.parameters.height/2<=1.1501);});
test('regression: ALL windows including high-sill windows remain full height in every wall mode',()=>{
 const p=demoProject();
 for(const wallMode of ['auto','full','low']){
  const s=geometryScene();s.rebuild(p,{wallMode,cutHeight:800,furniture:false});s.content.updateMatrixWorld(true);
  for(const o of p.openings.filter(o=>o.type==='window')){
   const group=s.content.getObjectsByProperty('type','Group').find(g=>g.userData.id===o.id);
   assert.ok(group,`${o.id} must exist in ${wallMode}`);
   const top=group.children.find(m=>m.name==='frame-top'),left=group.children.find(m=>m.name==='frame-left');
   assert.ok(top,`${o.id} top frame missing`);
   assert.ok(Math.abs(left.geometry.parameters.height-o.height*.001)<1e-6);
   assert.ok(Math.abs(top.position.y+top.geometry.parameters.height/2-(o.sill+o.height)*.001)<1e-6);
   assert.ok(group.children.filter(m=>m.name.startsWith('glass-')).every(m=>m.geometry.parameters.height>o.height*.001-.12));
  }
 }
});
test('door leaf angle, flip and complete height follow the same project values',()=>{
 const p=demoProject(),o=p.openings.find(o=>o.type==='door'),s=geometryScene();o.openAngle=90;o.flip=true;s.rebuild(p,{wallMode:'low',cutHeight:600});
 const group=s.content.getObjectsByProperty('type','Group').find(g=>g.userData.id===o.id),leaf=group.children.find(g=>g.name==='door-leaf');
 assert.ok(Math.abs(leaf.rotation.y-Math.PI/2)<1e-6);assert.ok(leaf.children[0].geometry.parameters.height>2);
 o.openAngle=0;s.rebuild(p,{wallMode:'full'});const closed=s.content.getObjectsByProperty('type','Group').find(g=>g.userData.id===o.id).children.find(g=>g.name==='door-leaf');assert.equal(closed.rotation.y,0);
});
test('smart view fades only camera-facing exterior wall bodies and keeps window frame opaque',()=>{
 const p=demoProject(),s=geometryScene();s.camera={position:new THREE.Vector3(20,12,20)};s.rebuild(p,{wallMode:'auto'});
 const front=s.content.children.find(g=>g.userData.id==='w4'),rear=s.content.children.find(g=>g.userData.id==='w0'),interior=s.content.children.find(g=>g.userData.id==='w13');
 assert.ok(front.userData.body.every(m=>m.material.opacity===.1&&m.userData.pickThrough));
 assert.ok(rear.userData.body.every(m=>m.material.opacity===1));assert.ok(interior.userData.body.every(m=>m.material.opacity===1));
 const opening=front.children.find(g=>g.userData.kind==='opening');assert.equal(opening.children.find(m=>m.name==='frame-top').material.opacity,1);
 s.camera.position.set(-10,12,-10);s.updateVisibility();assert.ok(front.userData.body.every(m=>m.material.opacity===1));assert.ok(rear.userData.body.every(m=>m.material.opacity===.1));
 s.wallMode='full';s.updateVisibility();assert.ok(rear.userData.body.every(m=>m.material.opacity===1));
});
test('pane count and floor material changes alter actual geometry and maps',()=>{
 const p=demoProject(),o=p.openings.find(o=>o.type==='window'),s=geometryScene();o.panes=4;const key=Object.keys(p.roomMeta)[0];delete p.roomMeta[key].surface;p.roomMeta[key].floorStyle='tile';s.rebuild(p,{});
 const group=s.content.getObjectsByProperty('type','Group').find(g=>g.userData.id===o.id);assert.equal(group.children.filter(m=>m.name.startsWith('glass-')).length,4);assert.equal(group.children.filter(m=>m.name.startsWith('mullion-')).length,3);
 const floor=s.content.children.find(g=>g.userData.id===key).children.find(m=>m.geometry.type==='ShapeGeometry');assert.ok(floor.material.map?.isDataTexture);
 p.roomMeta[key].floorStyle='plain';s.rebuild(p,{});assert.equal(s.content.children.find(g=>g.userData.id===key).children.find(m=>m.geometry.type==='ShapeGeometry').material.map,null);
});
test('idle 3D tick does not render unnecessary GPU frames',()=>{const s=Object.create(RoomScene.prototype);s.container={clientWidth:800,clientHeight:600};s.needsRender=true;s.lastControlChange=0;s.renderedFrames=0;s.updateTransition=()=>{};s.controls={update(){}};s.updateVisibility=()=>{};let frames=0;s.renderer={render(){frames++;}};assert.equal(s.tick(10000),true);assert.equal(s.tick(10016),false);assert.equal(frames,1);s.needsRender=true;assert.equal(s.tick(10032),true);assert.equal(frames,2);s.container.clientWidth=0;s.needsRender=true;assert.equal(s.tick(10048),false);});
