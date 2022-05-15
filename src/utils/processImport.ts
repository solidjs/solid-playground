import type { Tab, PlaygroundFile } from '../../types/types';

/**
 * This function transform a JSON file into a format understood by the playground
 *
 * @param config {PlaygroundFile} - The playground config file as JSON
 */
export function processImport({ files }: PlaygroundFile): Tab[] {
  return files.map<Tab>((file) => ({
    name: file.name,
    type: file?.type ?? 'tsx',
    source: Array.isArray(file.content) ? file.content.join('\n') : file.content,
  }));
}
