import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../src');

const stripComments = (source: string): string =>
    source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');

const namedImportsFrom = (source: string, spec: string): string[] => {
    const names: string[] = [];
    const re = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${spec}['"]`, 'g');
    for (const m of stripComments(source).matchAll(re)) {
        for (const raw of m[1].split(',')) {
            const ident = raw.trim();
            if (!ident) continue;
            names.push(ident.split(/\s+as\s+/)[0].trim());
        }
    }
    return names;
};

describe('React 19 hooks must not be named-imported from react', () => {
    const banned = ['useOptimistic', 'useActionState', 'use'];

    it.each(['hooks.ts', 'production-hooks.ts'])(
        '%s uses namespace access for React 19 APIs',
        (file) => {
            const src = readFileSync(path.join(SRC, file), 'utf8');
            const fromReact = namedImportsFrom(src, 'react');

            for (const name of banned) {
                expect(fromReact).not.toContain(name);
            }

            expect(src).toMatch(/React19\.useOptimistic/);
            expect(src).toMatch(/React19\.useActionState/);
            expect(src).toMatch(/React19\.use/);
            expect(src).toMatch(/import \* as React from 'react'/);
        }
    );
});