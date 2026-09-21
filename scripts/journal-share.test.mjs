import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const compile=(s,mocks={})=>{const out={};new Function('require','exports',ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>mocks[n]||{},out);return out;};
const {journalShareSummary: share}=compile(await readFile('services/journalShare.ts','utf8'));
const {mediaSelectionError}=compile(await readFile('services/mediaSelection.ts','utf8'));
const {isSavedReportImage}=compile(await readFile('services/shareMedia.ts','utf8'),{'./config':{CONFIG:{SUPABASE_URL:'https://project.supabase.co'}}});
const db=compile((await readFile('services/dbService.ts','utf8'))+'\nexport {mapJournalRow};');
test('saved image and video metadata survive database readback, using the stored media URL',()=>{
 for(const kind of ['photo','video']){
  const row={id:'saved',entry_type:'diagnosis',content:'Original report',media_url:'https://project.supabase.co/storage/v1/object/public/user_uploads/user/journal/photo.jpg',ai_analysis:kind==='photo'?{diagnosisData:{diagnosis:'Recorded result',healthScore:82}}:{shareSummary:{kind,headline:'Recorded result',score:82}}};
  const mapped=db.mapJournalRow(row);
  assert.deepEqual(share(mapped),{kind,headline:'Recorded result',score:82,imageUrl:row.media_url});
  assert.equal(mapped.notes,'Original report');assert.equal(mapped.aiAnalysis.summary,undefined);
 }
});
test('older formatted video and photo reports share their recorded score without inventing a score',()=>{
 assert.deepEqual(share({notes:'Video Plant Health Report: Mixed visual condition (63/100, 35% confidence)\n\nSummary: Original'}),{kind:'video',headline:'Mixed visual condition',score:63,imageUrl:undefined});
 assert.equal(share({notes:'🌿 **MasterGrowbot Diagnosis**\n🩺 **Diagnosis**: Recorded photo\n❤️ **Health Score**: 0/100 (Analyzed)'}).score,0);
 assert.equal(share({notes:'Ordinary note with 82/100'}),null);
 assert.equal(share({notes:'Video Plant Health Report: Old result (35% confidence)'}),null);
});
test('invalid and missing saved scores cannot produce misleading share cards',()=>{
 for(const score of [-1,101,NaN,undefined,'82'])assert.equal(share({shareSummary:{kind:'video',headline:'Result',score}}),null);
 assert.equal(share({shareSummary:{kind:'other',headline:'Result',score:82}}),null);
 assert.equal(share({shareSummary:{kind:'photo',headline:'',score:82}}),null);
});
test('camera cancellation is neutral; permission and plugin errors remain actionable',()=>{
 assert.equal(mediaSelectionError(new Error('User cancelled photos app')),null);
 assert.equal(mediaSelectionError({message:'User canceled'}),null);
 assert.match(mediaSelectionError(new Error('Permission denied')),/Settings/);
 assert.match(mediaSelectionError(new Error('Plugin unavailable')),/try again/);
});
test('saved image decoding permits only the configured storage bucket, with no outside hosts',()=>{
 assert.equal(isSavedReportImage('https://project.supabase.co/storage/v1/object/public/user_uploads/u/journal/1.jpg'),true);
 for(const url of ['https://evil.example/image.jpg','https://project.supabase.co.evil.example/storage/v1/object/public/user_uploads/1.jpg','http://project.supabase.co/storage/v1/object/public/user_uploads/1.jpg','https://project.supabase.co/storage/v1/object/public/other/1.jpg','data:image/jpeg;base64,YQ=='])assert.equal(isSavedReportImage(url),false);
});
