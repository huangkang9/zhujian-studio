import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';
import {Autosave} from '../public/studio/autosave.js';
import {emptyProject,addRectangle,addWall,demoProject} from '../public/studio/model.js';
import {drawingChecks,checkTargetPoint} from '../public/studio/drawing-checks.js';
import {printLayout,printSheetSVG,printDocument} from '../public/studio/print-sheet.js';
import {installDelivery} from '../public/studio/delivery-ui.js';
const rectangle=()=>{const p=emptyProject();addRectangle(p,{x:0,y:0,width:4000,depth:3000});return p;};
test('autosave retains snapshots and cannot report newer edits as saved when an older write finishes',async()=>{
 const calls=[],states=[],store={save:p=>new Promise(resolve=>calls.push({p,resolve}))},s=new Autosave(store,state=>states.push(state));const p=rectangle();
 s.mark(p,false);const old=s.flush();await Promise.resolve();p.name='新名称';s.mark(p,false);assert.notEqual(calls[0].p.name,p.name);calls[0].resolve();await old;assert.equal(s.dirty,true);assert.notEqual(states.at(-1),'saved');
 const fresh=s.flush();await Promise.resolve();assert.equal(calls[1].p.name,'新名称');calls[1].resolve();assert.equal(await fresh,true);assert.equal(s.dirty,false);assert.equal(states.at(-1),'saved');
});
test('failed saves preserve the dirty revision, can be retried and deduplicate in-flight writes',async()=>{
 let fail=true,count=0;const states=[],s=new Autosave({save:async()=>{count++;if(fail)throw Error('quota');}},state=>states.push(state));s.mark(rectangle(),false);assert.equal(await s.flush(),false);assert.equal(s.dirty,true);assert.equal(states.at(-1),'error');fail=false;
 await Promise.all([s.flush(),s.flush()]);assert.equal(count,2);assert.equal(s.dirty,false);
});
test('drawing checks distinguish connected geometry, crossing nodes, near gaps and collinear overlaps',()=>{
 const p=rectangle();assert.equal(drawingChecks(p).errors,0);assert.equal(drawingChecks(p).warnings,1);assert.ok(drawingChecks(p).issues.some(i=>i.title==='墙体结构待核实'));
 const crossing=emptyProject();crossing.nodes=[{id:'a',x:0,y:0},{id:'b',x:4000,y:0},{id:'c',x:2000,y:-1000},{id:'d',x:2000,y:1000}];crossing.walls=[{id:'w1',a:'a',b:'b',thickness:200,height:2800},{id:'w2',a:'c',b:'d',thickness:200,height:2800}];
 const issue=drawingChecks(crossing).issues.find(i=>i.title==='墙体交叉未连接');assert.ok(issue);assert.deepEqual(checkTargetPoint(crossing,issue),{x:2000,y:0,t:.5,u:.5});assert.ok(crossing.walls.some(w=>w.id===issue.target.id));
 crossing.nodes[2]={id:'c',x:2000,y:0};crossing.nodes[3]={id:'d',x:5000,y:0};assert.ok(drawingChecks(crossing).issues.some(i=>i.title==='墙体重复或共线重叠'));
 crossing.nodes[2]={id:'c',x:4003,y:0};crossing.nodes[3]={id:'d',x:5000,y:0};assert.ok(drawingChecks(crossing).issues.some(i=>i.title==='墙端点靠近但未连接'));
});
test('opening errors and inferred geometry remain actionable while checks do not mutate a plan',()=>{
 const p=rectangle(),w=p.walls[0];p.openings.push({id:'bad',wall:w.id,type:'window',offset:3900,width:1000,height:1200,sill:900});p.recognition={reviewed:true};const before=JSON.stringify(p),result=drawingChecks(p);assert.ok(result.issues.some(i=>i.severity==='error'&&i.target.id==='bad'));assert.ok(result.issues.some(i=>i.title.includes('现场复核')));assert.equal(JSON.stringify(p),before);
});
test('print sheets use physical millimetres and an exact scale with titleblock and reference bar',()=>{
 const p=rectangle(),l=printLayout(p,{paper:'A4',scale:50});assert.equal(l.fits,true);assert.equal(l.area.w/l.view.w,1/50);assert.equal(l.area.h/l.view.h,1/50);assert.equal(4000*l.area.w/l.view.w,80);
 const svg=printSheetSVG(p,{paper:'A4',scale:50,date:'2026-10-09'});assert.ok(svg.includes('width="297mm" height="210mm"'));assert.ok(svg.includes('1:50'));assert.ok(svg.includes('比例尺 / m'));assert.ok(svg.includes('2026-10-09'));assert.ok(printDocument(p,{paper:'A4',scale:50}).includes('@page{size:297mm 210mm;margin:0}'));
});
test('paper fit prevents cropping including remote measurements and supports portrait and furniture visibility',()=>{
 const p=rectangle();p.measurements=[{id:'m',a:{x:0,y:0},b:{x:50000,y:30000}}];assert.equal(printLayout(p,{paper:'A4',scale:50}).fits,false);assert.throws(()=>printSheetSVG(p,{paper:'A4',scale:50}),/放不下/);assert.equal(printLayout(p,{paper:'A3',scale:500,orientation:'portrait'}).fits,true);
 delete p.measurements;p.furniture.push({id:'f',type:'bed',name:'床',x:80000,y:0,w:1800,d:2000,h:900,rotation:0,color:'#aaaaaa'});assert.equal(printLayout(p,{scale:100}).fits,false);assert.equal(printLayout(p,{scale:100,furniture:false}).fits,true);assert.throws(()=>printLayout(p,{scale:0}),/不支持/);
});
test('print title metadata is escaped and a large plan is never silently auto-fitted',()=>{
 const p=rectangle();p.name='<script>alert(1)</script>';assert.ok(!printSheetSVG(p).includes('<script>'));addWall(p,{x:0,y:0},{x:100000,y:0});assert.throws(()=>printDocument(p,{scale:25}),/放不下/);
});
test('delivery DOM workflow locates issues, exports real reports and blocks overflowing print settings',()=>{
 const {window,document}=parseHTML('<html><body><dialog id="modal"><div id="modalBody"></div></dialog></body></html>');globalThis.document=document;const $=s=>document.querySelector(s);$('#modal').close=()=>{};
 const p=rectangle();p.openings.push({id:'bad',wall:p.walls[0].id,type:'window',offset:3900,width:1000,height:1200,sill:900});let located,downloaded;const ui=installDelivery({project:()=>p,modal:(title,html)=>{$('#modalBody').innerHTML=html;document.querySelectorAll('select').forEach(s=>Object.defineProperty(s,'value',{value:s.querySelector('option')?.value,writable:true,configurable:true}));},locate:(target,point)=>located={target,point},download:(data,name)=>downloaded={data,name},name:()=>p.name,hasScene:()=>false,save(){},toast(){}});
 ui.checks();$('[data-locate-check]').onclick();assert.equal(located.target.id,'bad');ui.checks();$('#downloadChecks').onclick();assert.ok(JSON.parse(downloaded.data).errors>0);$('#checksExport').onclick();assert.ok($('#exportCheck').textContent.includes('需修正'));$('#exportPrint').onclick();assert.equal($('#openPrint').disabled,false);$('#downloadSheet').onclick();assert.ok(downloaded.data.startsWith('<svg'));
 p.measurements=[{id:'m',a:{x:0,y:0},b:{x:100000,y:0}}];$('#printScale').onchange({target:{value:'25'}});assert.equal($('#openPrint').disabled,true);assert.ok($('#printFit').textContent.includes('放不下'));
});
