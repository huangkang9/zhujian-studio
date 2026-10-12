import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {parseHTML} from 'linkedom';
import {t,setLanguage,getLanguage,installLanguage,localizeMarkup,matches} from '../public/studio/i18n.js?v=0.12';
import {english} from '../public/studio/locales/en.js?v=0.12';
import {demoProject,normalizeProject} from '../public/studio/model.js';import {svgString,dxfString} from '../public/studio/export.js';import {printDocument} from '../public/studio/print-sheet.js';import {budgetCSV} from '../public/studio/budget.js';
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('source phrase catalog covers every static Chinese phrase in application modules',()=>{
 const root=new URL('../public/studio/',import.meta.url);for(const name of fs.readdirSync(root).filter(n=>/\.(js|html)$/.test(n)&&n!=='i18n.js')){const source=fs.readFileSync(new URL(name,root),'utf8');for(const word of source.match(/[\u3400-\u9fff]+/g)||[])assert.ok(english[word],name+': '+word);}
 assert.equal(t('三人沙发','en'),'Three-seat sofa');assert.equal(t('已添加三人沙发','en'),'Added Three-seat sofa');assert.equal(matches('三人沙发','SOFA'),true);assert.equal(matches('导出图纸','export'),true);
});
test('switching changes text and accessibility labels but keeps handlers, option values, pending inputs and user text',async()=>{
 setLanguage('zh-CN');const{document}=parseHTML('<html lang="zh-CN"><body><button data-language-switch translate="no">EN</button><button id="add" title="添加家具">添加家具</button><input id="name" value="墙体" placeholder="项目名称"><span data-i18n-user>墙体</span><select><option>全部</option><option>厨房</option></select><div id="live"></div></body></html>');
 let clicks=0;const add=document.querySelector('#add');add.onclick=()=>clicks++;const ui=installLanguage(document);const option=document.querySelectorAll('option')[1];document.querySelector('#name').value='未提交的项目名';setLanguage('en');
 assert.equal(add.textContent,'Add furniture');assert.equal(add.title,'Add furniture');assert.equal(option.textContent,'Kitchen');assert.equal(option.value,'厨房');assert.equal(document.querySelector('input').value,'未提交的项目名');assert.equal(document.querySelector('[data-i18n-user]').textContent,'墙体');add.onclick();assert.equal(clicks,1);assert.equal(document.documentElement.lang,'en');
 document.querySelector('#live').innerHTML='<label>顶面与踢脚线 <input placeholder="待填"></label>';await tick();assert.ok(document.querySelector('#live').textContent.includes('Ceiling & skirting'));assert.equal(document.querySelector('#live input').placeholder,'Not entered');
 setLanguage('zh-CN');assert.equal(add.textContent,'添加家具');assert.equal(option.textContent,'厨房');setLanguage('en');assert.equal(add.textContent,'Add furniture');ui.disconnect();setLanguage('zh-CN');
});
test('language persistence tolerates denied browser storage',()=>{const old=globalThis.localStorage;let saved;globalThis.localStorage={setItem:(key,value)=>saved={key,value}};setLanguage('en');assert.deepEqual(saved,{key:'zhujian-language',value:'en'});globalThis.localStorage={setItem(){throw Error('blocked');}};assert.doesNotThrow(()=>setLanguage('zh-CN'));assert.equal(getLanguage(),'zh-CN');globalThis.localStorage=old;});
test('English SVG, DXF, print and CSV preserve names, units, geometry and original JSON',()=>{
 const p=demoProject();p.name='厨房';for(const meta of Object.values(p.roomMeta))meta.name='墙体';p.furniture[0].name='客户自定义沙发';const before=JSON.stringify(p);setLanguage('en');
 const svg=svgString(p),dxf=dxfString(p),print=printDocument(p),csv=budgetCSV(p);
 assert.ok(svg.includes('Centerline'));assert.ok(svg.includes('厨房'));assert.ok(svg.includes('墙体'));assert.ok(dxf.includes('客户自定义沙发'));assert.ok(dxf.includes('Millimeter')||dxf.includes('Unit mm'));assert.ok(print.includes('lang="en"'));assert.ok(print.includes('厨房'));assert.ok(csv.includes('Material rate'));assert.ok(csv.includes('客户自定义沙发'));assert.ok(csv.includes('墙体'));assert.ok(csv.includes('CNY'));assert.equal(JSON.stringify(p),before);assert.doesNotThrow(()=>normalizeProject(p));setLanguage('zh-CN');assert.ok(budgetCSV(p).includes('主材单价'));
});
test('export markup skips user content and inline scripts/styles without altering numeric attributes',()=>{setLanguage('en');const source='<svg viewBox="0 0 100 200"><text data-i18n-user>墙体<tspan>厨房</tspan></text><text>墙体</text></svg><style>/*墙体*/</style>';const out=localizeMarkup(source);assert.ok(out.includes('viewBox="0 0 100 200"'));assert.ok(out.includes('>墙体<tspan>厨房</tspan>'));assert.ok(out.includes('<text>Wall</text>'));assert.ok(out.includes('/*墙体*/'));setLanguage('zh-CN');});
