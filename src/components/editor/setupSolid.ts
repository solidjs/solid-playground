import { languages } from 'monaco-editor';
import setupMonaco from './setupMonaco';

const hookLanguages = languages.setLanguageConfiguration;

languages.setLanguageConfiguration = (languageId: string, configuration: languages.LanguageConfiguration) => {
  setupMonaco();
  return hookLanguages(languageId, configuration);
};
