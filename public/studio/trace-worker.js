import {detectLines} from './trace.js?v=0.12.1';
self.onmessage=({data})=>{try{self.postMessage({lines:detectLines(data.image,data.options)});}catch(e){self.postMessage({error:e.message});}};
