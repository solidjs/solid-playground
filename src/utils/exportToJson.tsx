import { Tab } from '../store';

export function exportToJSON(tabs: Tab[]) {
  const files = tabs.reduce((json, tab) => {
    return [
      ...json,
      {
        name: tab.name,
        content: tab.source,
      },
    ];
  }, []);

  const blob = new Blob([JSON.stringify({ files }, null, 4)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const anchor = (<a href={url} target="_blank" rel="noopener" download />) as HTMLElement;
  document.body.prepend(anchor);
  anchor.click();
  anchor.remove();
}
