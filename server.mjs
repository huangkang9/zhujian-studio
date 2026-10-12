import {recognizeRequest,configuration} from './ai/service.mjs';
// Loopback-only local development server. Serves public/studio plus AI routes.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'public/studio');
const port=Number(process.env.PORT||8080);
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
http.createServer(async(req,res)=>{try{
const address='http://localhost:'+port,route=new URL(req.url,address).pathname;
if(route==='/api/ai-status'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(configuration(process.env)));return;}
if(route==='/api/recognize'){
 const expectedHosts=new Set(['localhost:'+port,'127.0.0.1:'+port]);if(!expectedHosts.has(req.headers.host)){res.writeHead(403);res.end('Invalid host');return;}
 const url='http://'+req.headers.host+req.url;let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024){res.writeHead(413);res.end('{"error":"图片过大"}');return;}chunks.push(chunk);}
 const request=new Request(url,{method:req.method,headers:req.headers,body:req.method==='POST'?Buffer.concat(chunks):undefined});const response=await recognizeRequest(request,{authorized:true,env:process.env});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());return;
}
const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),target=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(target!==root&&!target.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}const bytes=await fs.readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(bytes);}catch(e){res.writeHead(404);res.end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`筑间已启动：http://localhost:${port}\n使用 Ctrl+C 关闭服务。`));
