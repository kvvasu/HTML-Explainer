// ai-figure: a second diagram engine beside flow / sequence / tree, for the figure types this repository does not draw.
// The library's minified browser build is carried as a string and compiled on the first aifig block, the way the CLI loads
// Temml (scripts/build.mjs): Node compiles every top-level module on start, and a draft without an aifig block should not pay
// for 158 KB of diagram code. A browser build works in both places, so this needs no node: builtin.

import { AIFIG_JS } from './assets.js';

let engine = null;

// The parsed ai-figure module: { fig, parseFigmd }. A build without the library (the website's preview engine, site/build.mjs)
// carries an empty string and says so, instead of failing on an undefined name.
export function aifigure() {
  if (!engine) {
    if (!AIFIG_JS) throw new Error('aifig is not available in this build of the page renderer');
    engine = new Function(`${AIFIG_JS}\nreturn AiFigure;`)();
  }
  return engine;
}
