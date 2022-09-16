import { verify, verifyAndFix, pluginVersion, eslintVersion, plugin } from 'eslint-solid-standalone';
import type { Linter } from 'eslint-solid-standalone';
import type { Tab } from 'solid-repl';

type RuleSeverityOverrides = Parameters<typeof verify>[1];
interface Payload {
  data:
    | {
        event: 'LINT' | 'FIX';
        tab: Tab;
        ruleSeverityOverrides?: RuleSeverityOverrides;
      }
    | {
        event: 'META';
      };
}

self.addEventListener('message', async ({ data }: Payload) => {
  const { event } = data;
  try {
    if (event === 'LINT') {
      const { tab, ruleSeverityOverrides } = data;
      self.postMessage({
        event: 'LINT',
        lintMessages: await verify(tab.source, ruleSeverityOverrides),
      });
    } else if (event === 'FIX') {
      const { tab, ruleSeverityOverrides } = data;
      self.postMessage({
        event: 'FIX',
        fixReport: await verifyAndFix(tab.source, ruleSeverityOverrides),
      });
    } else if (event === 'META') {
      self.postMessage({
        event: 'META',
        pluginVersion,
        eslintVersion,
        // send the prebuilt configs as maps of rule names to 0 | 1 | 2
        // map over objects to simplify any complex options, eslint-solid-standalone only accepts
        // severity changes
        configs: Object.keys(plugin.configs!).reduce((configs, key) => {
          configs[key] = Object.keys(plugin.configs![key]).reduce((config, rule) => {
            const ruleConfig = plugin.configs![key].rules![rule];
            config[rule] = Array.isArray(ruleConfig)
              ? (ruleConfig[0] as Linter.Severity)
              : (ruleConfig as Linter.Severity);
            return config;
          }, {} as Record<string, Linter.Severity>);
          return configs;
        }, {} as Record<string, Record<string, Linter.Severity>>),
      });
    }
  } catch (e) {
    self.postMessage({ event: 'ERROR', error: (e as Error).message });
  }
});
