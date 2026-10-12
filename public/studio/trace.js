/** Real local image processing: dark, near-horizontal/vertical stroke candidates.
 * This does NOT read dimensions, identify doors, or claim semantic AI recognition.
 */
import {clamp,round} from './model.js?v=0.12';
export function detectLines(image,{threshold=100,minLength=55,gap=7,maxLines=70}={}){
 const {width:w,height:h,data}=image;if(!w||!h||!data||w*h>1800000)throw Error('图像尺寸无效或过大');
 const ink=new Uint8Array(w*h);
 for(let i=0;i<w*h;i++){const a=data[i*4+3]/255,g=(data[i*4]*.299+data[i*4+1]*.587+data[i*4+2]*.114)*a+255*(1-a);ink[i]=g<threshold?1:0;}
 const raw=[];
 function scan(vertical){const major=vertical?w:h,minor=vertical?h:w;
  for(let k=1;k<major-1;k+=2){let start=-1,last=-1,hits=0;
   const finish=()=>{const length=last-start+1;if(length>=minLength&&hits/length>.40)raw.push({axis:vertical?'v':'h',pos:k,start,end:last,weight:hits});start=last=-1;hits=0;};
   for(let j=1;j<minor-1;j++){
    // Neighbour tolerance follows small freehand deviations without closing large gaps.
    const x=vertical?k:j,y=vertical?j:k;
    const hit=ink[y*w+x]||ink[(y+(vertical?0:1))*w+x+(vertical?1:0)]||ink[(y-(vertical?0:1))*w+x-(vertical?1:0)];
    if(hit){if(start<0)start=j;last=j;hits++;}else if(start>=0&&j-last>gap)finish();
   }if(start>=0)finish();
  }
 }
 scan(false);scan(true);
 raw.sort((a,b)=>(b.end-b.start)-(a.end-a.start));const merged=[];
 for(const l of raw){let same=merged.find(m=>m.axis===l.axis&&Math.abs(m.pos-l.pos)<=9&&Math.min(m.end,l.end)-Math.max(m.start,l.start)>Math.min(m.end-m.start,l.end-l.start)*.6);
  if(same){same.pos=(same.pos*same.weight+l.pos*l.weight)/(same.weight+l.weight);same.weight+=l.weight;same.start=Math.min(same.start,l.start);same.end=Math.max(same.end,l.end);}else merged.push({...l});
 }
 const result=merged.filter(l=>l.end-l.start>=minLength).sort((a,b)=>(b.end-b.start)-(a.end-a.start)).slice(0,maxLines).map((l,i)=>({id:'trace'+i,a:l.axis==='h'?{x:l.start,y:l.pos}:{x:l.pos,y:l.start},b:l.axis==='h'?{x:l.end,y:l.pos}:{x:l.pos,y:l.end},selected:true}));
 // Join near orthogonal intersections to help close rooms. Large gaps stay explicit.
 for(let i=0;i<result.length;i++)for(let j=i+1;j<result.length;j++){const a=result[i],b=result[j],ah=Math.abs(a.a.y-a.b.y)<1,bh=Math.abs(b.a.y-b.b.y)<1;if(ah===bh)continue;const h=ah?a:b,v=ah?b:a,x=v.a.x,y=h.a.y;if(x>=h.a.x-12&&x<=h.b.x+12&&y>=v.a.y-12&&y<=v.b.y+12){for(const p of[h.a,h.b])if(Math.abs(p.x-x)<12)p.x=x;for(const p of[v.a,v.b])if(Math.abs(p.y-y)<12)p.y=y;}}
 return result;
}
export function pixelToWorld(point,bg,imageWidth,imageHeight){
 const x=bg.x+point.x/imageWidth*bg.w,y=bg.y+point.y/imageHeight*bg.h,cx=bg.x+bg.w/2,cy=bg.y+bg.h/2,a=bg.rotation*Math.PI/180;
 return {x:round(cx+(x-cx)*Math.cos(a)-(y-cy)*Math.sin(a)),y:round(cy+(x-cx)*Math.sin(a)+(y-cy)*Math.cos(a))};
}
