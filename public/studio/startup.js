// Restore saved work before opening a separate demo; never replace it silently.
export async function openWorkspace({vault,canRestore,restore,home,openExample,exampleRequested,onError}) {
 let saved;
 try { saved=await vault.active(); }
 catch(error) { onError(error); if(canRestore())await home(); return; }
 if(!canRestore())return;
 if(saved)restore(saved);
 if(exampleRequested) {
  // openExample uses the editor's save-before-switch and recovery flow.
  await openExample();
 } else await home();
}
