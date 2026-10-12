import test from 'node:test';import assert from 'node:assert/strict';import {parseHTML} from 'linkedom';
import * as THREE from '../public/studio/vendor/three.module.js';
import {emptyProject,addRectangle,addWall,findRooms,furnitureTypes,normalizeProject,clone,setWallLength} from '../public/studio/model.js';
import {setFitout,roomQuantities,ceilingHeight,kelvinColor} from '../public/studio/fitout.js';
import {budgetRows,budgetSummary,budgetCSV,setBudgetRate,setBudgetSetting,addBudgetItem,changeBudgetItem,removeBudgetItem} from '../public/studio/budget.js';
import {doorSweepConflicts,overheadConflicts} from '../public/studio/door-clearance.js';
import {walkable} from '../public/studio/walk.js';
import {RoomScene} from '../public/studio/scene.js';
import {fitoutEditor} from '../public/studio/fitout-ui.js';
import {installBudget} from '../public/studio/budget-ui.js';
const house=()=>{const p=emptyProject();addRectangle(p,{x:0,y:0,width:4000,depth:3000});return p;};
const geom=p=>{const s=Object.create(RoomScene.prototype);s.content=new THREE.Group();s.scene=new THREE.Scene();s.sun=new THREE.DirectionalLight();s.hemi=new THREE.HemisphereLight();s.renderer={setClearColor(){}};s.initialized=true;s.resize=()=>{};s.walk={active:true};s.rebuild(p);return s;};
const approx=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ≠ ${b}`);
test('room quantities deduct openings, count only floor-level trim interruptions and follow dropped ceilings',()=>{
 const p=house(),r=findRooms(p)[0];p.openings=[{id:'door',type:'door',wall:p.walls[0].id,offset:500,width:900,height:2100,sill:0},{id:'window',type:'window',wall:p.walls[1].id,offset:600,width:1200,height:1200,sill:900}];
 let q=roomQuantities(p,r);approx(q.floor,12);approx(q.ceiling,12);approx(q.perimeter,14);approx(q.wall,35.87);approx(q.skirting,13.1);
 setFitout(p,r.key,'ceiling','drop',200);q=roomQuantities(p,r);approx(q.wall,33.07);assert.equal(q.height,2600);setFitout(p,r.key,'skirting','enabled',false);assert.equal(roomQuantities(p,r).skirting,0);
 setFitout(p,r.key,'ceiling','enabled',false);assert.equal(roomQuantities(p,r).ceiling,0);assert.equal(ceilingHeight(p,r),2800);
});
test('shared walls count both room faces, and the shared door is deducted from each finish face',()=>{
 const p=emptyProject();addRectangle(p,{x:0,y:0,width:6000,depth:4000});const wall=addWall(p,{x:3000,y:0},{x:3000,y:4000})[0];p.openings=[{id:'d',wall:wall.id,type:'door',offset:1500,width:1000,height:2100,sill:0}];const rooms=findRooms(p);assert.equal(rooms.length,2);approx(rooms.reduce((sum,r)=>sum+roomQuantities(p,r).wall,0),74.2);
});
test('actual ceiling and skirting meshes follow room settings without moving the wall/opening model',()=>{
 const p=house(),r=findRooms(p)[0];setFitout(p,r.key,'ceiling','drop',300);setFitout(p,r.key,'ceiling','color','#223344');setFitout(p,r.key,'skirting','height',120);setFitout(p,r.key,'skirting','depth',25);setFitout(p,r.key,'skirting','color','#8899aa');const before=JSON.stringify(p),s=geom(p),ceiling=s.content.getObjectByName('room-ceiling');approx(ceiling.position.y,2.5);assert.equal(ceiling.material.color.getHexString(),'223344');const trims=[];s.content.traverse(o=>{if(o.name==='skirting'&&o.userData.trimSide===1)trims.push(o);});assert.equal(trims.length,4);for(const t of trims){approx(t.geometry.parameters.height,.12);approx(t.geometry.parameters.depth,.025);assert.equal(t.material.color.getHexString(),'8899aa');}assert.equal(JSON.stringify(p),before);
 s.walk.active=false;s.rebuild(p);assert.equal(s.content.getObjectByName('room-ceiling'),undefined);
});
test('room and furniture lights have independent colour, power and off states on real Three lights',()=>{
 const p=house(),r=findRooms(p)[0];setFitout(p,r.key,'light','mode','always');setFitout(p,r.key,'light','kelvin',6500);setFitout(p,r.key,'light','power',50);p.furniture=[{id:'lamp',type:'floorLamp',...furnitureTypes.floorLamp,x:1000,y:1200,rotation:0,light:{enabled:true,kelvin:2700,power:200,mode:'always'}}];const s=geom(p);s.setDaylight(12);assert.equal(s.roomLights.length,2);const [room,lamp]=s.roomLights;assert.ok(lamp.intensity>room.intensity*3.9);assert.notEqual(room.color.getHexString(),lamp.color.getHexString());assert.equal(lamp.color.getHexString(),kelvinColor(2700).slice(1));
 p.furniture[0].light.enabled=false;s.rebuild(p);s.setDaylight(22);assert.equal(s.roomLights.length,1);s.content.traverse(o=>{if(o.userData.luminaire&&o.userData.lightSettings?.enabled===false)assert.equal(o.material.emissiveIntensity,0);});
});
test('furniture and visitor headroom respect dropped ceilings and door swing checks respect direction/height',()=>{
 const p=house(),r=findRooms(p)[0];setFitout(p,r.key,'ceiling','drop',1200);assert.equal(walkable(p,{x:2000,y:1500}),false);assert.equal(walkable(p,{x:2000,y:1500},{eyeHeight:1200}),true);p.furniture=[{id:'f',type:'chair',...furnitureTypes.chair,x:1300,y:400,w:100,d:100,h:1900,rotation:0}];assert.equal(overheadConflicts(p).length,1);
 p.openings=[{id:'door',type:'door',wall:p.walls[0].id,offset:1000,width:900,height:2100,sill:0,openAngle:90}];assert.equal(doorSweepConflicts(p).length,1);p.openings[0].flip=true;assert.equal(doorSweepConflicts(p).length,0);p.openings[0].flip=false;p.furniture[0].elevation=2300;assert.equal(doorSweepConflicts(p).length,0);
});
test('budget separates material waste from labor/auxiliary quantities, unknown prices and reserve',()=>{
 const p=house(),floor=budgetRows(p).find(r=>r.id.endsWith(':floor'));setBudgetRate(p,floor.id,'material',100);setBudgetRate(p,floor.id,'auxiliary',10);setBudgetRate(p,floor.id,'labor',20);setBudgetRate(p,floor.id,'waste',10);setBudgetSetting(p,'reserve',5);setBudgetSetting(p,'target',2000);
 const row=budgetRows(p).find(r=>r.id===floor.id);approx(row.materialQuantity,13.2);assert.deepEqual(row.amounts,{material:1320,auxiliary:120,labor:240});assert.equal(row.total,1680);assert.equal(row.unpriced,false);const s=budgetSummary(p);assert.equal(s.total,1764);assert.equal(s.reserve,84);assert.equal(s.unknown,3);assert.equal(s.remaining,236);
 setBudgetRate(p,floor.id,'included',false);assert.equal(budgetSummary(p).total,0);assert.throws(()=>setBudgetRate(p,floor.id,'material',-1));
});
test('resize updates measured quantities while preserving rates; custom fees and scope survive JSON',()=>{
 const p=house(),r=findRooms(p)[0],floor=budgetRows(p).find(r=>r.id.endsWith(':floor'));setBudgetRate(p,floor.id,'material',123.45);setFitout(p,r.key,'ceiling','drop',200);setWallLength(p,p.walls[0].id,5000);assert.equal(budgetRows(p).find(r=>r.id===floor.id).quantity,15);assert.equal(budgetRows(p).find(r=>r.id===floor.id).material,123.45);
 addBudgetItem(p,{label:'水电改造',room:'全屋',unit:'项',quantity:1});let c=budgetRows(p).find(r=>r.customId);setBudgetRate(p,c.id,'material',2000);setBudgetRate(p,c.id,'auxiliary',0);setBudgetRate(p,c.id,'labor',1000);changeBudgetItem(p,c.customId,2);assert.equal(budgetRows(p).find(r=>r.id===c.id).total,6000);
 const q=normalizeProject(JSON.parse(JSON.stringify(p)));assert.deepEqual(q.budget,p.budget);assert.equal(q.roomMeta[r.key].fitout.ceiling.drop,200);removeBudgetItem(q,c.customId);assert.equal(budgetRows(q).some(r=>r.customId),false);assert.equal(q.budget.rates[c.id],undefined);
});
test('CSV retains Unicode, marks incomplete pricing, and escapes spreadsheet formula injection',()=>{
 const p=house();addBudgetItem(p,{label:'=HYPERLINK("x")',room:'全屋',unit:'项',quantity:1});const c=budgetRows(p).find(r=>r.customId);setBudgetRate(p,c.id,'brand','@SUM(1)');const csv=budgetCSV(p);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('主材单价'));assert.ok(csv.includes('待补单价'));assert.ok(csv.includes("'=HYPERLINK"));assert.ok(csv.includes("'@SUM"));assert.ok(csv.includes('""x""'));
});
test('malformed project details are rejected while old projects retain defaults',()=>{
 const p=house(),r=findRooms(p)[0];assert.equal(normalizeProject(p).budget,undefined);p.roomMeta[r.key]={fitout:{light:{kelvin:80000}}};assert.throws(()=>normalizeProject(p),/色温/);delete p.roomMeta[r.key];p.budget={rates:{test:{material:-1}}};assert.throws(()=>normalizeProject(p));
});
function dom(html='<dialog id="modal"><div id="modalBody"></div></dialog><div id="editor"></div>'){const {window,document}=parseHTML('<html><body>'+html+'</body></html>');Object.assign(globalThis,{window,document});Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this._value??this.querySelector('option[selected]')?.value??this.querySelector('option')?.value??'';},set(v){this._value=v;},configurable:true});document.querySelector('#modal').close=()=>{};return document;}
test('fitout panel changes actual ceiling, trim and lamp data and provides a room walkthrough action',()=>{
 const d=dom(),p=house();let selected={kind:'room',id:findRooms(p)[0].key},walked=false;const container=d.querySelector('#editor'),api={project:()=>p,selected:()=>selected,mutate:fn=>{fn();render();return true;},walk:()=>walked=true},render=()=>fitoutEditor(container,api,'test');render();d.querySelector('#test-drop').onchange({target:{value:'250'}});d.querySelector('#test-skirtingColor').onchange({target:{value:'#224466'}});d.querySelector('#test-kelvin').onchange({target:{value:'4000'}});d.querySelector('#test-walk').onclick();assert.equal(walked,true);assert.equal(p.roomMeta[selected.id].fitout.ceiling.drop,250);assert.equal(p.roomMeta[selected.id].fitout.light.kelvin,4000);p.furniture=[{id:'lamp',type:'tableLamp',...furnitureTypes.tableLamp,x:1000,y:1000,rotation:0}];selected={kind:'furniture',id:'lamp'};render();d.querySelector('#test-enabled').onchange({target:{checked:false}});assert.equal(p.furniture[0].light.enabled,false);
});
test('budget UI performs pricing, custom fees, exclusions, undo and exports the current model',()=>{
 const d=dom(),$=s=>d.querySelector(s);let p=house(),history=[],download;const api={project:()=>p,modal:(title,html)=>$('#modalBody').innerHTML=html,mutate:fn=>{history.push(clone(p));fn();return true;},undo:()=>p=history.pop(),download:data=>download=data,name:()=>p.name,select(){},checks(){}};const ui=installBudget(api);ui.open();const first=$('[data-budget-row]');first.querySelector('[data-rate="material"]').value='100';first.querySelector('[data-rate="material"]').onchange();assert.equal(budgetSummary(p).total,1200);$('#budgetReserve').onchange({target:{value:'10'}});assert.equal(budgetSummary(p).total,1320);$('#budgetUndo').onclick();assert.equal(budgetSummary(p).total,1200);
 $('#budgetAdd').onclick();$('#customQuantity').value='2';$('#customCreate').onclick();assert.equal(p.budget.custom.length,1);const custom=$('[data-quantity]');custom.value='3';custom.onchange();assert.equal(p.budget.custom[0].quantity,3);$('#budgetExport').onclick();assert.ok(download.includes('水电改造'));$('[data-budget-remove]').onclick();assert.equal(p.budget.custom.length,0);
});
