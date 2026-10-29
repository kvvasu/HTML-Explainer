// aifig: the ai-figure engine beside flow / sequence / tree. fig() never throws on a markdown string, so the component
// validates the block itself and every bad block must be a ComponentError with a line, never a blank 1x1 svg on the page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS, ComponentError } from '../src/components/index.js';
import { renderDoc } from '../src/render.js';

const aifig = COMPONENTS.get('aifig');
const ctx = (extra = {}) => ({ args: '', uid: (() => { let n = 0; return () => `u${++n}`; })(), ui: {}, dir: 'ltr', ...extra });
const render = (text, extra) => aifig.render(text, ctx(extra));
const throwsAt = (text, line) => assert.throws(() => render(text), (e) => e instanceof ComponentError && e.line === line);

const FLOW = 'figure flow\ndirection: LR\nstart((Start)) --> login[Login]\nlogin --> dashboard[Dashboard]: sign in';
const ARCH = 'figure arch\nlayer Frontend\n  ui[React App]\nlayer Backend\n  api[REST API]';

test('aifig: a flow draws an svg with text and links, inside a diagram figure', () => {
  const html = render(FLOW);
  assert.match(html, /^<figure class="am-diagram am-aifig am-aifig--flow" role="img" aria-label="Figure: flow, Start, Login, Dashboard"/);
  assert.match(html, /<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(html, /<text[^>]*>Login<\/text>/);
  assert.match(html, /<g class="edge"/);
  assert.match(html, /<\/figure>$/);
});

test('aifig: an arch stack draws its layers', () => {
  const html = render(ARCH);
  assert.match(html, /am-aifig--arch/);
  assert.match(html, /React App/);
  assert.match(html, /REST API/);
  assert.match(html, /<\/svg>/);
});

test('aifig: a block without the figure header names the expected first line and its line number', () => {
  assert.throws(() => render('## not a header\nA --> B'), (e) => e instanceof ComponentError && e.line === 1 && /the first line must be "figure <type>"/.test(e.message));
  assert.throws(() => render('%% comment\nA --> B'), (e) => e instanceof ComponentError && e.line === 2);
});

test('aifig: an unknown figure type lists the 13 valid types', () => {
  assert.throws(() => render('figure flowchart\nA --> B'), (e) => e instanceof ComponentError && /"flowchart" is not a figure type/.test(e.message) && /radar/.test(e.message));
});

test('aifig: a header with no data line is a diagnostic, not a blank drawing', () => {
  throwsAt('figure flow', 1);
  assert.throws(() => render('figure flow\ndirection: LR'), (e) => e instanceof ComponentError && /drew nothing/.test(e.message));
});

test('aifig: empty input is a diagnostic', () => {
  throwsAt('', 1);
  throwsAt('   ', 1);
});

test('aifig: the block is the library markdown DSL, never a JSON attribute', () => {
  // A JSON config is the path that throws in fig(); the component only accepts the DSL.
  assert.throws(() => render('{"figure":"flow"}'), (e) => e instanceof ComponentError && e.line === 1);
});

test('aifig: a bad block is reported with the component and the draft line of the block', () => {
  const source = '## A Good\nPlain English text here.\n```flow\nA -> B\n```\n\n## B Broken\n```aifig\nfigure nope\nA --> B\n```\n\n## C After\nMore plain English text.\n';
  // The error names the component and the line of the bad block (the header, on line 9), not the page as a whole.
  assert.throws(() => renderDoc(source), (e) => e.name === 'RenderError' && e.component === 'aifig' && e.line === 9 && /not a figure type/.test(e.message));
});

test('aifig: the figure carries its own scoped styles, so it themes itself and the page adds none', () => {
  const html = renderDoc(`## A Flow\nPlain English text here.\n\`\`\`aifig\n${FLOW}\n\`\`\`\n`).html;
  const svg = html.match(/<svg class="am-aifig-svg"[\s\S]*?<\/svg>/)[0];
  assert.match(svg, /^<svg class="am-aifig-svg"[^>]*><style>/);
  // Scoped to this svg: a style element inside inline svg is not confined to it, so every rule names the root class.
  const rules = svg.match(/<style>([\s\S]*?)<\/style>/)[1].trim().split('\n').filter((l) => l.includes('{') && !l.startsWith('@'));
  assert.ok(rules.length >= 4);
  for (const rule of rules) assert.match(rule, /^\.am-aifig-svg /, rule);
  // The page stylesheet stays free of aifig rules: the figure needs no page-level CSS.
  const pageCss = html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.doesNotMatch(pageCss, /\.am-aifig/);
});

test('aifig: nodes, edges and text take the theme diagram tokens in both modes', () => {
  const svg = render(FLOW).match(/<svg[\s\S]*<\/svg>/)[0];
  assert.match(svg, /fill: var\(--node-text, var\(--ink/);
  assert.match(svg, /fill: var\(--node-fill, var\(--paper/);
  assert.match(svg, /stroke: var\(--node-stroke, var\(--line/);
  assert.match(svg, /stroke: var\(--edge-color, var\(--ink-2/);
  // The attributes are rewritten too, so a viewer that drops the style element (a copy into another document) still themes.
  assert.match(svg, /<rect[^>]*fill="var\(--node-fill, var\(--paper, #ffffff\)\)"/);
  assert.match(svg, /<path[^>]*stroke="var\(--edge-color, var\(--ink-2, #4b5260\)\)"/);
  assert.match(svg, /<marker[^>]*>\s*<polygon[^>]*fill="var\(--edge-color/);
});

test('aifig: the figure types the library gives no classes are recolored as well', () => {
  // An arch stack: the layer and its node are boxes, the header line belongs to the drawing.
  const arch = render(ARCH).match(/<svg[\s\S]*<\/svg>/)[0];
  assert.match(arch, /<rect[^>]*fill="var\(--node-fill, var\(--paper, #ffffff\)\)"[^>]*stroke="var\(--node-stroke/);
  // A bubble: the label sits on the bubble, so its surface is a node surface, not a border color.
  const bubble = render('figure bubble\nProduct A: 75\nProduct B: 50').match(/<svg[\s\S]*<\/svg>/)[0];
  assert.match(bubble, /<circle[^>]*fill="var\(--node-fill/);
  assert.doesNotMatch(bubble, /fill="#[0-9a-f]{6}"/i, 'no palette color is left on a shape');
  // A radar is the exception: a color tells its series apart, so the series keep their identity through --series-N.
  const radar = render('figure radar\naxes: Performance, DX, Ecosystem\nReact: 75, 80, 90\nVue: 82, 72, 90').match(/<svg[\s\S]*<\/svg>/)[0];
  assert.match(radar, /stroke="var\(--series-1, #[0-9a-f]{6}\)"/);
  assert.match(radar, /stroke="var\(--series-2, #[0-9a-f]{6}\)"/);
  assert.match(radar, /<circle[^>]*fill="var\(--series-1/);
  assert.match(radar, /stroke="var\(--paper, #ffffff\)"/, 'the ring around a point is the paper');
});

test('aifig: a theme that sets a diagram token recolors the figure, and two figures on a page do not collide', () => {
  const source = `## A\nPlain English text here.\n\`\`\`aifig\n${FLOW}\n\`\`\`\n\n## B\nMore plain English text.\n\`\`\`aifig\n${ARCH}\n\`\`\`\n`;
  const html = renderDoc(source, { theme: 'wada' }).html;
  assert.equal((html.match(/<svg class="am-aifig-svg"/g) ?? []).length, 2);
  for (const svg of html.match(/<svg class="am-aifig-svg"[\s\S]*?<\/svg>/g)) assert.match(svg, /var\(--node-fill/);
});

test('aifig: a right-to-left page marks the figure', () => {
  assert.match(render(FLOW, { dir: 'rtl' }), /aria-label="[^"]*" dir="rtl"/);
});

test('aifig: the figure stays offline: no external style, font or image', () => {
  const html = renderDoc(`## A\nPlain English text here.\n\`\`\`aifig\n${FLOW}\n\`\`\`\n`).html;
  assert.doesNotMatch(html, /<link[^>]+stylesheet/i);
  assert.doesNotMatch(html, /@import|url\(\s*['"]?https?:/i);
  assert.doesNotMatch(html, /font-family="Inter/);
  assert.match(html, /<text[^>]*fill="var\(--node-text/);
});
