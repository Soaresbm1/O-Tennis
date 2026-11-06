// Development-only verification. Dependencies live in ignored .wordpress-qa/.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '../..');
const qaRequire = createRequire(path.join(root, '.wordpress-qa/package.json'));
const { JSDOM } = qaRequire('jsdom');
const dom = new JSDOM('', { url: 'https://otennis.test/' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MutationObserver', 'DOMParser', 'File', 'FileReader', 'Blob']) {
  Object.defineProperty(globalThis, key, { value: dom.window[key], configurable: true });
}
globalThis.getComputedStyle = dom.window.getComputedStyle;
globalThis.requestAnimationFrame = fn => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = clearTimeout;
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
const { registerCoreBlocks } = qaRequire('@wordpress/block-library');
const { parse, registerBlockType } = qaRequire('@wordpress/blocks');
const php = qaRequire('php-parser');
registerCoreBlocks();
registerBlockType('otennis/map', {
  apiVersion: 3, title: 'Carte', category: 'embed',
  attributes: { address: { type: 'string' } }, edit: () => null, save: () => null
});
const theme = path.join(root, 'wordpress/otennis');
let count = 0;
function walkBlocks(blocks, label) {
  for (const block of blocks) {
    count++;
    if (!block.isValid || block.name === 'core/freeform' || block.name === 'core/html') {
      throw new Error(`Invalid/nonvisual block in ${label}: ${block.name}\n${block.originalContent}`);
    }
    walkBlocks(block.innerBlocks, label);
  }
}
for (const file of fs.readdirSync(path.join(theme, 'content'))) {
  const source = fs.readFileSync(path.join(theme, 'content', file), 'utf8')
    .replaceAll('{{HOME_URL}}', 'https://otennis.test/')
    .replaceAll('{{MENU_URL}}', 'https://otennis.test/menu/')
    .replace(/\{\{MEDIA:([^}]+)\}\}/g, (_, key) => 'https://otennis.test/wp-content/uploads/' + key);
  walkBlocks(parse(source), file);
}
function allFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? allFiles(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
for (const file of allFiles(theme).filter(file => file.endsWith('.php'))) {
  php.parseCode(fs.readFileSync(file, 'utf8'), file, { parser: { phpVersion: '8.3' } });
}
for (const file of allFiles(path.join(theme, 'templates')).filter(file => file.endsWith('.html'))) {
  walkBlocks(parse(fs.readFileSync(file, 'utf8')), path.basename(file));
}
console.log(`PASS: ${count} native WordPress blocks are valid; all PHP files parse.`);
process.exit(0);
