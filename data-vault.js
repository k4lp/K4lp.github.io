// data-vault.js - Central store for large runtime datasets

import { storageManager } from './storage.js';

class DataVault {
    constructor() {
        this.PREVIEW_CHAR_LIMIT = 800;
        this.INLINE_STRING_LIMIT = 240;
        this.MAX_SAMPLE_ITEMS = 12;
        this.REFERENCE_PREFIX = 'vault';
        this.textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
    }

    listEntries() {
        return storageManager.getDataVaultEntries();
    }

    getEntry(id) {
        return this.listEntries().find(entry => entry.id === id) || null;
    }

    getEntryByReference(reference) {
        const id = this.extractId(reference);
        return id ? this.getEntry(id) : null;
    }

    resolve(referenceOrId) {
        const entry = typeof referenceOrId === 'string'
            ? this.getEntryByReference(referenceOrId) || this.getEntry(referenceOrId)
            : null;
        return entry;
    }

    store(value, options = {}) {
        const prepared = this.prepareValueForStorage(value, options);
        const id = storageManager.addDataVaultEntry({
            label: prepared.label,
            type: prepared.type,
            rawType: prepared.rawType,
            stats: prepared.stats,
            preview: prepared.preview,
            previewTruncated: prepared.previewTruncated,
            bytes: prepared.bytes,
            serialized: prepared.serialized,
            source: options.source || 'runtime',
            execId: options.execId || null,
            notes: options.notes || '',
            tags: Array.isArray(options.tags) ? options.tags : [],
            reference: null
        });

        const reference = this.buildReference(id);
        storageManager.updateDataVaultEntry(id, { reference });
        return this.getEntry(id);
    }

    update(id, updates) {
        return storageManager.updateDataVaultEntry(id, updates);
    }

    delete(id) {
        storageManager.deleteDataVaultEntry(id);
    }

    clear() {
        storageManager.clearDataVault();
    }

    shouldVault(value, options = {}) {
        if (options.force) return true;
        const type = this.detectType(value);

        if (type === 'string') {
            return value.length > this.INLINE_STRING_LIMIT || /\n/.test(value);
        }

        if (type === 'array' || type === 'object') {
            return true;
        }

        if (type === 'function' || type === 'map' || type === 'set' || type === 'buffer' || type === 'date') {
            return true;
        }

        return false;
    }

    getPreview(id, { limit = this.PREVIEW_CHAR_LIMIT } = {}) {
        const entry = this.getEntry(id);
        if (!entry) return null;

        const preview = entry.preview || '';
        if (preview.length <= limit) {
            return preview;
        }
        return `${preview.slice(0, limit)}… (truncated preview, use full mode to retrieve everything)`;
    }

    getFull(id) {
        const entry = this.getEntry(id);
        if (!entry) return null;
        return entry.serialized || '';
    }

    getValue(id) {
        const serialized = this.getFull(id);
        if (!serialized) return null;
        return this.safeDeserialize(serialized, id);
    }

    buildReference(id) {
        return `[[${this.REFERENCE_PREFIX}:${id}]]`;
    }

    extractId(reference) {
        if (typeof reference !== 'string') return null;
        const match = reference.match(/\[\[\s*vault:([^\]]+)\s*\]\]/i);
        if (match) {
            return match[1].trim();
        }
        if (reference.startsWith('vault_')) {
            return reference;
        }
        return null;
    }

    isReferenceToken(text) {
        if (typeof text !== 'string') return false;
        return /\[\[\s*vault:[^\]]+\]\]/i.test(text);
    }

    createRuntimeApi(context = {}) {
        return Object.freeze({
            store: (value, options = {}) => {
                const entry = this.store(value, {
                    ...options,
                    source: options.source || context.source || 'execute_js',
                    execId: context.execId || options.execId || null
                });
                return entry?.reference || null;
            },
            read: (referenceOrId, mode = 'preview', opts = {}) => {
                const entry = this.resolve(referenceOrId);
                if (!entry) return null;
                if (mode === 'full') {
                    return this.getFull(entry.id);
                }
                const limit = typeof opts.limit === 'number' ? opts.limit : this.PREVIEW_CHAR_LIMIT;
                return this.getPreview(entry.id, { limit });
            },
            info: (referenceOrId) => {
                const entry = this.resolve(referenceOrId);
                if (!entry) return null;
                const { serialized, ...rest } = entry;
                return rest;
            },
            value: (referenceOrId) => {
                const entry = this.resolve(referenceOrId);
                if (!entry) return null;
                return this.getValue(entry.id);
            },
            list: () => this.listEntries().map(entry => {
                const { serialized, ...rest } = entry;
                return rest;
            }),
            drop: (referenceOrId) => {
                const entry = this.resolve(referenceOrId);
                if (!entry) return false;
                this.delete(entry.id);
                return true;
            }
        });
    }

    detectType(value) {
        if (value === null) return 'null';
        if (Array.isArray(value)) return 'array';
        if (value instanceof Map) return 'map';
        if (value instanceof Set) return 'set';
        if (value instanceof Date) return 'date';
        if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return 'buffer';

        const type = typeof value;
        if (type === 'object') return 'object';
        if (type === 'bigint') return 'bigint';
        if (type === 'function') return 'function';
        return type;
    }

    prepareValueForStorage(value, options) {
        const type = this.detectType(value);
        const rawType = Object.prototype.toString.call(value);
        const serialized = this.safeSerialize(value);
        const previewInfo = this.buildPreview(value, serialized, type);
        const bytes = this.estimateBytes(serialized);

        const stats = {
            length: this.measureLength(value, type),
            keys: type === 'object' ? Object.keys(value || {}).length : undefined
        };

        const label = this.resolveLabel(value, type, stats, options.label);

        return {
            type,
            rawType,
            stats,
            serialized,
            preview: previewInfo.preview,
            previewTruncated: previewInfo.truncated,
            bytes,
            label
        };
    }

    resolveLabel(value, type, stats, providedLabel) {
        if (providedLabel) {
            return providedLabel;
        }

        switch (type) {
            case 'array':
                return `Array(${stats.length ?? '??'})`;
            case 'object':
                return `Object(${stats.keys ?? '??'} keys)`;
            case 'map':
                return `Map(${stats.length ?? '??'})`;
            case 'set':
                return `Set(${stats.length ?? '??'})`;
            case 'string': {
                const len = typeof stats.length === 'number' ? stats.length : (value ? value.length : 0);
                return `String(${len})`;
            }
            case 'function': {
                const name = value && value.name ? value.name : 'anonymous';
                return `Function(${name})`;
            }
            case 'buffer':
                return `Buffer(${stats.length ?? '??'})`;
            default:
                return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
        }
    }

    measureLength(value, type) {
        if (type === 'array') return value.length;
        if (type === 'map' || type === 'set') return value.size;
        if (type === 'string') return value.length;
        if (type === 'function') {
            try {
                return value.toString().length;
            } catch (error) {
                console.error('Vault length measurement failed for function', error);
            }
        }
        if (type === 'buffer') {
            if (ArrayBuffer.isView(value)) return value.byteLength;
            if (value instanceof ArrayBuffer) return value.byteLength;
        }
        return undefined;
    }

    buildPreview(value, serialized, type) {
        try {
            if (type === 'string') {
                const truncated = value.length > this.PREVIEW_CHAR_LIMIT;
                const preview = truncated ? `${value.slice(0, this.PREVIEW_CHAR_LIMIT)}...` : value;
                return { preview, truncated };
            }

            if (type === 'function') {
                const source = this.extractFunctionSource(value);
                const truncated = source.length > this.PREVIEW_CHAR_LIMIT;
                const preview = truncated ? `${source.slice(0, this.PREVIEW_CHAR_LIMIT)}...` : source;
                return { preview, truncated };
            }

            if (type === 'array') {
                const items = value.slice(0, this.MAX_SAMPLE_ITEMS).map(item => this.describeScalar(item));
                const suffix = value.length > this.MAX_SAMPLE_ITEMS ? ', ...' : '';
                return {
                    preview: `[${items.join(', ')}${suffix}] (len ${value.length})`,
                    truncated: value.length > this.MAX_SAMPLE_ITEMS
                };
            }

            if (type === 'object') {
                const keys = Object.keys(value || {}).slice(0, this.MAX_SAMPLE_ITEMS);
                const mapped = keys.map(key => `${key}: ${this.describeScalar(value[key])}`);
                const suffix = Object.keys(value || {}).length > this.MAX_SAMPLE_ITEMS ? ', ...' : '';
                return {
                    preview: `{ ${mapped.join(', ')}${suffix} }`,
                    truncated: Object.keys(value || {}).length > this.MAX_SAMPLE_ITEMS
                };
            }

            if (type === 'map') {
                const entries = Array.from(value.entries()).slice(0, this.MAX_SAMPLE_ITEMS);
                const mapped = entries.map(([k, v]) => `${this.describeScalar(k)} -> ${this.describeScalar(v)}`);
                const suffix = value.size > this.MAX_SAMPLE_ITEMS ? ', ...' : '';
                return {
                    preview: `Map { ${mapped.join(', ')}${suffix} }`,
                    truncated: value.size > this.MAX_SAMPLE_ITEMS
                };
            }

            if (type === 'set') {
                const entries = Array.from(value.values()).slice(0, this.MAX_SAMPLE_ITEMS).map(item => this.describeScalar(item));
                const suffix = value.size > this.MAX_SAMPLE_ITEMS ? ', ...' : '';
                return {
                    preview: `Set { ${entries.join(', ')}${suffix} }`,
                    truncated: value.size > this.MAX_SAMPLE_ITEMS
                };
            }

            if (type === 'buffer') {
                const bytes = this.measureLength(value, 'buffer');
                return {
                    preview: `Buffer(${bytes ?? 0} bytes)`,
                    truncated: false
                };
            }

            if (type === 'object' && serialized) {
                const truncated = serialized.length > this.PREVIEW_CHAR_LIMIT;
                const preview = truncated ? `${serialized.slice(0, this.PREVIEW_CHAR_LIMIT)}...` : serialized;
                return { preview, truncated };
            }

            const fallback = serialized || String(value);
            return {
                preview: fallback,
                truncated: false
            };
        } catch (error) {
            console.error('Error building data preview', error);
            return {
                preview: serialized || String(value),
                truncated: false
            };
        }
    }

    describeScalar(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';

        const type = typeof value;
        switch (type) {
            case 'string': {
                const snippet = value.length > 60 ? `${value.slice(0, 57)}...` : value;
                return `"${snippet}"`;
            }
            case 'number':
            case 'bigint':
                return String(value);
            case 'boolean':
                return value ? 'true' : 'false';
            case 'function': {
                const name = value.name || 'anonymous';
                const source = this.extractFunctionSource(value).replace(/\s+/g, ' ').trim();
                const snippet = source.length > 48 ? `${source.slice(0, 48)}...` : source;
                return snippet ? `[Function ${name}] ${snippet}` : `[Function ${name}]`;
            }
            case 'symbol':
                return value.toString();
            case 'object': {
                if (Array.isArray(value)) {
                    return `Array(${value.length})`;
                }
                if (value instanceof Date) {
                    return `Date(${value.toISOString()})`;
                }
                if (value instanceof Map) {
                    return `Map(${value.size})`;
                }
                if (value instanceof Set) {
                    return `Set(${value.size})`;
                }
                if (value && value.__storedFunction) {
                    const source = typeof value.source === 'string' ? value.source : '';
                    const compact = source.replace(/\s+/g, ' ').trim();
                    const snippet = compact.length > 48 ? `${compact.slice(0, 48)}...` : compact;
                    return snippet ? `[Function ${value.name || 'anonymous'}] ${snippet}` : `[Function ${value.name || 'anonymous'}]`;
                }
                return 'Object';
            }
            default:
                return String(value);
        }
    }

    extractFunctionSource(fn) {
        if (typeof fn !== 'function') {
            return '';
        }
        try {
            return fn.toString();
        } catch (error) {
            console.error('Unable to read function source for vault storage', error);
            return `[Function ${fn.name || 'anonymous'}]`;
        }
    }

    safeSerialize(value) {
        const seen = new WeakSet();

        const replacer = (_key, val) => {
            if (typeof val === 'bigint') {
                return `BigInt(${val.toString()})`;
            }
            if (typeof val === 'function') {
                const source = this.extractFunctionSource(val);
                return {
                    __type: 'Function',
                    name: val.name || 'anonymous',
                    length: typeof val.length === 'number' ? val.length : undefined,
                    source
                };
            }
            if (val instanceof Map) {
                return {
                    __type: 'Map',
                    entries: Array.from(val.entries())
                };
            }
            if (val instanceof Set) {
                return {
                    __type: 'Set',
                    values: Array.from(val.values())
                };
            }
            if (val instanceof Date) {
                return {
                    __type: 'Date',
                    value: val.toISOString()
                };
            }
            if (val instanceof RegExp) {
                return {
                    __type: 'RegExp',
                    value: val.toString()
                };
            }
            if (val instanceof Error) {
                return {
                    __type: 'Error',
                    name: val.name,
                    message: val.message,
                    stack: val.stack
                };
            }
            if (ArrayBuffer.isView(val)) {
                return {
                    __type: 'TypedArray',
                    name: val.constructor.name,
                    values: Array.from(val)
                };
            }
            if (val instanceof ArrayBuffer) {
                return {
                    __type: 'ArrayBuffer',
                    values: Array.from(new Uint8Array(val))
                };
            }
            if (typeof val === 'object' && val !== null) {
                if (seen.has(val)) {
                    return '[Circular]';
                }
                seen.add(val);
            }
            return val;
        };

        try {
            return JSON.stringify(value, replacer, 2);
        } catch (error) {
            console.error('Vault serialization failed, falling back to string', error);
            try {
                return String(value);
            } catch {
                return '[Unserializable Value]';
            }
        }
    }

    estimateBytes(serialized) {
        if (!serialized) return 0;
        if (this.textEncoder) {
            return this.textEncoder.encode(serialized).length;
        }
        return serialized.length;
    }

    safeDeserialize(serialized, id = null) {
        try {
            const reviver = (_key, value) => {
                if (value && typeof value === 'object' && value.__type) {
                    switch (value.__type) {
                        case 'Map':
                            return new Map(Array.isArray(value.entries) ? value.entries : []);
                        case 'Set':
                            return new Set(Array.isArray(value.values) ? value.values : []);
                        case 'Date':
                            return new Date(value.value);
                        case 'RegExp':
                            try {
                                const match = value.value.match(/^\/(.*)\/([gimsuy]*)$/);
                                if (match) {
                                    return new RegExp(match[1], match[2]);
                                }
                            } catch (error) {
                                console.error('Failed to revive RegExp from vault', error);
                            }
                            return value.value;
                        case 'Error': {
                            const err = new Error(value.message || '');
                            err.name = value.name || 'Error';
                            err.stack = value.stack;
                            return err;
                        }
                        case 'TypedArray': {
                            const ctor = typeof value.name === 'string' ? globalThis[value.name] : null;
                            if (typeof ctor === 'function' && Array.isArray(value.values)) {
                                try {
                                    return new ctor(value.values);
                                } catch (error) {
                                    console.error('Failed to revive typed array', error);
                                }
                            }
                            return value.values;
                        }
                        case 'ArrayBuffer': {
                            if (Array.isArray(value.values)) {
                                return new Uint8Array(value.values).buffer;
                            }
                            return value.values;
                        }
                        case 'Function': {
                            const source = typeof value.source === 'string' ? value.source : '';
                            const meta = {
                                __storedFunction: true,
                                name: value.name || 'anonymous',
                                length: typeof value.length === 'number' ? value.length : undefined,
                                source
                            };
                            Object.defineProperty(meta, 'toString', {
                                value: () => source || `[Stored Function ${meta.name}]`,
                                enumerable: false
                            });
                            return meta;
                        }
                        default:
                            return value;
                    }
                }
                return value;
            };

            return JSON.parse(serialized, reviver);
        } catch (error) {
            console.error('Vault deserialization failed', id, error);
            return serialized;
        }
    }
}

export const dataVault = new DataVault();
