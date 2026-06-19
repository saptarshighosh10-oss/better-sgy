/**
 * In-memory webextension API shim for the standalone demo. Must be imported FIRST
 * so `globalThis.browser` exists before the app's storage helpers run. The real
 * extension gets `browser` from WXT; here we fake storage.local + a no-op runtime.
 */
type Listener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void;

const store: Record<string, unknown> = {};
const listeners = new Set<Listener>();

function fire(changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) {
  listeners.forEach((l) => { try { l(changes, 'local'); } catch { /* ignore */ } });
}

const shim = {
  runtime: {
    id: 'better-sgy-demo',
    getURL: (p: string) => p,
    sendMessage: async () => undefined,
    onMessage: { addListener() {}, removeListener() {} },
    onInstalled: { addListener() {} },
  },
  storage: {
    local: {
      async get(keys?: string | string[] | Record<string, unknown> | null) {
        if (keys == null) return { ...store };
        if (typeof keys === 'string') return { [keys]: store[keys] };
        if (Array.isArray(keys)) {
          const o: Record<string, unknown> = {};
          for (const k of keys) o[k] = store[k];
          return o;
        }
        const o: Record<string, unknown> = {};
        for (const k of Object.keys(keys)) o[k] = k in store ? store[k] : (keys as Record<string, unknown>)[k];
        return o;
      },
      async set(obj: Record<string, unknown>) {
        const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
        for (const k of Object.keys(obj)) { changes[k] = { oldValue: store[k], newValue: obj[k] }; store[k] = obj[k]; }
        fire(changes);
      },
      async remove(keys: string | string[]) {
        const arr = Array.isArray(keys) ? keys : [keys];
        const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
        for (const k of arr) { changes[k] = { oldValue: store[k], newValue: undefined }; delete store[k]; }
        fire(changes);
      },
    },
    onChanged: {
      addListener(l: Listener) { listeners.add(l); },
      removeListener(l: Listener) { listeners.delete(l); },
    },
  },
};

(globalThis as unknown as { browser: unknown; chrome: unknown }).browser = shim;
(globalThis as unknown as { browser: unknown; chrome: unknown }).chrome = shim;
