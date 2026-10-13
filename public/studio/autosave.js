import {clone} from './model.js?v=0.13';
/** Revision-aware saves: completion of an older write cannot mark newer edits saved. */
export class Autosave {
 constructor(store,onState=()=>{},delay=450){this.store=store;this.onState=onState;this.delay=delay;this.revision=0;this.savedRevision=0;this.pending=null;this.timer=null;this.flight=null;}
 get dirty(){return this.savedRevision<this.revision;}
 mark(project,schedule=true){this.pending=clone(project);this.revision++;clearTimeout(this.timer);this.onState('pending');if(schedule)this.timer=setTimeout(()=>this.flush(),this.delay);}
 async flush(){
  clearTimeout(this.timer);if(!this.dirty)return true;
  const revision=this.revision;if(this.flight?.revision===revision)return this.flight.promise;
  const snapshot=this.pending;this.onState('saving');
  const promise=(async()=>{try{await Promise.resolve().then(()=>this.store.save(snapshot));this.savedRevision=Math.max(this.savedRevision,revision);if(this.revision===revision)this.onState('saved');return true;}catch(error){if(this.revision===revision)this.onState('error',error);return false;}finally{if(this.flight?.revision===revision)this.flight=null;}})();
  this.flight={revision,promise};return promise;
 }
}
