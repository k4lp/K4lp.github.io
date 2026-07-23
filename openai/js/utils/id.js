/** @module utils/id */
let c = 0;
export function uid(prefix = 'id') {
  c += 1;
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}_${c}`;
}
