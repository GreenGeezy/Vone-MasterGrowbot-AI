import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const config = fs.readFileSync(new URL('../services/config.ts', import.meta.url), 'utf8');
const url = config.match(/SUPABASE_URL:\s*'([^']+)'/)?.[1];
const key = config.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)?.[1];
if (!url || !key) throw new Error('Supabase public configuration not found');

const values = new Map();
const storage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: key => values.delete(key),
};
let refreshRequests = 0;
const countedFetch = async (input, init) => {
  const requestUrl = typeof input === 'string' ? input : input.url;
  if (requestUrl.includes('/auth/v1/token')) refreshRequests += 1;
  return fetch(input, init);
};
const makeClient = () => createClient(url, key, { auth: {
  storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false,
}, global: { fetch: countedFetch } });

const check = (operation, condition) => {
  if (!condition) throw new Error(`${operation} failed`);
  console.log(`${operation}: ok`);
};
const requireData = (operation, result) => {
  if (result.error) throw new Error(`${operation}: ${result.error.code || result.error.message}`);
  check(operation, Boolean(result.data));
  return result.data;
};

let client = makeClient();
const signup = await client.auth.signInAnonymously();
if (signup.error || !signup.data.user) throw signup.error || new Error('anonymous sign-in failed');
const userId = signup.data.user.id;
check('1 anonymous sign-in', true);
check('2 exactly one session owner', (await client.auth.getSession()).data.session?.user.id === userId);

const beforeRefresh = refreshRequests;
const refreshed = await client.auth.refreshSession();
if (refreshed.error) throw refreshed.error;
check('3 token refresh', Boolean(refreshed.data.session));
check('4 one refresh request', refreshRequests - beforeRefresh === 1);

const profile = requireData('5 profile creation', await client.from('profiles').insert({ id: userId }).select().single());
requireData('6 profile update', await client.from('profiles').update({ experience_level: 'Novice' }).eq('id', userId).select().single());
const grow = requireData('7 grow creation', await client.from('grows').insert({ user_id: userId, name: 'Reliability Test Grow', status: 'active' }).select().single());
const plant = requireData('8 plant creation', await client.from('plants').insert({ user_id: userId, grow_id: grow.id, name: 'Reliability Test Plant', strain: 'Test', stage: 'Seedling' }).select().single());
requireData('9 plant reload', await client.from('plants').select('*').eq('id', plant.id).single());
const journal = requireData('10 journal creation', await client.from('journal_logs').insert({ user_id: userId, plant_id: plant.id, entry_type: 'note', content: 'Automated reliability test', tags: ['test'] }).select().single());
requireData('11 journal reload', await client.from('journal_logs').select('*').eq('id', journal.id).single());
const diagnosis = requireData('12 diagnosis report save', await client.from('diagnosis_reports').insert({ user_id: userId, plant_id: plant.id, diagnosis_json: { test: true }, confidence_score: 1 }).select().single());
const task = requireData('13 task creation', await client.from('tasks').insert({ user_id: userId, plant_id: plant.id, title: 'Reliability test task', is_completed: false, due_date: new Date().toISOString().slice(0, 10), source: 'test', type: 'other' }).select().single());
requireData('14 task reload', await client.from('tasks').select('*').eq('id', task.id).single());
const support = requireData('15 support ticket insert', await client.from('support_tickets').insert({ user_id: userId, name: 'Reliability Test', issue: 'Automated test', message: 'Automated reliability test', status: 'open' }).select().single());
const feedback = requireData('16 feedback insert', await client.from('user_feedback').insert({ user_id: userId, rating: 5, message: 'Automated reliability test' }).select().single());

client.auth.stopAutoRefresh();
client = makeClient();
const relaunched = await client.auth.getSession();
check('17 force-close/relaunch session preservation', relaunched.data.session?.user.id === userId);

await client.from('diagnosis_reports').delete().eq('id', diagnosis.id);
await client.from('journal_logs').delete().eq('id', journal.id);
await client.from('tasks').delete().eq('id', task.id);
await client.from('support_tickets').delete().eq('id', support.id);
await client.from('user_feedback').delete().eq('id', feedback.id);
await client.from('plants').delete().eq('id', plant.id);
await client.from('grows').delete().eq('id', grow.id);
await client.from('profiles').delete().eq('id', profile.id);
console.log(`TEST_USER_ID=${userId}`);
