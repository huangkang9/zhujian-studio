import {getChatGPTUser} from '../../chatgpt-auth';
import {recognizeRequest} from '../../../ai/service.mjs';
export const dynamic='force-dynamic';
export async function POST(request:Request){const user=await getChatGPTUser();return recognizeRequest(request,{authorized:!!user,env:{AI_API_KEY:process.env.AI_API_KEY,AI_BASE_URL:process.env.AI_BASE_URL,AI_MODEL:process.env.AI_MODEL}});}
