import {installCaseLibrary} from './case-library.js?v=0.13';
import {matches,locale} from './i18n.js?v=0.13';
import {clone,uid,emptyProject,demoProject,addRectangle,addWall,findRooms,bounds} from './model.js?v=0.13';
import {renderPlan,esc} from './plan.js?v=0.13';
import {icon} from './icons.js?v=0.13';
import {detectLines,pixelToWorld} from './trace.js?v=0.13';
const $=s=>document.querySelector(s);
export function installStudio(api){
 const {vault,modal,toast}=api;
 let traceWorker=null,traceRun=0,openingExample=false;
 const library=installCaseLibrary({...api,closeHome});
 const thumbnail=p=>{const b=bounds(p),pad=Math.max(b.w,b.h)*.08,view={x:b.x-pad,y:b.y-pad,w:b.w+pad*2,h:b.h+pad*2};return `<svg viewBox="${view.x} ${view.y} ${view.w} ${view.h}" aria-hidden="true">${renderPlan(p,{view,width:500,dims:false,furniture:true},{exporting:true})}</svg>`;};
 const relativeTime=t=>t?new Intl.DateTimeFormat(locale(),{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(t)):'未保存';
 async function home(){
  const el=$('#home');el.hidden=false;document.body.dataset.home='true';document.querySelectorAll('.header,.workflow,.workspace,.statusbar').forEach(n=>n.setAttribute('inert',''));$('.skip-link').href='#homeResume';$('#homeResume').focus();
  $('#homeArtwork').innerHTML=thumbnail(demoProject());
  $('#homeActiveName').textContent=api.getProject().name;
  library.render();
  await api.persist();await renderProjects();
 }
 function closeHome(){ $('#home').hidden=true;delete document.body.dataset.home;document.querySelectorAll('.header,.workflow,.workspace,.statusbar').forEach(n=>n.removeAttribute('inert'));$('.skip-link').href='#plan';$('#projectName').focus(); }
 async function example(){
  if(openingExample)return false;
  openingExample=true;$('#homeExample').disabled=true;
  try {
   if(await api.load(demoProject())===false)return false;
   closeHome();
   if(globalThis.location){const url=new URL(location.href);if(url.searchParams.get('demo')==='showcase'){url.searchParams.delete('demo');try{window.history.replaceState(null,'',url.href);}catch{}}}
   api.view('split');return true;
  }finally{openingExample=false;$('#homeExample').disabled=false;}
 }
 async function renderProjects(){
  const el=$('#projectCards');let items=[];try{items=await vault.list();}catch{el.innerHTML='<p class="quiet">浏览器存储不可用，仍可通过 JSON 文件打开和保存项目。</p>';return;}
  el.innerHTML=items.length?items.map(p=>`<article class="project-card"><button class="project-preview" data-project="${esc(p.id)}" aria-label="打开 ${esc(p.name)}">${thumbnail(p)}</button><div class="project-card-meta"><button data-i18n-user class="project-card-title" data-project="${esc(p.id)}">${esc(p.name)}</button><span>${findRooms(p).length} 个空间 · ${relativeTime(p.updatedAt)}</span><div class="project-card-actions"><button data-copy-project="${esc(p.id)}">复制方案</button><button data-delete-project="${esc(p.id)}" aria-label="删除 ${esc(p.name)}">${icon('trash',15)}</button></div></div></article>`).join(''):'<p class="quiet">从上方创建第一个项目。你的方案会自动出现在这里。</p>';
  el.querySelectorAll('[data-project]').forEach(b=>b.onclick=async()=>{try{const p=await vault.get(b.dataset.project);if(p){if(await api.load(p)!==false)closeHome();}}catch(e){toast(e.message);}});
  el.querySelectorAll('[data-copy-project]').forEach(b=>b.onclick=async()=>{const p=await vault.get(b.dataset.copyProject);p.id=uid('project');p.name+=' · 副本';try{await vault.save(p);renderProjects();toast('方案副本已创建');}catch(e){toast('保存失败，请下载 JSON 备份');}});
  el.querySelectorAll('[data-delete-project]').forEach(b=>b.onclick=()=>{modal('删除本机项目副本',`<p>此操作删除项目列表中的本机副本。已下载的 JSON 文件不会被删除。</p><button id="confirmDeleteProject" class="danger-action">删除副本</button>`);$('#confirmDeleteProject').onclick=async()=>{try{const removingCurrent=api.getProject().id===b.dataset.deleteProject;if(removingCurrent&&!await api.persist())throw Error('保存失败');await vault.remove(b.dataset.deleteProject);if(removingCurrent){const remaining=await vault.list();await api.replaceActive(remaining[0]||emptyProject());}$('#modal').close();await renderProjects();}catch(e){toast('删除未成功，请重试');}};});
 }
 async function showCases(){await home();$('#caseLibrary').scrollIntoView({behavior:reducedMotion()?'instant':'smooth'});}
 async function projects(){await home();$('#projectShelf').scrollIntoView({behavior:reducedMotion()?'instant':'smooth'});}
 function rectangle(){
  const center=api.center();modal('创建一个有尺度的房间',`<p>输入墙体轴线尺寸，生成四面相连的墙。适合快速起稿，也可以继续添加隔墙。</p><div class="field-row"><div class="field"><label for="rectWidth">宽度 / mm</label><input id="rectWidth" type="number" min="500" max="100000" value="4000"></div><div class="field"><label for="rectDepth">进深 / mm</label><input id="rectDepth" type="number" min="500" max="100000" value="3500"></div></div><div class="field-row"><div class="field"><label for="rectX">起点 X / mm</label><input id="rectX" type="number" value="${Math.round(center.x-2000)}"></div><div class="field"><label for="rectY">起点 Y / mm</label><input id="rectY" type="number" value="${Math.round(center.y-1750)}"></div></div><button id="createRectangle" class="primary wide">创建房间 ${icon('arrow',16)}</button>`);
  $('#createRectangle').onclick=()=>{if(api.mutate(()=>addRectangle(api.getProject(),{x:+$('#rectX').value,y:+$('#rectY').value,width:+$('#rectWidth').value,depth:+$('#rectDepth').value}))){$('#modal').close();api.fit();toast('已创建房间，可继续改尺寸或画隔墙');}};
 }
 async function trace(){
  const project=api.getProject(),bg=project.background;if(!bg){toast('请先在底图面板导入一张草图');api.showSketch();return;}
  const source=clone(bg),defaults=clone(project.defaults),baseName=project.name;
  modal('从草图中提取线条',`<p>在本机提取接近水平／垂直的深色线条。点击候选线可排除尺寸线和误识别；确认后生成一个新方案。</p><div class="trace-controls"><label>深色阈值 <input id="traceThreshold" type="range" min="40" max="190" value="105"></label><label>最短线条 <input id="traceMin" type="range" min="25" max="180" value="60"></label><button id="rerunTrace">重新提取</button></div><div id="tracePreview" class="trace-preview" aria-busy="true">正在读取图片…</div><div class="trace-footer"><span id="traceCount" role="status"></span><button id="traceSelectAll">全选</button><button id="traceSelectNone">全不选</button></div><p class="property-note">${source.calibrated?'底图已校准；仍需逐段核对实测尺寸。':'底图尚未校准，候选尺寸仅为初稿比例。'} 此功能不识别手写数字、门窗或房间用途，不是完整 AI 户型识别。</p><button id="acceptTrace" class="primary wide" disabled>作为新方案导入</button>`);
  $('#modal').classList.add('wide-modal');let imageData,lines=[],w,h;
  const im=new Image();try{await new Promise((resolve,reject)=>{im.onload=resolve;im.onerror=reject;im.src=source.src;});const factor=Math.min(1,1000/Math.max(im.width,im.height)),canvas=document.createElement('canvas');w=canvas.width=Math.round(im.width*factor);h=canvas.height=Math.round(im.height*factor);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0,w,h);imageData=ctx.getImageData(0,0,w,h);}catch(e){if($('#tracePreview'))$('#tracePreview').textContent='无法读取底图，请重新上传 JPG 或 PNG。';return;}
  if(!$('#tracePreview'))return;
  const render=()=>{
   const selected=lines.filter(l=>l.selected).length;$('#traceCount').textContent=`${selected} / ${lines.length} 条候选已选中`;
   $('#acceptTrace').disabled=!selected;
   $('#tracePreview').innerHTML=`<svg viewBox="0 0 ${w} ${h}" aria-label="候选线预览，点击线条切换是否导入"><image href="${esc(source.src)}" width="${w}" height="${h}"/><g>${lines.map(l=>`<g data-trace="${l.id}" role="button" tabindex="0" aria-label="候选线 ${l.id.replace('trace','')}，${l.selected?'已选':'未选'}"><line x1="${l.a.x}" y1="${l.a.y}" x2="${l.b.x}" y2="${l.b.y}" stroke="transparent" stroke-width="16"/><line x1="${l.a.x}" y1="${l.a.y}" x2="${l.b.x}" y2="${l.b.y}" stroke="${l.selected?'#167b65':'#a35b3c'}" stroke-width="3" opacity="${l.selected?1:.5}"/></g>`).join('')}</g></svg>`;
   $('#tracePreview').setAttribute('aria-busy','false');
   $('#tracePreview').querySelectorAll('[data-trace]').forEach(g=>{const toggle=()=>{lines.find(l=>l.id===g.dataset.trace).selected=!lines.find(l=>l.id===g.dataset.trace).selected;render();};g.onclick=toggle;g.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}};});
  };
  const run=async()=>{
   const runId=++traceRun;$('#rerunTrace').disabled=true;$('#acceptTrace').disabled=true;$('#traceCount').textContent='提取中…';const options={threshold:+$('#traceThreshold').value,minLength:+$('#traceMin').value};
   try{if(typeof Worker!=='undefined'){traceWorker?.terminate();traceWorker=new Worker('./trace-worker.js?v=0.13',{type:'module'});lines=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('提取超时，请缩小图片重试')),15000);traceWorker.onmessage=e=>{clearTimeout(timer);e.data.error?reject(Error(e.data.error)):resolve(e.data.lines);};traceWorker.onerror=()=>{clearTimeout(timer);reject(Error('浏览器无法启动图像处理，请换用手工描图'));};traceWorker.postMessage({image:{width:w,height:h,data:imageData.data},options});});}else lines=detectLines(imageData,options);if(runId!==traceRun||!$('#tracePreview'))return;render();if(!lines.length)$('#traceCount').textContent='没有找到足够长的线条，可提高阈值或降低最短线条。';}catch(e){if($('#traceCount'))$('#traceCount').textContent=e.message;}finally{if($('#rerunTrace'))$('#rerunTrace').disabled=false;}
  };
  $('#rerunTrace').onclick=run;$('#traceSelectAll').onclick=()=>{lines.forEach(l=>l.selected=true);render();};$('#traceSelectNone').onclick=()=>{lines.forEach(l=>l.selected=false);render();};
  $('#acceptTrace').onclick=async()=>{let draft=emptyProject(),skipped=0;draft.name=baseName+' · 线条初稿';draft.background=source;draft.defaults=defaults;draft.notes='本地线条提取初稿。需核对墙体、门窗和每段实测尺寸。';for(const l of lines.filter(l=>l.selected)){const trial=clone(draft);try{addWall(trial,pixelToWorld(l.a,source,w,h),pixelToWorld(l.b,source,w,h));draft=trial;}catch{skipped++;}}if(!draft.walls.length){toast('没有可导入的有效墙线，请调整候选或底图比例');return;}if(await api.load(draft)===false)return;$('#modal').close();api.fit();api.showSketch();toast(`已生成 ${draft.walls.length} 段墙体${skipped?'，'+skipped+' 条候选需手工处理':''}，请校正尺寸`);};run();
 }
 function command(){
  const actions=[['参考户型库',showCases,'项目'],['导入你的户型',library.importCenter,'项目'],['回到项目主页',()=>home(),'项目'],['新建空白户型',async()=>{if(await api.createBlank()!==false)closeHome();},'项目'],['从原始手绘草图开始',async()=>{if(await api.startSketch()!==false)closeHome();},'绘图'],['创建矩形房间',rectangle,'绘图'],['本地草图线条提取',trace,'绘图'],['添加门',()=>api.tool('door'),'绘图'],['添加窗',()=>api.tool('window'),'绘图'],['测量两点距离',()=>api.tool('measure'),'绘图'],['打开家具库',api.showFurniture,'布置'],['切换二维 / 三维对照',()=>api.view('split'),'视图'],['查看完整三维',()=>api.view('3d'),'视图'],['回到二维平面',()=>api.view('2d'),'视图'],['装修用量与预算清单',api.budget,'交付'],['图纸检查与问题定位',api.checks,'交付'],['导出尺寸图',api.export,'交付'],['保存 JSON 项目',api.save,'交付']];
  modal('你想做什么？',`<input id="commandSearch" type="search" placeholder="搜索操作，例如：门、测量、导出" aria-label="搜索操作"><div id="commandResults" class="command-results"></div>`);
  const render=()=>{const q=$('#commandSearch').value.trim();$('#commandResults').innerHTML=actions.map(([name,action,category],i)=>({name,category,i})).filter(a=>matches(a.name,q)||matches(a.category,q)).map(a=>`<button data-command="${a.i}"><span>${a.name}</span><small>${a.category}</small></button>`).join('')||'<p class="quiet">没有匹配的操作。</p>';$('#commandResults').querySelectorAll('button').forEach(b=>b.onclick=()=>{$('#modal').close();actions[+b.dataset.command][1]();});};$('#commandSearch').oninput=render;$('#commandSearch').onkeydown=e=>{if(e.key==='ArrowDown'){e.preventDefault();$('#commandResults button')?.focus();}if(e.key==='Enter')$('#commandResults button')?.click();};render();$('#commandSearch').focus();
 }
 $('#homeBtn').onclick=home;$('#projectsBtn').onclick=projects;$('#commandBtn').onclick=command;$('#rectangleBtn').onclick=rectangle;$('#homeResume').onclick=closeHome;$('#homeStart').onclick=async()=>{if(await api.startSketch()!==false)closeHome();};$('#homeBlank').onclick=async()=>{if(await api.createBlank()!==false)closeHome();};$('#homeOpen').onclick=library.importCenter;$('#homeUpload').onclick=library.importCenter;
 $('#modal').addEventListener('close',()=>{$('#modal').classList.remove('wide-modal');traceWorker?.terminate();traceRun++;});
 $('#homeExample').onclick=example;$('#homeCases').onclick=showCases;$('#caseLibraryBtn').onclick=showCases;
 return {home,closeHome,projects,rectangle,trace,command,example,importCenter:library.importCenter,showCases};
}
export function reducedMotion(){return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;}
