import { createClient } from '@supabase/supabase-js';

// Uses the SERVICE ROLE key: it bypasses RLS, so keep it server-side only and never ship it to the browser.
export function createSupabaseStore({ SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY }, client) {
  const sb = client || createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const must = ({ data, error }) => {
    if (error) throw Object.assign(new Error(error.message), { code: 'DB_ERROR', details: error });
    return data;
  };
  return {
    kind: 'supabase',

    async authenticate(req) {
      const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!token) return null;
      const { data, error } = await sb.auth.getUser(token);
      return error ? null : data.user.id;
    },
    async getProfile(uid) {
      const u = must(await sb.from('users').select('id,login_id,role,name').eq('id', uid).maybeSingle());
      if (!u) return null;
      const extra = u.role === 'student'
        ? must(await sb.from('students').select('dept,section,year').eq('user_id', uid).maybeSingle())
        : must(await sb.from('faculty').select('dept').eq('user_id', uid).maybeSingle());
      return { ...u, ...(extra || {}) };
    },
    async listProfiles() {
      const users = must(await sb.from('users').select('id,login_id,role,name'));
      const st = must(await sb.from('students').select('user_id,dept,section,year'));
      const fa = must(await sb.from('faculty').select('user_id,dept'));
      const extra = new Map([...st, ...fa].map((r) => [r.user_id, r]));
      return users.map((u) => ({ ...u, ...(extra.get(u.id) || {}) }));
    },

    async knownMessageIds(ids) {
      if (!ids.length) return new Set();
      return new Set(must(await sb.from('update_sources').select('message_id').in('message_id', ids)).map((r) => r.message_id));
    },
    async getRecentUpdates(sinceISO) {
      return must(await sb.from('institutional_updates').select('*').gte('received_at', sinceISO));
    },
    async insertUpdate(row) { return must(await sb.from('institutional_updates').insert(row).select().single()); },
    async addSource(s) { must(await sb.from('update_sources').insert(s)); },
    async mergeInto(id, patch) { must(await sb.from('institutional_updates').update(patch).eq('id', id)); },
    async listUpdates({ limit }) {
      return must(await sb.from('institutional_updates').select('*').order('received_at', { ascending: false }).limit(limit));
    },
    async listSources(ids) {
      const map = new Map();
      if (!ids.length) return map;
      for (const s of must(await sb.from('update_sources').select('update_id,sender,subject,received_at,is_primary').in('update_id', ids)))
        map.set(s.update_id, [...(map.get(s.update_id) || []), s]);
      return map;
    },

    async getReadIds(uid) {
      return new Set(must(await sb.from('read_status').select('item_id').eq('user_id', uid).eq('item_type', 'update')).map((r) => Number(r.item_id)));
    },
    async markRead(uid, id) {
      must(await sb.from('read_status').upsert({ user_id: uid, item_type: 'update', item_id: id }, { onConflict: 'user_id,item_type,item_id' }));
    },
    async listSchedule(weekday) {
      const rows = must(await sb.from('schedule').select('*').eq('weekday', weekday).order('start_t'));
      const ids = [...new Set(rows.map((r) => r.faculty_id).filter(Boolean))];
      const names = new Map(ids.length ? must(await sb.from('users').select('id,name').in('id', ids)).map((u) => [u.id, u.name]) : []);
      return rows.map((r) => ({ ...r, faculty_name: names.get(r.faculty_id) || null }));
    },
    async listTasks() { return must(await sb.from('tasks').select('*').order('id', { ascending: false }).limit(500)); },
    async getTask(id) { return must(await sb.from('tasks').select('*').eq('id', id).maybeSingle()); },
    async insertTask(row) { return must(await sb.from('tasks').insert(row).select().single()); },
    async getSubmittedTaskIds(uid) {
      return new Set(must(await sb.from('read_status').select('item_id').eq('user_id', uid).eq('item_type', 'task_submitted')).map((r) => Number(r.item_id)));
    },
    async markTaskSubmitted(uid, id) {
      must(await sb.from('read_status').upsert({ user_id: uid, item_type: 'task_submitted', item_id: id }, { onConflict: 'user_id,item_type,item_id' }));
    },
    async listBroadcasts() {
      const rows = must(await sb.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(300));
      const ids = [...new Set(rows.map((r) => r.author).filter(Boolean))];
      const names = new Map(ids.length ? must(await sb.from('users').select('id,name').in('id', ids)).map((u) => [u.id, u.name]) : []);
      return rows.map((r) => ({ ...r, author_name: names.get(r.author) || null }));
    },
    async insertBroadcast(row) {
      const b = must(await sb.from('broadcasts').insert(row).select().single());
      const u = must(await sb.from('users').select('name').eq('id', b.author).maybeSingle());
      return { ...b, author_name: u?.name || null };
    },
    async recordRun(run) { must(await sb.from('ingest_runs').insert(run)); },
    async listRuns(n = 10) { return must(await sb.from('ingest_runs').select('*').order('id', { ascending: false }).limit(n)); },
  };
}
