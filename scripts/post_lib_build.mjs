import { readFileSync, writeFileSync, unlinkSync } from 'fs';

console.log('Combining CSS Bundles');
const unoCSS_build = readFileSync('uno.css');
const generated_bundle = readFileSync('./lib/bundle.css');

const output_bundle = generated_bundle + unoCSS_build;

writeFileSync('./lib/bundle.css', output_bundle);
unlinkSync('uno.css');
console.log('Final bundle written');
