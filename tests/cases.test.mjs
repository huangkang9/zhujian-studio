import test from 'node:test';import assert from 'node:assert/strict';
import {cases,caseProject,caseInfo,importProject} from '../public/studio/case-catalog.js';
import {findRooms,roomAt,wallPoints,normalizeProject} from '../public/studio/model.js';
import {drawingChecks} from '../public/studio/drawing-checks.js';
import {placementError} from '../public/studio/placement.js';
import {filterCases,caseThumbnail} from '../public/studio/case-library.js';
import {svgString,dxfString} from '../public/studio/export.js';

test('24 distinct reference layouts have valid geometry, furniture and the advertised bedroom counts',()=>{
 assert.equal(cases.length,24);const layouts=new Set();
 for(const item of cases){const p=caseProject(item.id),checks=drawingChecks(p),info=caseInfo(item);
  assert.equal(checks.errors,0,item.id);assert.deepEqual(checks.issues.filter(i=>i.severity==='warning').map(i=>i.title),['墙体结构待核实'],item.id);
  assert.equal(p.furniture.filter(f=>['bed','singleBed'].includes(f.type)).length,Math.max(1,item.beds),item.id);
  for(const f of p.furniture)assert.equal(placementError(p,f),null,item.id+':'+f.name);
  assert.ok(info.area>30&&info.area<140);assert.ok(info.furniture>=7);assert.equal(p.background,null);
  layouts.add(JSON.stringify(p.walls.map(w=>wallPoints(p,w).map(n=>[n.x,n.y]).sort()).sort()));
  assert.doesNotThrow(()=>normalizeProject(JSON.parse(JSON.stringify(p))));assert.ok(svgString(p).includes('<svg'));assert.ok(dxfString(p).includes('ENTITIES'));
 }
 assert.equal(layouts.size,24);
});
test('every room in all reference layouts is connected by doors to an exterior entry',()=>{
 for(const item of cases){const p=caseProject(item.id),rooms=findRooms(p),graph=new Map(rooms.map(r=>[r.key,new Set()]));let entry;
  for(const o of p.openings.filter(o=>o.type==='door')){const w=p.walls.find(w=>w.id===o.wall),[a,b]=wallPoints(p,w),len=Math.hypot(b.x-a.x,b.y-a.y),f=(o.offset+o.width/2)/len,x=a.x+(b.x-a.x)*f,y=a.y+(b.y-a.y)*f,dx=-(b.y-a.y)/len*20,dy=(b.x-a.x)/len*20,left=roomAt(p,{x:x+dx,y:y+dy})?.key,right=roomAt(p,{x:x-dx,y:y-dy})?.key;if(left&&right){graph.get(left).add(right);graph.get(right).add(left);}if(o.id==='entry')entry=left||right;}
  assert.ok(entry,item.id);const visited=new Set([entry]),queue=[entry];while(queue.length)for(const key of graph.get(queue.pop()))if(!visited.has(key)){visited.add(key);queue.push(key);}assert.equal(visited.size,rooms.length,item.id);
 }
});
test('copies and imports never share a project ID or mutable template state',()=>{
 const a=caseProject('four'),b=caseProject('four'),imported=importProject(a);assert.notEqual(a.id,b.id);assert.notEqual(imported.id,a.id);a.nodes[0].x+=100;a.furniture[0].color='#000000';assert.notDeepEqual(a.nodes,b.nodes);assert.notDeepEqual(a.furniture,b.furniture);assert.deepEqual(caseProject('four').nodes,b.nodes);assert.throws(()=>importProject({version:2}));assert.throws(()=>caseProject('missing'));
});
test('case search, bedroom and area filters combine correctly in both languages',()=>{
 const all=cases.map(caseInfo);assert.equal(filterCases(all).length,24);assert.equal(filterCases(all,{beds:'4'}).length,3);assert.equal(filterCases(all,{query:'courtyard'})[0].id,'courtyard');assert.ok(filterCases(all,{query:'双卫',beds:'3',area:'large'}).every(c=>c.beds===3&&c.area>=90&&c.area<120&&c.tags.includes('双卫')));const sorted=filterCases(all,{sort:'small'});assert.ok(sorted.every((c,i)=>!i||c.area>=sorted[i-1].area));assert.equal(filterCases(all,{query:'not-a-layout'}).length,0);assert.ok(caseThumbnail(caseProject('nest')).includes('<svg'));
});
