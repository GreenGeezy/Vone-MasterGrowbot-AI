import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return json({ error: 'Session required' }, 401);
  const caller = createClient(url, anon, { global: { headers: { Authorization: header } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) return json({ error: 'Session expired. Please reopen the app.' }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const uid = user.id;

  try {
    // Storage objects must be removed through the Storage API before deleting
    // their owner. A failed step preserves the account for a safe retry.
    for (const bucketName of ['user_uploads', 'journal_documents']) {
      const bucket = admin.storage.from(bucketName);
      const eraseFolder = async (folder: string, depth = 0): Promise<void> => {
        if (depth > 8) throw new Error('Storage nesting is too deep');
        for (let attempts = 0; attempts < 100; attempts += 1) {
          const { data, error } = await bucket.list(folder, { limit: 100 });
          if (error) throw error;
          if (!data?.length) return;
          const files = data.filter(item => item.id).map(item => `${folder}/${item.name}`);
          const directories = data.filter(item => !item.id).map(item => `${folder}/${item.name}`);
          for (const directory of directories) await eraseFolder(directory, depth + 1);
          if (files.length) {
            const { error: removeError } = await bucket.remove(files);
            if (removeError) throw removeError;
          }
          if (!files.length && !directories.length) throw new Error('Storage listing made no progress');
        }
        throw new Error('Storage cleanup did not finish');
      };
      await eraseFolder(uid);
    }

    const { data: sessions, error: sessionError } = await admin.from('chat_sessions').select('id').eq('user_id', uid);
    if (sessionError) throw sessionError;
    const sessionIds = (sessions || []).map(item => item.id);
    if (sessionIds.length) {
      const { error } = await admin.from('chat_messages').delete().in('session_id', sessionIds);
      if (error) throw error;
    }
    for (const table of ['journal_attachments', 'diagnosis_reports', 'journal_logs', 'tasks', 'plants', 'grows', 'chat_sessions', 'support_tickets', 'user_feedback', 'user_daily_usage', 'conversion_events', 'app_ratings']) {
      const { error } = await admin.from(table).delete().eq('user_id', uid);
      if (error) throw error;
    }
    const { error: profileError } = await admin.from('profiles').delete().eq('id', uid);
    if (profileError) throw profileError;
    const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
    if (deleteError) throw deleteError;
    return json({ deleted: true });
  } catch (error) {
    console.error('Account cleanup failed', { userId: uid, reason: error instanceof Error ? error.message : 'unknown' });
    return json({ error: 'Account deletion could not finish. Your account is still available. Please retry or contact support.' }, 503);
  }
});
