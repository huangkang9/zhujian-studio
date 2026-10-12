import {recognitionPrompt} from './prompt.mjs';
import {normalizeRecognition} from '../public/studio/recognition.js';
const MAX_BODY=8*1024*1024,MAX_REPLY=1024*1024;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
async function boundedText(body,max){const reader=body?.getReader();if(!reader)return '';let size=0,result='',decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('数据过大');}result+=decoder.decode(value,{stream:true});}return result+decoder.decode();}finally{reader.releaseLock();}}
function endpointURL(value,configured){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port)throw Error('API 地址需使用无账号参数的 HTTPS URL');const hostOK=['dashscope.aliyuncs.com','dashscope-intl.aliyuncs.com','api.openai.com'].includes(u.hostname)||/^[a-z0-9-]+\.(cn-beijing|ap-southeast-1)\.maas\.aliyuncs\.com$/i.test(u.hostname);const serverAllowed=configured&&u.href.replace(/\/$/,'')===configured.replace(/\/$/,'');if(!hostOK&&!serverAllowed)throw Error('自定义 API 域名需由站点管理员在 AI_BASE_URL 配置后使用');if(!/\/v1\/?$/.test(u.pathname))throw Error('API Base URL 应以 /v1 结尾');return u.href.replace(/\/$/,'')+'/chat/completions';}
export function configuration(env={}){return {configured:!!env.AI_API_KEY,baseURL:env.AI_BASE_URL||'https://dashscope.aliyuncs.com/compatible-mode/v1',model:env.AI_MODEL||'qwen3-vl-plus'};}
export async function recognizeRequest(request,{authorized=false,env={},fetcher=fetch}={}){
 if(!authorized)return json({error:'请先登录后使用 AI 识别'},401);
 if(request.method!=='POST')return json({error:'仅接受 POST'},405);
 const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return json({error:'请求来源不匹配'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'请提交 JSON'},415);
 if(Number(request.headers.get('content-length'))>MAX_BODY)return json({error:'图片请求过大，请缩小到 6 MB 以内'},413);
 let body,endpoint,key,model;
 try{body=JSON.parse(await boundedText(request.body,MAX_BODY));if(!body||typeof body.image!=='string'||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(body.image)||body.image.length>MAX_BODY-4096)throw Error('仅支持 PNG、JPG、WebP 图片，图片请求需小于 8 MB');
  const config=configuration(env),baseURL=typeof body.baseURL==='string'?body.baseURL:config.baseURL;endpoint=endpointURL(baseURL,env.AI_BASE_URL);
  const clientKey=typeof body.apiKey==='string'?body.apiKey.trim():'';
  if(!clientKey&&baseURL.replace(/\/$/,'')!==config.baseURL.replace(/\/$/,''))throw Error('更换接口地址时请提供该接口自己的 API Key');
  key=clientKey||env.AI_API_KEY;model=body.model||config.model;
  if(typeof model!=='string'||!/^[a-zA-Z0-9_./:-]{1,120}$/.test(model))throw Error('模型名称无效');
  if(key&&(typeof key!=='string'||key.length<10||key.length>500||/[\r\n]/.test(key)))throw Error('API Key 格式无效');
 }catch(e){return json({error:e.message==='数据过大'?'图片请求过大':e.message},400);}
 if(!key)return json({error:'尚未配置 API。可先查看示例尺寸审查，或在设置中填入自己的视觉模型 API Key。',code:'API_NOT_CONFIGURED'},428);
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),90000),cancel=()=>abort.abort();request.signal.addEventListener('abort',cancel,{once:true});
 try{
  const upstream=await fetcher(endpoint,{method:'POST',redirect:'error',headers:{'content-type':'application/json','authorization':'Bearer '+key},body:JSON.stringify({model,messages:[{role:'system',content:recognitionPrompt},{role:'user',content:[{type:'text',text:'识别这张带尺寸的房屋草图。仅返回指定 JSON；看不清的尺寸标为 uncertain，不能猜成准确值。'},{type:'image_url',image_url:{url:body.image}}]}],response_format:{type:'json_object'},max_tokens:7000,stream:false,...(/qwen/i.test(model)?{enable_thinking:false}:{})}),signal:abort.signal});
  if(!upstream.ok){await upstream.body?.cancel();return json({error:({401:'API Key 无效或与区域不匹配',403:'当前 API 无此模型权限',429:'API 额度或频率限制，请稍后再试',400:'模型或参数不兼容，请选支持图片和 JSON 输出的模型'})[upstream.status]||'识别服务暂时不可用',providerStatus:upstream.status},upstream.status===429?429:502);}
  let envelope;try{envelope=JSON.parse(await boundedText(upstream.body,MAX_REPLY));}catch{throw Error('模型响应过大或格式无效');}
  const choice=envelope.choices?.[0];if(choice?.finish_reason==='length')throw Error('识别结果被截断，请裁切到单层户型后再试');
  const content=choice?.message?.content;if(typeof content!=='string')throw Error('模型未返回可读取的 JSON');let raw;try{raw=JSON.parse(content.replace(/^\s*```(?:json)?\s*/i,'').replace(/\s*```\s*$/,''));}catch{throw Error('模型没有返回有效 JSON，请重试或更换模型');}
  const result=normalizeRecognition(raw);result.source='API 实时识别 / '+model;return json({recognition:result,source:'live-api',model});
 }catch(e){return json({error:abort.signal.aborted?'识别已取消或超过 90 秒，请重试':e.message==='fetch failed'?'无法连接所选 API 服务':e.message},502);}finally{clearTimeout(timer);request.signal.removeEventListener('abort',cancel);key=undefined;}
}
export {endpointURL};
