import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAnswerService } from './answer-service.mjs';
import { loadPassages } from './corpus.mjs';
import { timingSafeEqual } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export function createApp({answers=createAnswerService(),getPassages=loadPassages,fetchImpl=fetch,token=process.env.API_ACCESS_TOKEN,limit=30,maximum=2}={}) {
const app = express();
app.disable('x-powered-by');
const windows=new Map();let active=0;
app.use('/api',(request,response,next)=>{
  if(token){
    const supplied=Buffer.from(request.headers.authorization || ''),expected=Buffer.from('Bearer '+token);
    if(supplied.length!==expected.length || !timingSafeEqual(supplied,expected))return response.status(401).json({status:'error',reason_code:'unauthorized'});
  }
  const now=Date.now(),ip=request.ip;
  for(const [key,value] of windows)if(value.until<=now)windows.delete(key);
  if(!windows.has(ip) && windows.size>=1000)return response.status(429).json({status:'error',reason_code:'busy'});
  const bucket=windows.get(ip)||{count:0,until:now+60000};bucket.count++;windows.set(ip,bucket);
  if(bucket.count>limit){response.set('Retry-After','60');return response.status(429).json({status:'error',reason_code:'rate_limited'});}
  if(request.method==='POST'){
    if(active>=maximum)return response.status(503).json({status:'error',reason_code:'busy'});
    active++;let released=false;
    const release=()=>{if(!released){active--;released=true;}};
    response.once('finish',release);response.once('close',release);
  }
  next();
});
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_request, response) => {
  try {response.json({ok:true,service:'yojana-sahayak',corpus_documents:new Set(getPassages().map(p=>p.document_id)).size});}
  catch{response.status(503).json({ok:false,reason_code:'corpus_unavailable'});}
});

app.get('/api/ready',async(_request,response)=>{
  let count=0,model=false;
  try {count=new Set(getPassages().map(p=>p.document_id)).size;}catch{}
  try {
    const url=new URL(process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/chat');url.pathname='/api/tags';url.search='';
    const result=await fetchImpl(url,{signal:AbortSignal.timeout(2000)});
    const data=await result.json();
    model=result.ok && data.models?.some(item=>item.name===(process.env.OLLAMA_MODEL || 'qwen3:4b')) || false;
  }catch{}
  const ok=count>=10 && model;
  response.status(ok?200:503).json({ok,corpus_documents:count,required_documents:10,model_available:model,extractive_fallback:count>0});
});

app.post('/api/chat', async (request, response) => {
  try {
    const result = await answers.chat(request.body);
    response.status(result.status === 'invalid_request' ? 400 : 200).json(result);
  } catch (error) {
    console.error('Chat failed:', error instanceof Error ? error.message : 'unknown error');
    response.status(503).json({ status: 'error', reason_code: 'answer_service_unavailable', answer_text: 'The answer service is unavailable. Please try again.', citations: [] });
  }
});

app.post('/api/recommend', (request, response) => {
  const result = answers.recommend(request.body);
  response.status(result.status === 'invalid_request' ? 400 : 200).json(result);
});

app.get('/api/prep-status', async (_request, response) => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return response.status(503).json({ ok: false, message: 'Supabase variables are not configured yet.' });
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await supabase
      .from('hackathon_prep')
      .select('message')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Supabase prep read failed:', error.code || error.message);
      return response.status(502).json({ ok: false, message: 'Supabase read failed. Check the setup guide and service logs.' });
    }

    return response.json({ ok: true, message: data.message });
  } catch (error) {
    console.error('Supabase connection failed:', error instanceof Error ? error.message : 'unknown error');
    return response.status(502).json({ ok: false, message: 'Supabase connection failed. Check the hosting service network and variables.' });
  }
});

app.use(express.static(path.join(root, 'dist')));
app.use((request, response) => {
  if (request.path.startsWith('/api/')) {
    return response.status(404).json({ ok: false, message: 'Unknown API route.' });
  }
  return response.sendFile(path.join(root, 'dist', 'index.html'));
});
app.use((error,_request,response,_next)=>{
  response.status(error.type==='entity.too.large'?413:400).json({status:'invalid_request',reason_code:'invalid_json_or_request'});
});
return app;
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const host=process.env.HOST || '127.0.0.1',port=Number(process.env.PORT || 3000);
  if(!['127.0.0.1','localhost','::1'].includes(host) && !process.env.API_ACCESS_TOKEN)throw Error('Set API_ACCESS_TOKEN before exposing the API beyond localhost');
  createApp().listen(port,host,()=>console.log('Yojana Sahayak listening on '+host+':'+port));
}
