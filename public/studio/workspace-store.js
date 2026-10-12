import {clone,normalizeProject,uid} from './model.js?v=0.12';
/** Each project is a separate IndexedDB record. Legacy key `last` remains readable. */
export class ProjectStore {
 constructor(factory=globalThis.indexedDB){this.factory=factory;this.queue=Promise.resolve();}
 open(){return new Promise((resolve,reject)=>{if(!this.factory)return reject(Error('浏览器存储不可用'));const r=this.factory.open('zhujian-studio',2);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('projects'))r.result.createObjectStore('projects');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('请关闭其他旧版页面后重试'));});}
 async transact(mode,fn){const db=await this.open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('projects',mode),store=tx.objectStore('projects');let result;fn(store,v=>result=v);tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('存储事务中止'));});}finally{db.close();}}
 save(project){const p=clone(project);p.id=p.id||uid('project');p.updatedAt=Date.now();const job=()=>this.transact('readwrite',(s)=>{s.put(p,'project:'+p.id);s.put(p.id,'activeProjectId');s.put(p,'last');});this.queue=this.queue.catch(()=>{}).then(job);return this.queue;}
 async active(){return this.transact('readonly',(s,done)=>{const request=s.get('last');request.onsuccess=()=>done(request.result?normalizeProject(request.result):null);});}
 async list(){return this.transact('readonly',(s,done)=>{const items=[];const r=s.openCursor();r.onsuccess=()=>{const c=r.result;if(!c){done(items.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0)));return;}if(String(c.key).startsWith('project:'))try{items.push(normalizeProject(c.value));}catch{}c.continue();};});}
 async remove(id){await this.queue.catch(()=>{});return this.transact('readwrite',s=>{s.delete('project:'+id);const r=s.get('last');r.onsuccess=()=>{if(r.result?.id===id){s.delete('last');s.delete('activeProjectId');}};});}
 async get(id){return this.transact('readonly',(s,done)=>{const r=s.get('project:'+id);r.onsuccess=()=>done(r.result?normalizeProject(r.result):null);});}
}
