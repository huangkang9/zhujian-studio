import {getChatGPTUser} from '../../chatgpt-auth';
import {configuration} from '../../../ai/service.mjs';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();if(!user)return Response.json({error:'请先登录'},{status:401});return Response.json(configuration({AI_API_KEY:process.env.AI_API_KEY,AI_BASE_URL:process.env.AI_BASE_URL,AI_MODEL:process.env.AI_MODEL}),{headers:{'Cache-Control':'private, no-store'}});}
