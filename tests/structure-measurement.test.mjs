import test from 'node:test';import assert from 'node:assert/strict';
import {emptyProject,addRectangle,normalizeProject,moveNodesConstrained,addWall,splitWall} from '../public/studio/model.js';
import {assertStructurePreserved,defaultLayers} from '../public/studio/structure.js';
import {snapMeasurement} from '../public/studio/measurement-snap.js';
import {renderPlan} from '../public/studio/plan.js';import {dxfString} from '../public/studio/export.js';
const clone=p=>JSON.parse(JSON.stringify(p));
const house=()=>{const p=emptyProject();addRectangle(p,{x:0,y:0,width:4000,depth:3000});p.walls[0].structure='bearing';return p;};
test('protected wall prevents deletion, shared node movement, thickness and opening edits but permits finishes and door swing',()=>{
 const p=house(),w=p.walls[0];p.openings=[{id:'door',wall:w.id,type:'door',offset:1000,width:900,height:2100,sill:0}];
 for(const change of[q=>q.walls.shift(),q=>q.nodes[0].x+=100,q=>q.walls[0].thickness+=10,q=>q.openings[0].width+=10,q=>q.openings=[]]){const q=clone(p);change(q);assert.throws(()=>assertStructurePreserved(p,q),/承重/);}
 const q=clone(p);q.walls[0].color='#112233';q.openings[0].openAngle=90;assert.doesNotThrow(()=>assertStructurePreserved(p,q));
 q.walls[0].structure='partition';assert.doesNotThrow(()=>assertStructurePreserved(p,q));
 const before=clone(p);assert.throws(()=>moveNodesConstrained(p,[{id:w.a,x:200}],{preserveAxes:false}),/承重/);assert.deepEqual(p,before);
 assert.throws(()=>addWall(p,{x:2000,y:-1000},{x:2000,y:1000}),/承重/);assert.deepEqual(p,before);
 assert.throws(()=>splitWall(p,w.id,{x:2000,y:0}),/承重/);assert.deepEqual(p,before);
});
test('structure and layer settings roundtrip without assuming old walls are non-bearing; CAD carries separate structural layers',()=>{
 const p=house();p.layers={...defaultLayers,rooms:false,grid:false,structure:true};p.walls[1].structure='partition';const q=normalizeProject(clone(p));assert.deepEqual(q.layers,p.layers);assert.equal(q.walls[2].structure,undefined);
 const svg=renderPlan(q,{...q.layers,view:{x:0,y:0,w:6000,h:5000},width:800});assert.ok(svg.includes('#aa4c3e'));assert.ok(svg.includes('#467c99'));assert.ok(!svg.includes('m² · 轴线'));assert.ok(svg.includes('opacity="0"'));const cad=dxfString(q);assert.ok(cad.includes('8\nWALL_BEARING\n'));assert.ok(cad.includes('8\nWALL_PARTITION\n'));
 q.walls[0].structure='automatic';assert.throws(()=>normalizeProject(q),/结构/);q.walls[0].structure='bearing';q.layers.grid='false';assert.throws(()=>normalizeProject(q),/图层/);
});
test('measurement snaps to physical wall faces and Shift stays exact even on diagonal walls',()=>{
 const p=house(),half=p.walls[0].thickness/2;assert.deepEqual(snapMeasurement(p,{x:1500,y:half+12},{tolerance:50}),{x:1500,y:half});
 const free={x:1234,y:2345};assert.deepEqual(snapMeasurement(p,free,{tolerance:20}),free);assert.deepEqual(snapMeasurement(p,free,{anchor:{x:0,y:0},shift:true,enabled:false}),{x:0,y:2345});
 const d=emptyProject();addWall(d,{x:0,y:0},{x:3000,y:3000});const q=snapMeasurement(d,{x:950,y:1000},{anchor:{x:0,y:1000},shift:true,tolerance:200});assert.ok(Math.abs(q.y-1000)<1e-6);assert.ok(Math.abs(Math.abs(q.x-q.y)-d.walls[0].thickness/Math.SQRT2)<1e-6);
 p.openings=[{id:'d',wall:p.walls[0].id,offset:1000,width:900,sill:0}];assert.deepEqual(snapMeasurement(p,{x:1500,y:half+12},{tolerance:50}),{x:1500,y:half+12});
});
