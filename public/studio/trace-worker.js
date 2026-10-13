import {detectLines} from './trace.js?v=0.13';
self.onmessage=({data})=>{try{self.postMessage({lines:detectLines(data.image,data.options)});}catch(e){self.postMessage({error:e.message});}};
