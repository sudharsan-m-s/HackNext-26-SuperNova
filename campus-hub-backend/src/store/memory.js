// In-memory store: zero setup, used for local demos and tests. Data resets on restart.
// Same 20 people as sql/002_multi_department_seed.sql (5 departments x [2 students, 2 faculty]).
export const DEMO_PROFILES = {
  S101: { id: 'S101', login_id: 'S101', role: 'student', name: 'Aarav Menon', dept: 'CSE', section: 'A', year: 2 },
  S102: { id: 'S102', login_id: 'S102', role: 'student', name: 'Ishita Rao', dept: 'CSE', section: 'A', year: 3 },
  S103: { id: 'S103', login_id: 'S103', role: 'student', name: 'Karan Patel', dept: 'ECE', section: 'A', year: 2 },
  S104: { id: 'S104', login_id: 'S104', role: 'student', name: 'Sneha Reddy', dept: 'ECE', section: 'A', year: 3 },
  S105: { id: 'S105', login_id: 'S105', role: 'student', name: 'Dev Anand', dept: 'EEE', section: 'A', year: 2 },
  S106: { id: 'S106', login_id: 'S106', role: 'student', name: 'Nisha Thomas', dept: 'EEE', section: 'A', year: 3 },
  S107: { id: 'S107', login_id: 'S107', role: 'student', name: 'Riya Sharma', dept: 'IT', section: 'A', year: 2 },
  S108: { id: 'S108', login_id: 'S108', role: 'student', name: 'Arjun Krishnan', dept: 'IT', section: 'A', year: 3 },
  S109: { id: 'S109', login_id: 'S109', role: 'student', name: 'Mohammed Faiz', dept: 'MECH', section: 'A', year: 2 },
  S110: { id: 'S110', login_id: 'S110', role: 'student', name: 'Pooja Venkatesh', dept: 'MECH', section: 'A', year: 3 },
  F201: { id: 'F201', login_id: 'F201', role: 'faculty', name: 'Dr. Meera Iyer', dept: 'CSE' },
  F202: { id: 'F202', login_id: 'F202', role: 'faculty', name: 'Prof. R. Kumar', dept: 'CSE' },
  F203: { id: 'F203', login_id: 'F203', role: 'faculty', name: 'Dr. S. Nair', dept: 'ECE' },
  F204: { id: 'F204', login_id: 'F204', role: 'faculty', name: 'Prof. Anjali Deshmukh', dept: 'ECE' },
  F205: { id: 'F205', login_id: 'F205', role: 'faculty', name: 'Dr. Vikram Singh', dept: 'EEE' },
  F206: { id: 'F206', login_id: 'F206', role: 'faculty', name: 'Prof. Lakshmi Narayanan', dept: 'EEE' },
  F207: { id: 'F207', login_id: 'F207', role: 'faculty', name: 'Dr. Farah Khan', dept: 'IT' },
  F208: { id: 'F208', login_id: 'F208', role: 'faculty', name: 'Prof. T. Suresh', dept: 'IT' },
  F209: { id: 'F209', login_id: 'F209', role: 'faculty', name: 'Dr. Rajesh Gupta', dept: 'MECH' },
  F210: { id: 'F210', login_id: 'F210', role: 'faculty', name: 'Prof. Deepa Menon', dept: 'MECH' },
};

import { readFileSync } from 'node:fs';
const classwork = () => structuredClone(JSON.parse(readFileSync(new URL('../../fixtures/classwork.json', import.meta.url), 'utf8')));

export function createMemoryStore(profiles = DEMO_PROFILES) {
  const updates = [], sources = [], runs = [], reads = new Set();
  const cw = classwork(), submitted = new Set();
  let taskSeq = cw.tasks.length, bcSeq = cw.broadcasts.length;
  let nextId = 0;
  const ts = (u) => Date.parse(u.received_at || u.created_at);
  return {
    kind: 'memory',
    async authenticate(req) { const u = req.get('x-demo-user'); return profiles[u] ? u : null; },
    async getProfile(uid) { return profiles[uid] || null; },
    async listProfiles() { return Object.values(profiles); },
    async knownMessageIds(ids) { return new Set(sources.filter((s) => ids.includes(s.message_id)).map((s) => s.message_id)); },
    async getRecentUpdates(sinceISO) { return updates.filter((u) => ts(u) >= Date.parse(sinceISO)); },
    async insertUpdate(row) { const r = { ...row, id: ++nextId, created_at: new Date().toISOString() }; updates.push(r); return r; },
    async addSource(s) { sources.push({ ...s, id: sources.length + 1 }); },
    async mergeInto(id, patch) { Object.assign(updates.find((u) => u.id === id), patch); },
    async listUpdates({ limit }) { return [...updates].sort((a, b) => ts(b) - ts(a)).slice(0, limit); },
    async listSources(ids) {
      const map = new Map();
      for (const s of sources) if (ids.includes(s.update_id)) map.set(s.update_id, [...(map.get(s.update_id) || []), s]);
      return map;
    },
    async getReadIds(uid) { return new Set([...reads].filter((k) => k.startsWith(`${uid}:`)).map((k) => Number(k.split(':')[1]))); },
    async markRead(uid, id) { reads.add(`${uid}:${id}`); },
    async listSchedule(weekday) { return cw.schedule.filter((r) => r.weekday === weekday).sort((a, b) => a.start_t.localeCompare(b.start_t)); },
    async listTasks() { return [...cw.tasks]; },
    async getTask(id) { return cw.tasks.find((t) => t.id === id) || null; },
    async insertTask(row) { const t = { ...row, id: ++taskSeq }; cw.tasks.unshift(t); return t; },
    async getSubmittedTaskIds(uid) { return new Set([...submitted].filter((k) => k.startsWith(`${uid}:`)).map((k) => Number(k.split(':')[1]))); },
    async markTaskSubmitted(uid, id) { submitted.add(`${uid}:${id}`); },
    async listBroadcasts() { return [...cw.broadcasts].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)); },
    async insertBroadcast(row) {
      const author = profiles[row.author];
      const b = { ...row, id: ++bcSeq, author_name: author?.name || null, created_at: new Date().toISOString() };
      cw.broadcasts.unshift(b); return b;
    },
    async recordRun(run) { runs.unshift({ id: runs.length + 1, ...run }); },
    async listRuns(n = 10) { return runs.slice(0, n); },
  };
}
