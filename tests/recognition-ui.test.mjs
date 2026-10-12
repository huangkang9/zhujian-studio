import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseHTML} from 'linkedom';
import {installRecognition} from '../public/studio/recognition-ui.js';
import {emptyProject} from '../public/studio/model.js';

test('AI review edits dimensions, protects the current project, and keeps BYOK out of storage',async()=>{
 const {window,document}=parseHTML('<dialog id="modal"><h2 id="modalTitle"></h2><div id="modalBody"></div></dialog>');
 const saved=new Map(),requests=[],messages=[];
 const sample=JSON.parse(fs.readFileSync(new URL('../public/studio/assets/showcase-recognition-sample.json',import.meta.url),'utf8'));
 Object.assign(globalThis,{window,document,localStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}});
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{get(){return this._value??this.querySelector('option[selected]')?.value??'';},set(v){this._value=v;},configurable:true});
 const $=s=>document.querySelector(s),dialog=$('#modal');dialog.close=()=>dialog.dispatchEvent(new window.Event('close'));
 globalThis.fetch=async(url,options)=>{requests.push({url,options});if(url==='/api/ai-status')return Response.json({configured:false});if(url.includes('sample.json'))return Response.json(sample);return Response.json({error:'测试接口未配置',code:'API_NOT_CONFIGURED'},{status:428});};
 const original=emptyProject();original.background={src:'data:image/png;base64,aGVsbG8=',x:0,y:0,w:6000,h:6000,rotation:0,opacity:.5};let loaded=null,view=null;
 const ui=installRecognition({project:()=>original,modal:(title,html)=>{$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;},load:p=>loaded=p,view:v=>view=v,toast:m=>messages.push(m),upload(){},download(){}});
 ui.open();assert.equal($('#aiCurrent').disabled,false);await $('#aiSample').onclick();
 assert.equal(document.querySelectorAll('[data-dimension]').length,10);assert.equal($('#aiCreateProject').disabled,true);
 $('#aiReviewAcknowledged').checked=true;$('#aiReviewAcknowledged').onchange({target:$('#aiReviewAcknowledged')});assert.equal($('#aiCreateProject').disabled,true);
 $('#aiClearOnly').onclick();const field=$('[data-ai-value]'),before=field.value;field.value='0';field.onchange();assert.equal(String(field.value),String(before));assert.match(messages.at(-1),/有效/);
 $('#aiReviewAcknowledged').checked=true;$('#aiReviewAcknowledged').onchange({target:$('#aiReviewAcknowledged')});assert.equal($('#aiCreateProject').disabled,false);await $('#aiCreateProject').onclick();
 assert.notEqual(loaded.id,original.id);assert.equal(original.walls.length,0);assert.equal(loaded.recognition.reviewed,true);assert.equal(loaded.background,null);assert.equal(view,'2d');
 ui.settings();$('#aiKey').value='test-key-never-persist';$('#aiSaveSettings').onclick();assert.ok(saved.has('zhujian-ai-settings'));assert.ok(!JSON.stringify([...saved]).includes('test-key-never-persist'));
 await $('#aiCurrent').onclick();assert.equal($('#modalTitle').textContent,'识别未完成');assert.equal(requests.filter(r=>r.url==='/api/recognize').length,1);assert.equal(JSON.parse(requests.at(-1).options.body).apiKey,'test-key-never-persist');
 ui.settings();$('#aiClearKey').onclick();$('#aiBack').onclick();await $('#aiCurrent').onclick();assert.equal(JSON.parse(requests.at(-1).options.body).apiKey,'');
});
