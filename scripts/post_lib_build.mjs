import { readFileSync, writeFileSync, unlinkSync } from 'fs';
const unoCSS_output_path = './lib/uno.css';
const bundle_output_path = './lib/bundle.css';
console.log('Combining CSS Bundles');
const unoCSS_build = readFileSync(unoCSS_output_path);
const generated_bundle = readFileSync(bundle_output_path);

const output_bundle = generated_bundle + unoCSS_build;

writeFileSync(bundle_output_path, output_bundle);
unlinkSync(unoCSS_output_path);
console.log('Final bundle written');
