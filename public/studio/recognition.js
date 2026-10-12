import {emptyProject,normalizeProject,findRooms,openingValid,pointInPolygon} from './model.js?v=0.12';
const validId=v=>typeof v==='string'&&/^[a-zA-Z0-9_.-]{1,64}$/.test(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<1e6;
const clean=(v,max=200)=>String(v??'').slice(0,max);
export function normalizeRecognition(raw){
 if(!raw||raw.schemaVersion!==1||!Array.isArray(raw.nodes)||!Array.isArray(raw.walls)||!Array.isArray(raw.dimensions))throw Error('识别结果格式无效，需要 schemaVersion 1、nodes、walls、dimensions');
 if(raw.nodes.length<3||raw.nodes.length>300||raw.walls.length>300||raw.dimensions.length>200)throw Error('识别结果节点或墙体数量超出范围');
 const ids=new Set();const nodes=raw.nodes.map(n=>{if(!validId(n.id)||ids.has(n.id)||!finite(n.x)||!finite(n.y))throw Error('识别节点无效');ids.add(n.id);return {id:n.id,x:n.x,y:n.y};});
 const wids=new Set();const walls=raw.walls.map(w=>{if(!validId(w.id)||wids.has(w.id)||!ids.has(w.a)||!ids.has(w.b)||w.a===w.b)throw Error('识别墙体引用无效');wids.add(w.id);return {id:w.id,a:w.a,b:w.b,alignment:['horizontal','vertical','free'].includes(w.alignment)?w.alignment:'free'};});
 const dids=new Set();const dimensions=raw.dimensions.map(d=>{if(!validId(d.id)||dids.has(d.id)||!ids.has(d.from)||!ids.has(d.to)||d.from===d.to||!['x','y'].includes(d.axis)||!finite(d.value)||d.value<=0)throw Error('识别尺寸引用或数字无效');dids.add(d.id);return {id:d.id,from:d.from,to:d.to,axis:d.axis,value:d.value,unit:['m','cm','mm','unknown'].includes(d.unit)?d.unit:'unknown',label:clean(d.label),certainty:d.certainty==='clear'?'clear':'uncertain',enabled:d.enabled!==false,confirmed:d.confirmed===true};});
 const openings=(raw.openings||[]);if(!Array.isArray(openings)||openings.length>100)throw Error('门窗识别数量无效');
 const oids=new Set();const parsedOpenings=openings.map(o=>{if(!validId(o.id)||oids.has(o.id)||!wids.has(o.wall)||!['door','window'].includes(o.type)||![o.offset,o.width].every(finite)||o.offset<0||o.width<100)throw Error('识别门窗无效');oids.add(o.id);return {id:o.id,wall:o.wall,type:o.type,offset:o.offset,width:o.width,enabled:o.enabled===true,certainty:o.certainty==='clear'?'clear':'uncertain',note:clean(o.note)};});
 const labels=Array.isArray(raw.roomLabels)?raw.roomLabels.filter(r=>finite(r.x)&&finite(r.y)).slice(0,100).map(r=>({x:r.x,y:r.y,name:clean(r.name,40)})):[];
 return {schemaVersion:1,title:clean(raw.title,80)||'草图识别户型',nodes,walls,dimensions,openings:parsedOpenings,roomLabels:labels,warnings:Array.isArray(raw.warnings)?raw.warnings.slice(0,100).map(v=>clean(v,500)):[],source:clean(raw.source,120)||'API 图像识别'};
}
class AxisSolver{
 constructor(nodes,axis){this.axis=axis;this.nodes=nodes;this.parent=new Map(nodes.map(n=>[n.id,n.id]));this.weight=new Map(nodes.map(n=>[n.id,0]));}
 find(id){const parent=this.parent.get(id);if(parent===id)return {root:id,offset:0};const p=this.find(parent),offset=this.weight.get(id)+p.offset;this.parent.set(id,p.root);this.weight.set(id,offset);return {root:p.root,offset};}
 connect(a,b,delta){const x=this.find(a),y=this.find(b);if(x.root===y.root)return {ok:Math.abs(y.offset-x.offset-delta)<=1,error:y.offset-x.offset-delta};this.parent.set(y.root,x.root);this.weight.set(y.root,delta+x.offset-y.offset);return {ok:true,error:0};}
 values(){const groups=new Map();for(const n of this.nodes){const f=this.find(n.id),g=groups.get(f.root)||[];g.push({id:n.id,offset:f.offset,anchor:n[this.axis]-f.offset});groups.set(f.root,g);}const out=new Map();for(const g of groups.values()){const anchor=g.reduce((v,n)=>v+n.anchor,0)/g.length;for(const n of g)out.set(n.id,Math.round(anchor+n.offset));}return out;}
}
export function dimensionMM(d){const factor={m:1000,cm:10,mm:1}[d.unit];return factor?d.value*factor:null;}
export function compileRecognition(input,{wallThickness=200,wallHeight=2800}={}){
 const raw=normalizeRecognition(input),x=new AxisSolver(raw.nodes,'x'),y=new AxisSolver(raw.nodes,'y'),nodes=new Map(raw.nodes.map(n=>[n.id,n])),issues=[],dimensions=[];
 for(const w of raw.walls){if(w.alignment==='horizontal')y.connect(w.a,w.b,0);if(w.alignment==='vertical')x.connect(w.a,w.b,0);}
 for(const d of raw.dimensions){const mm=dimensionMM(d);let status='applied',error=0;
  if(!d.enabled)status='excluded';else if(mm===null)status='unit-required';else if(mm<100||mm>100000)status='out-of-range';else if(d.certainty!=='clear'&&!d.confirmed)status='review-required';
  else{const a=nodes.get(d.from),b=nodes.get(d.to),sign=b[d.axis]>=a[d.axis]?1:-1,result=(d.axis==='x'?x:y).connect(d.from,d.to,sign*mm);if(!result.ok){status='conflict';error=Math.round(Math.abs(result.error));}}
  dimensions.push({...d,mm,status,error});if(!['applied','excluded'].includes(status))issues.push({id:d.id,status,text:`${d.label||d.id}：${{conflict:'与其他尺寸矛盾，相差 '+error+' mm','unit-required':'请确认单位','out-of-range':'尺寸范围 100～100000 mm','review-required':'标注不清，请核对后确认'}[status]}`});
 }
 const xs=x.values(),ys=y.values(),p=emptyProject();p.name=raw.title+' · 待复核';p.defaults.thickness=wallThickness;p.defaults.height=wallHeight;p.nodes=raw.nodes.map(n=>({id:n.id,x:xs.get(n.id),y:ys.get(n.id)}));p.walls=raw.walls.map(w=>({id:w.id,a:w.a,b:w.b,thickness:wallThickness,height:wallHeight}));
 p.openings=raw.openings.filter(o=>o.enabled).map(o=>({id:o.id,wall:o.wall,type:o.type,offset:o.offset,width:o.width,height:o.type==='door'?2100:1400,sill:o.type==='door'?0:900,openAngle:65,flip:false}));
 for(const w of p.walls){const a=p.nodes.find(n=>n.id===w.a),b=p.nodes.find(n=>n.id===w.b);if(Math.hypot(a.x-b.x,a.y-b.y)<100)issues.push({id:w.id,status:'geometry',text:'尺寸调整后存在短于 100 mm 的墙，请复核'});}
 for(const o of p.openings){const error=openingValid(p,o);if(error)issues.push({id:o.id,status:'opening',text:error});}
 const seedRooms=findRooms({...p,nodes:raw.nodes}),rooms=findRooms(p);
 rooms.forEach((r,i)=>{const seed=seedRooms.find(s=>s.key===r.key),labels=seed?raw.roomLabels.filter(label=>pointInPolygon(label,seed.points)):[];p.roomMeta[r.key]={name:labels.length===1?labels[0].name:'待确认空间 '+(i+1),color:['#eae5d8','#e4eadc','#e4ece5','#eee5d8'][i%4]};});
 p.recognition={raw,dimensions,source:raw.source,reviewed:false,defaultsAssumed:true};p.notes='来自草图识别。墙厚、墙高和未标注尺寸为暂定值。未作施工复核。\n'+raw.warnings.join('\n');
 return {project:normalizeProject(p),dimensions,issues,warnings:raw.warnings,canImport:issues.length===0};
}
