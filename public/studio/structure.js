/** User-declared structure, never inferred from wall thickness or sketch recognition. */
export const structureNames={unknown:'待核实',partition:'非承重（手动标记）',bearing:'承重（手动标记）'};
export const defaultLayers={dims:true,furniture:true,rooms:true,grid:true,structure:false};
export function normalizeStructure(p){
 for(const w of p.walls)if(w.structure!==undefined&&!Object.hasOwn(structureNames,w.structure))throw Error('墙体结构类型无效');
 if(p.layers!==undefined){if(!p.layers||typeof p.layers!=='object'||Array.isArray(p.layers))throw Error('图层设置无效');for(const key of Object.keys(defaultLayers))if(p.layers[key]!==undefined&&typeof p.layers[key]!=='boolean')throw Error('图层开关无效');p.layers={...defaultLayers,...Object.fromEntries(Object.keys(defaultLayers).filter(k=>p.layers[k]!==undefined).map(k=>[k,p.layers[k]]))};}
 return p;
}
export function assertStructurePreserved(before,after){
 const nodes=new Map(after.nodes.map(n=>[n.id,n])),oldNodes=new Map(before.nodes.map(n=>[n.id,n]));
 const openingShape=o=>[o.id,o.type,o.wall,o.offset,o.width,o.height,o.sill];
 for(const w of before.walls.filter(w=>w.structure==='bearing')){
  const next=after.walls.find(x=>x.id===w.id);
  // Changing the declaration itself is an explicit, separate UI operation.
  if(next&&next.structure!=='bearing')continue;
  const changed=!next||['a','b','height','thickness'].some(k=>w[k]!==next[k])||[w.a,w.b].some(id=>!nodes.has(id)||['x','y'].some(k=>nodes.get(id)[k]!==oldNodes.get(id)[k]));
  const holes=p=>p.openings.filter(o=>o.wall===w.id).map(openingShape).sort((a,b)=>a[0].localeCompare(b[0]));
  if(changed||JSON.stringify(holes(before))!==JSON.stringify(holes(after)))throw Error('承重墙已保护：不能移动、改尺寸、删除或改动洞口；请先核实结构资料。');
 }
}
