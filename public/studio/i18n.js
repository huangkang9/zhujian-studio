import {english} from './locales/en.js?v=0.12';
const phraseKeys=Object.keys(english).sort((a,b)=>b.length-a.length);
function translatePhrase(word){if(Object.hasOwn(english,word))return english[word];let rest=word;const parts=[];while(rest){const key=phraseKeys.find(key=>rest.startsWith(key));if(!key)return undefined;parts.push(english[key]);rest=rest.slice(key.length);}return parts.join(' ');}
const key='zhujian-language';let language='zh-CN';
try{if(globalThis.localStorage?.getItem(key)==='en')language='en';}catch{}
export const getLanguage=()=>language;
export const locale=()=>language==='en'?'en-US':'zh-CN';
export function t(value,lang=language){
 const source=String(value??'');if(lang!=='en')return source;
 if(Object.hasOwn(english,source))return english[source];
 return source.replace(/[\u3400-\u9fff]+/g,(word,offset)=>{const out=translatePhrase(word);if(out===undefined)return word;const a=source[offset-1]||'',b=source[offset+word.length]||'';return (/[\w]/.test(a)?' ':'')+out+(/[\w]/.test(b)?' ':'');}).replace(/[，。；：、（）「」／～]/g,c=>({'，':', ','。':'.','；':'; ','：':': ','、':', ','（':' (','）':')','「':'“','」':'”','／':' / ','～':'–'}[c]));
}
export const matches=(text,query)=>{const q=String(query).trim().toLocaleLowerCase();return [String(text),t(text,'en')].some(s=>s.toLocaleLowerCase().includes(q));};
/** Localize generated HTML/SVG exports, keeping user-marked elements verbatim. */
export function localizeMarkup(markup,lang=language){
 if(lang!=='en')return markup;const stack=[];let skipped=0;
 return markup.split(/(<[^>]*>)/g).map(part=>{
  if(!part.startsWith('<'))return skipped?part:t(part,lang);
  const closing=part.match(/^<\/([\w:-]+)/),opening=part.match(/^<([\w:-]+)/);
  if(closing){const item=stack.pop();if(item?.skip)skipped--;return part;}
  if(!opening)return part;const name=opening[1].toLowerCase(),skip=!!skipped||/data-i18n-user|translate="no"/.test(part)||['style','script'].includes(name);
  if(!/\/>$/.test(part)&&!['meta','input','link','br','hr','img','source'].includes(name)){stack.push({skip});if(skip)skipped++;}
  if(skip)return part;return part.replace(/(aria-label|title|alt)="([^"]*)"/g,(_,attr,value)=>`${attr}="${t(value,lang).replace(/"/g,'&quot;')}"`);
 }).join('');
}
export function setLanguage(value){language=value==='en'?'en':'zh-CN';try{globalThis.localStorage?.setItem(key,language);}catch{}for(const update of listeners)update();return language;}
const listeners=new Set();
const excluded='[data-i18n-user], [translate="no"], script, style, textarea, code';
/** Translate presentation nodes only. Never change input values, model IDs or data attributes. */
export function installLanguage(doc=document){
 const originals=new WeakMap(),attributes=new WeakMap();let observer;
 const ignore=node=>node?.closest?.(excluded);
 function visit(root){
  if(root.nodeType===3){const parent=root.parentElement;if(!parent||ignore(parent))return;
   // HTML option values otherwise track translated text and corrupt category/filter IDs.
   if(parent.tagName==='OPTION'&&!parent.hasAttribute('value'))parent.setAttribute('value',parent.textContent);
   const current=root.nodeValue,old=originals.get(root);const source=old&&current===old.output?old.source:current;const output=t(source);originals.set(root,{source,output});if(current!==output)root.nodeValue=output;return;
  }
  if(root.nodeType!==1&&root.nodeType!==9&&root.nodeType!==11)return;if(root.nodeType===1&&ignore(root))return;
  if(root.nodeType===1){let saved=attributes.get(root);if(!saved)attributes.set(root,saved={});for(const attr of['title','placeholder','aria-label','alt']){if(!root.hasAttribute(attr))continue;const current=root.getAttribute(attr),old=saved[attr],source=old&&current===old.output?old.source:current,output=t(source);saved[attr]={source,output};if(current!==output)root.setAttribute(attr,output);}}
  for(const child of [...root.childNodes])visit(child);
 }
 function controls(){if(doc.documentElement.lang!==language)doc.documentElement.lang=language;doc.querySelectorAll('[data-language-switch]').forEach(button=>{const label=language==='en'?'中文':'EN',hint=language==='en'?'切换为中文':'Switch to English';if(button.textContent!==label)button.textContent=label;for(const attr of['aria-label','title'])if(button.getAttribute(attr)!==hint)button.setAttribute(attr,hint);button.onclick=()=>setLanguage(language==='en'?'zh-CN':'en');});}
 function refresh(){observer?.disconnect();visit(doc.documentElement);controls();observe();}
 function observe(){observer?.observe(doc.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label','alt']});}
 const Observer=doc.defaultView?.MutationObserver||globalThis.MutationObserver;
 if(Observer)observer=new Observer(records=>{observer.disconnect();for(const record of records){if(record.type==='childList'){for(const n of record.addedNodes)visit(n);}else visit(record.target);}controls();observe();});
 listeners.add(refresh);refresh();return{refresh,disconnect(){observer?.disconnect();listeners.delete(refresh);}};
}
