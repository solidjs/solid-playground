import { runAsWorker } from 'synckit';
import { createGenerator } from 'unocss';
import { createJiti } from 'jiti';

const jiti = createJiti(import.meta.url);
const unoConfig = await jiti.import('../uno.config.ts');
const uno = await createGenerator((unoConfig as any).default);

runAsWorker(async (cls: string) => {
  const res = await uno.generate(cls, { preflights: false });
  if (res.matched.size === 0) return { valid: false };

  const info: { properties: string[]; context: string }[] = [];

  // Basic CSS parser to extract properties and their context
  // We expect simple CSS from uno.generate(single_class)
  const css = res.css;
  const stack: string[] = [];
  let currentContext = '';

  // Simple regex-based parsing
  // This is not a full CSS parser but should be enough for UnoCSS output for a single class
  const lines = css.split('\n');
  let currentProperties: string[] = [];
  let insideRule = false;

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('/*')) continue;

    if (line.startsWith('@')) {
      const braceIndex = line.indexOf('{');
      const atRule = braceIndex !== -1 ? line.slice(0, braceIndex).trim() : line;
      stack.push(atRule);
      if (line.includes('}')) {
        // Single line at-rule? (rare in UnoCSS but possible)
        stack.pop();
      }
      continue;
    }

    if (line.includes('{')) {
      const selector = line.split('{')[0].trim();
      const escapedClsForRegex = cls.replace(/[:[\]()%/$,!]/g, '\\\\$&');
      const contextSelector = selector.replace(new RegExp(`\\.${escapedClsForRegex}`, 'g'), '').trim();

      currentContext = [...stack, contextSelector].filter(Boolean).join(' ');
      currentProperties = [];
      insideRule = true;

      if (line.includes('}')) {
        const content = line.slice(line.indexOf('{') + 1, line.lastIndexOf('}'));
        extractProperties(content, currentProperties);
        info.push({ properties: currentProperties, context: currentContext });
        currentProperties = [];
        insideRule = false;
      }
      continue;
    }

    if (line.includes('}')) {
      if (insideRule) {
        if (currentProperties.length > 0) {
          info.push({ properties: currentProperties, context: currentContext });
          currentProperties = [];
        }
        insideRule = false;
      } else {
        stack.pop();
      }
      continue;
    }

    if (insideRule && line.includes(':')) {
      extractProperties(line, currentProperties);
    }
  }

  return { valid: true, info };
});

function extractProperties(content: string, target: string[]) {
  const decls = content.split(';');
  for (const decl of decls) {
    const colonIndex = decl.indexOf(':');
    if (colonIndex !== -1) {
      const prop = decl.slice(0, colonIndex).trim();
      if (prop && !prop.startsWith('--un-')) {
        target.push(prop);
      }
    }
  }
}
