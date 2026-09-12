import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const compile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const exports = {};
new Function('require', 'exports', compile(await readFile('services/edgeRequest.ts', 'utf8')))(
  name => name.includes('config') ? {CONFIG:{}} : {}, exports);
const session = {access_token:'test-token',user:{id:'same-user'}};
const requester = overrides => exports.createEdgeRequester({session:async()=>session,refresh:async()=>({data:{session}}),fetch:async()=>new Response('{"ok":true}'),url:'https://test.invalid',key:'public-test-key',...overrides});
test('preserves image MIME and JWT in a single request',async()=>{
  const image='data:image/png;base64,iVBORw0KGgo=';
  const r=requester({fetch:async(url,init)=>{assert.equal(JSON.parse(init.body).image,image);assert.equal(init.headers.Authorization,'Bearer test-token');return new Response('{"ok":true}');}});
  assert.deepEqual(await r({image},100),{ok:true});
});
test('refreshes a rejected JWT once with the same identity',async()=>{
  let calls=0,refresh=0;
  const r=requester({refresh:async()=>{refresh++;return {data:{session:{...session,access_token:'new'}}};},fetch:async(url,init)=>{
    if(++calls===1)return new Response('{}',{status:401});
    assert.equal(init.headers.Authorization,'Bearer new');return new Response('{"ok":true}');
  }});
  await r({},100);assert.equal(calls,2);assert.equal(refresh,1);
});
test('refuses a different identity after refresh',async()=>{
  let calls=0;
  const r=requester({refresh:async()=>({data:{session:{...session,user:{id:'other'}}}}),fetch:async()=>{calls++;return new Response('{}',{status:401});}});
  await assert.rejects(r({},100),/saved app session/);assert.equal(calls,1);
});
test('permanent errors and outages are not replayed as inference',async()=>{
  for(const status of [400,403,429,503]){
    let calls=0;
    const r=requester({fetch:async()=>{calls++;return new Response('{"error":"Actual reason","code":"specific"}',{status});}});
    await assert.rejects(r({},100), e=>e.message==='Actual reason'&&e.status===status&&e.code==='specific');
    assert.equal(calls,1);
  }
});
test('deadline releases caller even if session initialization hangs',async()=>{
  let calls=0;
  const r=requester({session:()=>new Promise(()=>{}),fetch:async()=>{calls++;}});
  await assert.rejects(r({},10),/too long/);assert.equal(calls,0);
});
test('deadline aborts the transport without replay',async()=>{
  let signal,calls=0;
  const r=requester({fetch:async(url,init)=>{signal=init.signal;calls++;return new Promise(()=>{});}});
  await assert.rejects(r({},10),/too long/);assert.equal(signal.aborted,true);assert.equal(calls,1);
});
test('already cancelled requests never reach the network',async()=>{
  let calls=0;const controller=new AbortController();controller.abort();
  const r=requester({fetch:async()=>{calls++;}});
  await assert.rejects(r({},100,controller.signal),{name:'AbortError'});assert.equal(calls,0);
});
test('photo service preserves MIME and successful report text verbatim',async()=>{
  const service={};let body;
  const report={diagnosis:'Fixture report',healthScore:62,severity:'low',topAction:'Fixture action'};
  new Function('require','exports',compile(await readFile('services/geminiService.ts','utf8')))(name=>name.includes('edgeRequest')?{requestEdge:async b=>{body=b;return {result:JSON.stringify(report)};}}:name.includes('config')?{CONFIG:{MODELS:{}}}:{},service);
  assert.deepEqual(await service.diagnosePlant('data:image/png;base64,iVBORw0KGgo=',{}),report);
  assert.equal(body.image,'data:image/png;base64,iVBORw0KGgo=');
});

test('malformed video output settles each provider attempt exactly once',async()=>{
  let serve,attempts=0;const settled=[];
  const client={auth:{getUser:async()=>({data:{user:{id:'fixture'}}})},rpc:async(name,args)=>{
    if(name==='finalize_ai_usage')settled.push(args);
    return {data:[{allowed:true}]};
  }};
  const core={RequestValidationError:class extends Error{},MODEL_ROUTING:{video_visual_analysis:'primary',fallback:'fallback'},modelListForMode:()=>['primary','fallback'],buildMessages:()=>[],validateRequestBody:()=>{},parseVideoResult:text=>{if(text==='bad')throw new Error('Malformed JSON');return {unchanged:text};}};
  new Function('require','exports','Deno','fetch',compile(await readFile('supabase/functions/gemini-v3/index.ts','utf8')))(
    name=>name.includes('supabase')?{createClient:()=>client}:core,{},
    {env:{get:()=> 'test'},serve:fn=>{serve=fn;}},async url=>url.includes('revenuecat')?new Response(JSON.stringify({items:[{entitlement_id:'entl05530ace9d'}]})):new Response(JSON.stringify({choices:[{message:{content:++attempts===1?'bad':'good'}}],usage:{cost:0.001,prompt_tokens:10,completion_tokens:5}})));
  const result=await serve(new Request('https://test.invalid',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify({mode:'video_visual_analysis'})}));
  assert.equal(result.status,200);assert.deepEqual(await result.json(),{result:{unchanged:'good'}});
  assert.equal(attempts,2);assert.equal(settled.length,2);
  assert.ok(settled.every(s=>s.p_actual_or_estimated_cost_usd===0.001&&s.p_output_tokens===5));
});
