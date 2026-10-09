import { createMemoryStore } from './memory.js';
import { createSupabaseStore } from './supabase.js';

export const createStore = (config) => (config.STORE === 'supabase' ? createSupabaseStore(config) : createMemoryStore());
