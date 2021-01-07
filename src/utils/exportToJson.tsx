import { Tab } from '../store';

/**
 * This function will convert the tabs of the playground
 * into a JSON formatted playground that can then be reimported later on
 * via the url `https://playground.solidjs.com/?data=my-file.json` or
 * vua the import button
 *
 * @param tabs {Tab[]} - The tabs to export
 */
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
