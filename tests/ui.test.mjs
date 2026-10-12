import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {parseHTML} from 'linkedom';import {IDBFactory} from 'fake-indexeddb';
import {ProjectStore} from '../public/studio/workspace-store.js';import {demoProject} from '../public/studio/model.js';
test('complete non-WebGL DOM flow: resize, furnishings, rectangle, measurement, project archive, command and DXF',async()=>{
 const factory=new IDBFactory(),store=new ProjectStore(factory);await store.save(demoProject());
 const{window,document}=parseHTML(fs.readFileSync(new URL('../public/studio/index.html',import.meta.url),'utf8'));
 Object.assign(globalThis,{window,document,innerWidth:1440,devicePixelRatio:1,ResizeObserver:class{observe(){}},requestAnimationFrame:f=>{queueMicrotask(f);return 1;},indexedDB:factory});
 URL.createObjectURL=blob=>{globalThis.lastBlob=blob;return 'blob:qa'};URL.revokeObjectURL=()=>{};
 const $=s=>document.querySelector(s),svg=$('#plan');svg.createSVGPoint=()=>({x:0,y:0,matrixTransform(){return{x:this.x,y:this.y};}});svg.getScreenCTM=()=>({inverse(){return {};}});svg.setPointerCapture=()=>{};svg.focus=()=>{};$('#planPane').getBoundingClientRect=()=>({width:800,height:650});Object.defineProperty($('#planPane'),'clientWidth',{value:800});
 const dialog=$('#modal');dialog.showModal=()=>dialog.open=true;dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new window.Event('close'));};
 function pointer(target,type,x=0,y=0){const e=new window.Event(type,{bubbles:true});Object.assign(e,{button:0,clientX:x,clientY:y,pointerId:1,shiftKey:false});target.dispatchEvent(e);}
 await import('../public/studio/app.js');await new Promise(r=>setTimeout(r,30));
 assert.equal($('#home').hidden,false);assert.equal($('#homeActiveName').textContent,'晴川雅居 · 原创示例');$('#homeResume').onclick();assert.equal($('#home').hidden,true);
 assert.ok($('#objectCount').textContent.includes('25 面墙'));assert.equal(document.querySelectorAll('button.room-item').length,8);
 pointer($('#plan [data-kind="wall"][data-id="w0"]'),'pointerdown');pointer(svg,'pointerup');Object.defineProperty($('#wallAnchor'),'value',{value:'a',configurable:true});$('#wallLength').value='4200';$('#wallLength').onchange({target:$('#wallLength')});assert.equal(Number($('#wallLength').value),4200);
 Object.defineProperty($('#wallAnchor'),'value',{value:'a',configurable:true});$('#wallLength').value='2500';$('#wallLength').onchange({target:$('#wallLength')});assert.equal(Number($('#wallLength').value),4200);assert.ok($('#toast').textContent.includes('门窗超出'));
 $('#undoBtn').onclick();$('#furnitureTab').onclick();$('#furnitureSearch').value='沙发';$('#furnitureSearch').oninput({target:$('#furnitureSearch')});assert.equal(document.querySelector('[data-add-furniture="bed"]').hidden,true);document.querySelector('[data-add-furniture="sofa"]').onclick();assert.equal($('#propertiesTitle').textContent,'三人沙发');$('#fWidth').value='2600';$('#fWidth').onchange({target:$('#fWidth')});assert.equal(Number($('#fWidth').value),2600);assert.equal(Number($('#fDepth').value),900);
 $('#fSizeLock').onchange({target:{checked:true}});$('#fWidth').value='1300';$('#fWidth').onchange({target:$('#fWidth')});assert.equal(Number($('#fDepth').value),450);assert.equal(Number($('#fHeight').value),410);
 $('#fElevation').value='400';$('#fElevation').onchange({target:$('#fElevation')});document.querySelector('#propertiesContent [data-style="leather"]').onclick();$('#copyFurniture').onclick();assert.equal(Number($('#fWidth').value),1300);assert.equal(Number($('#fElevation').value),400);
 $('#fHeight').value='-1';$('#fHeight').onchange({target:$('#fHeight')});assert.equal(Number($('#fHeight').value),410);assert.ok($('#toast').textContent.includes('尺寸'));
 $('#resetFurnitureSize').onclick();assert.equal(Number($('#fWidth').value),2200);assert.equal(Number($('#fHeight').value),820);
 $('#rotateFurniture').onclick();assert.equal(Number($('#fRotation').value),90);$('#deleteSelected').onclick();
 $('#furnitureSearch').value='';$('#furnitureSearch').oninput({target:$('#furnitureSearch')});document.querySelector('[data-fcategory="灯饰"]').onclick();assert.equal(document.querySelectorAll('[data-add-furniture]:not([hidden])').length,3);document.querySelector('[data-add-furniture="pendant"]').onclick();assert.equal(Number($('#fElevation').value),2000);assert.equal(document.querySelectorAll('[data-add-furniture]').length,60);$('#deleteSelected').onclick();
 await $('#newBtn').onclick();assert.ok($('#objectCount').textContent.includes('0 面墙'));$('#rectangleBtn').onclick();$('#rectX').value='0';$('#rectY').value='0';$('#rectWidth').value='4000';$('#rectDepth').value='3000';$('#createRectangle').onclick();assert.ok($('#objectCount').textContent.includes('4 面墙'));
 document.querySelector('[data-tool="measure"]').onclick();pointer(svg,'pointerdown',15000,15000);pointer(svg,'pointerup');pointer(svg,'pointerdown',18000,19000);pointer(svg,'pointerup');assert.equal($('#propertiesTitle').textContent,'两点测量');assert.ok($('.measurement-value').textContent.includes('5000'));
 $('#exportBtn').onclick();$('#exportDxf').onclick();assert.ok((await lastBlob.text()).includes('5000 mm'));dialog.close();
 $('#commandBtn').onclick();$('#commandSearch').value='导出';$('#commandSearch').oninput();assert.equal(document.querySelectorAll('[data-command]').length,1);dialog.close();
 await $('#homeBtn').onclick();assert.equal($('#home').hidden,false);assert.ok(document.querySelectorAll('.project-card').length>=2);assert.ok($('.workspace').hasAttribute('inert'));$('#homeResume').onclick();assert.equal($('#home').hidden,true);assert.equal($('.workspace').hasAttribute('inert'),false);
 // Storage failure must not silently replace the active plan; retry preserves the edits.
 $('#projectName').value='保存失败仍需保留';$('#projectName').onchange({target:$('#projectName')});
 const originalOpen=factory.open;factory.open=()=>{throw Error('quota exceeded');};
 await $('#newBtn').onclick();assert.equal($('#projectName').value,'保存失败仍需保留');assert.equal($('#saveRecovery').hidden,false);assert.ok($('#backupAndSwitch'));$('#stayInProject').onclick();
 factory.open=originalOpen;await $('#retrySave').onclick();assert.equal($('#saveRecovery').hidden,true);assert.equal((await store.active()).name,'保存失败仍需保留');
 // End-to-end DOM integration: fitout edits, undo, budget pricing, saved JSON and CSV.
 document.querySelector('[data-tool="select"]').onclick();
 pointer($('#plan [data-kind="room"]'),'pointerdown');pointer(svg,'pointerup');
 const roomKey=$('#plan [data-kind="room"]').dataset.id;
 $('#inspector-fitout-drop').onchange({target:{value:'200'}});assert.equal(Number($('#inspector-fitout-drop').value),200);
 $('#undoBtn').onclick();pointer($('#plan [data-kind="room"]'),'pointerdown');pointer(svg,'pointerup');assert.equal(Number($('#inspector-fitout-drop').value),0);
 $('#inspector-fitout-drop').onchange({target:{value:'150'}});
 $('#budgetBtn').onclick();const price=$('[data-budget-row] [data-rate="material"]');price.value='100';price.onchange();assert.ok($('.budget-summary').textContent.includes('1,200.00'));
 $('#budgetUndo').onclick();assert.ok($('.budget-summary').textContent.includes('0.00'));
 const restoredPrice=$('[data-budget-row] [data-rate="material"]');restoredPrice.value='100';restoredPrice.onchange();$('#budgetExport').onclick();assert.ok((await lastBlob.text()).includes('主材单价'));dialog.close();
 await $('#retrySave').onclick();const saved=await store.active();assert.equal(saved.roomMeta[roomKey].fitout.ceiling.drop,150);assert.ok(Object.values(saved.budget.rates).some(r=>r.material===100));
 // Structure declaration, guarded edits, layers, undo and persistence.
 pointer($('#plan [data-kind="wall"]'),'pointerdown');pointer(svg,'pointerup');
 $('#wallStructure').onchange({target:{value:'bearing'}});assert.equal($('#deleteSelected').disabled,true);
 const protectedCount=$('#objectCount').textContent;$('#deleteSelected').onclick();assert.equal($('#objectCount').textContent,protectedCount);assert.ok($('#toast').textContent.includes('承重'));
 $('#structureToggle').onchange({target:{checked:true}});assert.ok(svg.innerHTML.includes('#aa4c3e')||svg.innerHTML.includes('#2c8971'));
 $('#roomsToggle').onchange({target:{checked:false}});assert.ok(!svg.textContent.includes('m² · 轴线'));$('#undoBtn').onclick();assert.ok(svg.textContent.includes('m² · 轴线'));
 await $('#retrySave').onclick();const structuralSaved=await store.active();assert.equal(structuralSaved.walls[0].structure,'bearing');assert.equal(structuralSaved.layers.structure,true);
 pointer($('#plan [data-kind="wall"]'),'pointerdown');pointer(svg,'pointerup');$('#wallStructure').onchange({target:{value:'partition'}});assert.ok($('#confirmStructure'));$('#keepStructure').onclick();assert.equal($('#deleteSelected').disabled,true);
 // Real app flow in English, without reloading or committing pending inputs.
 const {setLanguage}=await import('../public/studio/i18n.js?v=0.12.1');
 const waitLanguage=()=>new Promise(resolve=>setTimeout(resolve,0));
 $('#projectName').value='尚未提交的中文项目名';setLanguage('en');await waitLanguage();
 assert.equal($('#projectName').value,'尚未提交的中文项目名');assert.ok($('#exportBtn').textContent.includes('Export plans'));assert.equal(document.documentElement.lang,'en');
 $('#furnitureTab').onclick();await waitLanguage();document.querySelector('[data-fcategory="全部"]').onclick();$('#furnitureSearch').value='DISHWASHER';$('#furnitureSearch').oninput({target:$('#furnitureSearch')});assert.equal(document.querySelector('[data-add-furniture="dishwasher"]').hidden,false);assert.equal(document.querySelector('[data-add-furniture="sofa"]').hidden,true);
 document.querySelector('[data-add-furniture="dishwasher"]').onclick();await waitLanguage();assert.equal($('#propertiesTitle').textContent,'Dishwasher');$('#fWidth').value='650';$('#fWidth').onchange({target:$('#fWidth')});await waitLanguage();assert.equal(Number($('#fWidth').value),650);
 $('#budgetBtn').onclick();await waitLanguage();assert.equal($('#modalTitle').textContent,'Quantities & renovation budget');assert.ok($('.budget-table').textContent.includes('Material rate'));assert.ok($('.budget-table').textContent.includes('Dishwasher'));$('#budgetExport').onclick();assert.ok((await lastBlob.text()).includes('Material rate'));dialog.close();
 $('#aiRecognizeBtn').onclick();await waitLanguage();assert.ok($('#modalBody').textContent.includes('Recognize current reference'));dialog.close();
 $('#commandBtn').onclick();$('#commandSearch').value='EXPORT';$('#commandSearch').oninput();await waitLanguage();assert.ok(document.querySelectorAll('[data-command]').length>=1);dialog.close();
 $('#exportBtn').onclick();await waitLanguage();assert.ok($('#exportPrint').textContent.includes('Print to scale'));dialog.close();
 setLanguage('zh-CN');await waitLanguage();assert.ok($('#exportBtn').textContent.includes('导出图纸'));assert.equal($('#propertiesTitle').textContent,'洗碗机');
 const wasOpen=document.body.classList.contains('inspector-open');$('#inspectBtn').onclick();assert.equal(document.body.classList.contains('inspector-open'),!wasOpen);
});
