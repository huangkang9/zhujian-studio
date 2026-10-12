/** Snap to physical wall faces, with exact constrained intersections for Shift. */
export function snapMeasurement(p,point,{tolerance=100,anchor=null,shift=false,enabled=true}={}){
 let q={x:point.x,y:point.y};const axis=anchor&&shift?(Math.abs(q.x-anchor.x)>=Math.abs(q.y-anchor.y)?'y':'x'):null;
 if(axis)q[axis]=anchor[axis];if(!enabled)return q;
 const nodes=new Map(p.nodes.map(n=>[n.id,n]));let best=null,bestDistance=tolerance;
 for(const w of p.walls){const a=nodes.get(w.a),b=nodes.get(w.b),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(!len)continue;
  for(const sign of[-1,1]){const start={x:a.x-dy/len*w.thickness/2*sign,y:a.y+dx/len*w.thickness/2*sign};let t;
   if(axis){const delta=axis==='x'?dx:dy;if(Math.abs(delta)<1e-8){if(Math.abs(start[axis]-q[axis])>1e-6)continue;t=((q.x-start.x)*dx+(q.y-start.y)*dy)/(len*len);}else t=(q[axis]-start[axis])/delta;if(t<0||t>1)continue;}
   else t=Math.max(0,Math.min(1,((q.x-start.x)*dx+(q.y-start.y)*dy)/(len*len)));
   // Openings at the measurement height have no solid wall face.
   if(p.openings.some(o=>o.wall===w.id&&o.sill<=0&&t*len>o.offset&&t*len<o.offset+o.width))continue;
   const hit={x:start.x+dx*t,y:start.y+dy*t},distance=Math.hypot(hit.x-q.x,hit.y-q.y);if(distance<bestDistance){best=hit;bestDistance=distance;}
  }
 }
 return best||q;
}
