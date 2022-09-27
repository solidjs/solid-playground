
import { loadWASM } from 'onigasm';
import onigasm from 'onigasm/lib/onigasm.wasm?url';
import './setupThemes';
import './setupTypescript';

let LOADED = false;

export default async function setupMonaco(): Promise<void> {
  if (!LOADED) {
    LOADED = true;
    await loadWASM(onigasm);
  }
}