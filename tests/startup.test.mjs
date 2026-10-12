import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {ProjectStore} from '../public/studio/workspace-store.js';
import {emptyProject,addRectangle,demoProject} from '../public/studio/model.js';
import {openWorkspace} from '../public/studio/startup.js';

async function fixture(){
 const vault=new ProjectStore(new IDBFactory()),old=emptyProject();
 old.name='Previous edited plan';addRectangle(old,{x:0,y:0,width:4300,depth:3100});
 await vault.save(old);return {vault,old};
}
test('returning visitors see the showcase home while their previous plan remains available',async()=>{
 const {vault,old}=await fixture();let active=demoProject(),home=false;
 await openWorkspace({vault,canRestore:()=>true,restore:p=>active=p,home:async()=>{home=true;await vault.save(active);},openExample:()=>assert.fail('must not replace saved work'),exampleRequested:false,onError:assert.fail});
 assert.equal(home,true);assert.equal(active.id,old.id);assert.deepEqual((await vault.get(old.id)).nodes,old.nodes);
});
test('explicit demo entry preserves the old plan and switches to a new showcase project',async()=>{
 const {vault,old}=await fixture();let active=demoProject();
 await openWorkspace({vault,canRestore:()=>true,restore:p=>active=p,home:()=>assert.fail('direct entry should open demo'),openExample:async()=>{await vault.save(active);active=demoProject();await vault.save(active);},exampleRequested:true,onError:assert.fail});
 assert.notEqual(active.id,old.id);assert.equal(active.demoVersion,12);assert.equal(active.walls.length,25);
 assert.deepEqual((await vault.get(old.id)).nodes,old.nodes);assert.equal((await vault.active()).id,active.id);
});
test('late restore never overrides an interaction made while storage was loading',async()=>{
 const {vault}=await fixture();await openWorkspace({vault,canRestore:()=>false,restore:()=>assert.fail(),home:()=>assert.fail(),openExample:()=>assert.fail(),exampleRequested:true,onError:assert.fail});
});
test('unreadable storage shows home without replacing an unknown saved plan',async()=>{
 let warned=false,home=false;
 await openWorkspace({vault:{active:async()=>{throw Error('blocked');}},canRestore:()=>true,restore:()=>assert.fail(),home:()=>{home=true;},openExample:()=>assert.fail(),exampleRequested:true,onError:()=>warned=true});
 assert.equal(warned,true);assert.equal(home,true);
});
