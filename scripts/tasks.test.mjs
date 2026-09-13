import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const helper={};new Function('exports',compile(await readFile('services/taskRequest.ts','utf8')))(helper);
const source=await readFile('services/dbService.ts','utf8');
function service(rows=[{id:42}],failure=null){
 const calls=[];const query={};
 for(const method of ['select','eq','order','update','delete','insert'])query[method]=(...args)=>{calls.push([method,...args]);return query;};
 query.abortSignal=async()=>({data:rows,error:failure});
 const supabase={auth:{getSession:async()=>({data:{session:{user:{id:'fixture'}}}})},from:table=>{calls.push(['from',table]);return query;}};
 const api={};new Function('require','exports',compile(source))(name=>name.includes('taskRequest')?helper:name.includes('supabaseClient')?{supabase}:name.includes('strains')?{STRAIN_DATABASE:[]}: {},api);
 return {api,calls};
}
test('production bigint task IDs are valid as numbers and strings; placeholders are distinct',()=>{
 assert.equal(helper.persistedTaskId(42),'42');assert.equal(helper.persistedTaskId('42'),'42');assert.equal(helper.persistedTaskId('local_42'),null);assert.equal(helper.persistedTaskId(null),null);
});
test('tapping numeric task ID writes completion and undo to database',async()=>{
 const {api,calls}=service();assert.equal(await api.toggleTaskCompletion(42,true),true);assert.equal(await api.toggleTaskCompletion('42',false),true);
 assert.deepEqual(calls.filter(c=>c[0]==='update'),[['update',{is_completed:true}],['update',{is_completed:false}]]);
 assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='id'&&c[2]==='42'));
});
test('missing or rejected task updates are never reported as successful',async()=>{
 assert.equal(await service([]).api.toggleTaskCompletion(42,true),false);
 await assert.rejects(service(null,new Error('offline')).api.toggleTaskCompletion(42,true),/offline/);
 const {api,calls}=service();assert.equal(await api.toggleTaskCompletion('local_42',true),false);assert.equal(calls.length,0);
});
test('task reload preserves notes, recurrence, completion, and future dates',async()=>{
 const {api,calls}=service([{id:42,title:'Test task',notes:'Keep this note',recurrence:'weekly',due_date:'2099-01-01',is_completed:true}]);
 const [task]=await api.getPendingTasksForToday();assert.equal(task.id,'42');assert.equal(task.notes,'Keep this note');assert.equal(task.recurrence,'weekly');assert.equal(task.isCompleted,true);assert.equal(task.dueDate,'2099-01-01');assert.ok(!calls.some(c=>c[1]==='is_completed'));
});
test('task edits map due date and one-time label to database columns',async()=>{
 const {api,calls}=service();await api.updateTaskProperties(42,{title:'Edited',notes:'Saved',recurrence:'once',dueDate:'2099-01-01',user_id:'forged'});
 assert.deepEqual(calls.find(c=>c[0]==='update')[1],{title:'Edited',notes:'Saved',recurrence:null,due_date:'2099-01-01'});
});
test('network deadline releases UI and aborts query',async()=>{
 let signal;await assert.rejects(helper.taskRequest(s=>{signal=s;return new Promise(()=>{});},10),/too long/);assert.equal(signal.aborted,true);
});
test('global rejection handling cannot destroy root or inject stack HTML',async()=>{
 const source=await readFile('index.tsx','utf8');assert.doesNotMatch(source,/document\.body\.innerHTML/);assert.match(source,/app-operation-error/);
});
