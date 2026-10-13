import {cases,caseProject,caseInfo,importProject} from './case-catalog.js?v=0.13';
import {bounds,findRooms,clone} from './model.js?v=0.13';
import {renderPlan,esc} from './plan.js?v=0.13';
import {drawingChecks} from './drawing-checks.js?v=0.13';
import {matches} from './i18n.js?v=0.13';
const $=s=>document.querySelector(s);
export function filterCases(items,{query='',beds='all',area='all',sort='featured'}={}){
 const ranges={small:[0,60],medium:[60,90],large:[90,120],extra:[120,Infinity]},range=ranges[area]||[0,Infinity];
 return items.filter(c=>(beds==='all'||c.beds===Number(beds))&&c.area>=range[0]&&c.area<range[1]&&matches([c.name,c.en,...c.tags].join(' '),query)).sort((a,b)=>sort==='small'?a.area-b.area:sort==='large'?b.area-a.area:Number(!!b.featured)-Number(!!a.featured));
}
export function caseThumbnail(p,{dims=false,width=400}={}){const b=bounds(p),pad=Math.max(b.w,b.h)*.1,view={x:b.x-pad,y:b.y-pad,w:b.w+pad*2,h:b.h+pad*2};return `<svg viewBox="${view.x} ${view.y} ${view.w} ${view.h}" aria-hidden="true">${renderPlan(p,{view,width,dims,furniture:true},{exporting:true})}</svg>`;}
export function installCaseLibrary(api){
 let items=null,limit=9,busy=false,importRun=0;
 const thumbnails=new Map();
 const getItems=()=>items||(items=cases.map(caseInfo));
 const preview=(p,dims=false)=>caseThumbnail(p,{dims,width:750});
 function render(){
  const list=filterCases(getItems(),{query:$('#caseSearch').value,beds:$('#caseBeds').value,area:$('#caseArea').value,sort:$('#caseSort').value});
  $('#caseCount').textContent=`${list.length} / ${cases.length}`;
  $('#caseCards').innerHTML=list.slice(0,limit).map(c=>{if(!thumbnails.has(c.id))thumbnails.set(c.id,caseThumbnail(caseProject(c.id)));return `<article class="case-card"><button class="case-drawing" data-case="${c.id}" aria-label="${esc('预览户型：'+c.name)}"><span class="case-number">${String(cases.findIndex(x=>x.id===c.id)+1).padStart(2,'0')}</span>${thumbnails.get(c.id)}<span class="case-preview-label">预览户型 ↗</span></button><div class="case-meta"><div class="case-title"><h3>${esc(c.name)}</h3><strong>${c.area.toFixed(1)} <small>m²</small></strong></div><p class="case-tags">${c.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</p><button data-case="${c.id}" class="case-detail-link">查看与使用 →</button></div></article>`;}).join('')||'<div class="case-empty"><p>没有匹配的户型，试试其他筛选。</p><button id="caseReset">清除筛选</button></div>';
  $('#caseMore').hidden=limit>=list.length;
  $('#caseCards').querySelectorAll('[data-case]').forEach(b=>b.onclick=()=>detail(caseProject(b.dataset.case),cases.find(c=>c.id===b.dataset.case)));
  if($('#caseReset'))$('#caseReset').onclick=reset;
 }
 function reset(){for(const id of ['caseBeds','caseArea'])$('#'+id).value='all';$('#caseSearch').value='';$('#caseSort').value='featured';limit=9;render();}
 async function openProject(p){if(busy)return false;busy=true;try{if(await api.load(p)===false)return false;$('#modal').close();api.closeHome();api.view('2d');return true;}finally{busy=false;}}
 function detail(project,item=null){
  const issues=drawingChecks(project),area=findRooms(project).reduce((a,r)=>a+r.area,0);
  api.modal(item?'参考户型预览':'导入项目预览',`<div class="case-detail"><div><div id="caseLargePlan" class="case-large-plan">${preview(project,true)}</div><label class="case-check"><input type="checkbox" id="caseDims" checked> 显示尺寸</label></div><div class="case-detail-copy"><span class="case-eyebrow">${item?'ORIGINAL COLLECTION':'YOUR PROJECT'}</span><h3 data-i18n-user>${esc(project.name)}</h3><p class="case-area">${area.toFixed(1)} <small>m²</small></p><p>墙体轴线围合面积</p><div class="case-facts"><span>${findRooms(project).length} 个空间</span><span>${project.walls.length} 面墙</span><span>${project.furniture.length} 件家具</span></div><p class="case-note">${item?'原创参考案例，不是实测或施工图。打开后可编辑尺寸、门窗、材质和家具。':'导入为独立副本，不覆盖同名或同编号的已有项目。'}</p>${!item?`<p class="case-note">图纸检查：${issues.errors} 项错误 · ${issues.warnings} 项提醒</p>`:''}<label class="case-check"><input id="caseFurnished" type="checkbox" checked> 保留家具布置</label><button id="caseUse" class="primary wide">${item?'使用此户型':'确认导入'}</button><button id="caseDownload" class="subtle-btn wide">下载项目 JSON</button><p class="case-note">打开前先保存当前方案。尺寸为毫米，导入后请复核。</p></div></div>`);
  $('#modal').classList.add('case-modal');
  const selected=()=>{const p=clone(project);if(!$('#caseFurnished').checked)p.furniture=[];return p;};
  const redraw=()=>$('#caseLargePlan').innerHTML=preview(selected(),$('#caseDims').checked);
  $('#caseDims').onchange=redraw;$('#caseFurnished').onchange=redraw;
  $('#caseUse').onclick=async()=>{const b=$('#caseUse'),p=selected();b.disabled=true;try{await openProject(p);}catch(e){api.toast(e.message);}finally{b.disabled=false;}};
  $('#caseDownload').onclick=()=>api.download(JSON.stringify(selected(),null,2),'zhujian-floorplan.json','application/json');
 }
 async function readImport(file){
  if(!file)return;const run=++importRun;
  const status=$('#caseImportStatus');if(status)status.textContent='正在读取文件…';
  try{
   if(/\.json$/i.test(file.name)){
    if(file.size>25*1024*1024)throw Error('项目文件不能超过 25 MB');
    const project=importProject(JSON.parse(await file.text()));if(run!==importRun)return;detail(project);
   }else if(/\.(png|jpe?g|webp)$/i.test(file.name)||/^image\/(png|jpeg|webp)$/.test(file.type)){
    if(file.size>20*1024*1024)throw Error('请选择小于 20 MB 的图片');
    if(await api.importImage(file,{asProject:true,canApply:()=>run===importRun})){if(run!==importRun)return;$('#modal').close();api.closeHome();api.view('2d');}else if(run===importRun&&$('#caseImportStatus')===status){status.textContent='导入失败';}
   }else throw Error('支持筑间 JSON、JPG、PNG 和 WebP；DWG、DXF 和 PDF 暂不支持导入。');
  }catch(e){if(run!==importRun)return;const text='导入失败：'+e.message;if(status&&$('#caseImportStatus')===status)status.textContent=text;else api.toast(text);}
 }
 function importCenter(){
  api.modal('导入你的户型',`<div class="case-import"><p>选择文件，或拖放到下方区域。导入后保存在你的空间档案，仅当前浏览器可见。</p><div id="caseDrop" class="case-drop"><span class="case-import-icon" aria-hidden="true">↥</span><h3>把你的方案带进来</h3><p>JSON · JPG · PNG · WebP</p><button id="caseChoose" class="primary">选择文件</button><input id="caseImportFile" type="file" accept=".json,image/jpeg,image/png,image/webp" hidden></div><p id="caseImportStatus" class="case-import-status" role="status" aria-live="polite"></p><div class="case-import-help"><div><strong>筑间项目 JSON</strong><p>恢复可编辑墙体、门窗与家具，最大 25 MB。</p></div><div><strong>户型图片</strong><p>创建独立底图方案，最大 20 MB。先两点校准再描图；AI 识别需要配置 API。</p></div></div><p class="case-note">图片不会自动变成准确墙体。DWG、DXF 和 PDF 暂不支持导入。</p></div>`);
  $('#modal').classList.add('case-modal');$('#caseChoose').onclick=()=>$('#caseImportFile').click();$('#caseImportFile').onchange=e=>{const file=e.target.files[0];e.target.value='';readImport(file);};
  const drop=$('#caseDrop');drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag-over');};drop.ondragleave=()=>drop.classList.remove('drag-over');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('drag-over');if(e.dataTransfer.files.length!==1){$('#caseImportStatus').textContent='每次请选择一个文件。';return;}readImport(e.dataTransfer.files[0]);};
 }
 for(const id of ['caseBeds','caseArea','caseSort'])$('#'+id).onchange=()=>{limit=9;render();};
 $('#caseSearch').oninput=()=>{limit=9;render();};$('#caseMore').onclick=()=>{limit+=9;render();};$('#caseImport').onclick=importCenter;
 $('#modal').addEventListener('close',()=>{importRun++;$('#modal').classList.remove('case-modal');});
 return {render,detail,importCenter,readImport};
}
