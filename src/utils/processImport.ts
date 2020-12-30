import { Tab } from '../store';
import { uid } from './uid';

interface PlaygroundFile {
  name?: string;
  description?: string;
  files: {
    name: string;
    content: string | string[];
  }[];
}

/**
 * This function transform a JSON file into a format understood by the playground
 *
 * @param config {PlaygroundFile} - The playground config file as JSON
 */
export function processImport({ files }: PlaygroundFile): Tab[] {
  return files.reduce((tabs, file) => {
    return [
      ...tabs,
      {
        id: uid(),
        name: file.name,
        type: 'tsx',
        source: Array.isArray(file.content) ? file.content.join('\n') : file.content,
      },
    ];
  }, []);
}
