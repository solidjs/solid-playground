import { createSyncFn } from 'synckit';
import { definePlugin, defineRule, type Ranged } from '@oxlint/plugins';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const validateClass = createSyncFn(resolve(__dirname, './unocss-worker.ts'));

const metadataCache = new Map<string, any>();

function getMetadata(cls: string) {
  if (metadataCache.has(cls)) return metadataCache.get(cls);
  const meta = validateClass(cls);
  metadataCache.set(cls, meta);
  return meta;
}

function getClassesFromAttribute(node: any): { cls: string; node: Ranged; definitelyActive: boolean }[] {
  const classes: { cls: string; node: Ranged; definitelyActive: boolean }[] = [];
  if (node.name.name === 'class' || node.name.name === 'classList') {
    if (node.value && node.value.type === 'Literal' && typeof node.value.value === 'string') {
      node.value.value
        .split(/\s+/)
        .filter(Boolean)
        .forEach((cls: string) => {
          classes.push({ cls, node: node.value, definitelyActive: true });
        });
    } else if (node.value && node.value.type === 'JSXExpressionContainer') {
      const expression = node.value.expression;
      if (expression && expression.type === 'ObjectExpression') {
        const props = expression.properties || [];
        for (const prop of props) {
          if (prop.type === 'Property') {
            const isDefinitelyActive = prop.value.type === 'Literal' && prop.value.value === true;
            const key = prop.key;
            if (key.type === 'Literal' && typeof key.value === 'string') {
              key.value
                .split(/\s+/)
                .filter(Boolean)
                .forEach((cls: string) => {
                  classes.push({ cls, node: key, definitelyActive: isDefinitelyActive });
                });
            } else if (key.type === 'Identifier') {
              classes.push({ cls: key.name, node: key, definitelyActive: isDefinitelyActive });
            }
          }
        }
      }
    }
  }
  return classes;
}

const validClassRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure UnoCSS classes are valid',
      category: 'Possible Errors',
    },
    messages: {
      invalidClass: 'Invalid UnoCSS class: {{cls}}',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const classes = getClassesFromAttribute(node);
        for (const { cls, node: targetNode } of classes) {
          if (cls.startsWith('{') || cls.includes('$') || cls.includes('(') || cls === 'group') continue;
          const meta = getMetadata(cls);
          if (!meta.valid) {
            context.report({
              message: `Invalid UnoCSS class: ${cls}`,
              node: targetNode,
            });
          }
        }
      },
    };
  },
});

const conflictingClassesRule = defineRule({
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure UnoCSS classes do not conflict',
      category: 'Possible Errors',
    },
    messages: {
      conflictingClass: 'Conflicting UnoCSS class: {{cls}} and {{conflictingCls}} both set {{prop}}',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        const classes = getClassesFromAttribute(node);
        // We only check for conflicts among classes that are definitely active together
        const activeClasses = classes.filter((c) => c.definitelyActive);

        // context -> property -> class
        const propertyMap = new Map<string, Map<string, string>>();

        for (const { cls } of activeClasses) {
          if (cls.startsWith('{') || cls.includes('$') || cls.includes('(') || cls === 'group') continue;
          const meta = getMetadata(cls);
          if (!meta.valid || !meta.info) continue;

          for (const info of meta.info) {
            const clsContext = info.context || 'default';
            if (!propertyMap.has(clsContext)) {
              propertyMap.set(clsContext, new Map());
            }

            const propMap = propertyMap.get(clsContext)!;
            for (const prop of info.properties) {
              if (propMap.has(prop)) {
                const conflictingCls = propMap.get(prop)!;
                if (conflictingCls !== cls) {
                  context.report({
                    message: `Conflicting UnoCSS classes: "${cls}" and "${conflictingCls}" both set "${prop}" in context "${clsContext}"`,
                    node: node.value || node,
                  });
                }
              } else {
                propMap.set(prop, cls);
              }
            }
          }
        }
      },
    };
  },
});

const plugin = definePlugin({
  meta: { name: 'unocss' },
  rules: {
    'valid-class': validClassRule,
    'no-conflicting-classes': conflictingClassesRule,
  },
});

export default plugin;
