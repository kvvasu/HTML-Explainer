// annot-css: the hand-drawn annotation (neat-annotations.css) as an opt-in look beside annot. The target text must sit inside
// the span, the note is the data-note attribute, and the stylesheet comes with the page only when the component is used.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COMPONENTS, ComponentError } from '../src/components/index.js';
import { renderDoc } from '../src/render.js';

const annot = COMPONENTS.get('annot-css');
const render = (text, args = '') => annot.render(text, { args });
const throwsAt = (text, args) => assert.throws(() => render(text, args), (e) => e instanceof ComponentError && e.line === 1);

test('annot-css: the target text sits inside the span and the note is its data-note', () => {
  const html = render('Close the [red valve]{before you drain} before you remove the pump.', 'ne amber');
  assert.match(html, /<span class="ann ann-ne ann-amber" data-note="before you drain">red valve<\/span>/);
  assert.match(html, /^<div class="am-annot-css"><p class="am-annot-css-line">Close the /);
  assert.match(html, /before you remove the pump\.<\/p><\/div>$/);
});

test('annot-css: the defaults are ne and amber, and the arguments pick the direction and color classes', () => {
  assert.match(render('[valve]{note}'), /class="ann ann-ne ann-amber"/);
  assert.match(render('[valve]{note}', 'sw purple'), /class="ann ann-sw ann-purple"/);
});

test('annot-css: several notes in one line and several lines in one block', () => {
  const html = render('Drain the [sump]{lowest point} first.\nThen remove the [pump]{two bolts}.');
  assert.equal(html.match(/class="ann ann-ne ann-amber"/g).length, 2);
  assert.equal(html.match(/am-annot-css-line/g).length, 2);
});

test('annot-css: the target and the note are escaped', () => {
  const html = render('[25 & 30]{check the "range" & the limit}');
  assert.match(html, />25 &amp; 30<\/span>/);
  assert.match(html, /data-note="check the &quot;range&quot; &amp; the limit"/);
});

test('annot-css: an empty note is a diagnostic, not an empty span', () => {
  throwsAt('[red valve]{}');
  assert.throws(() => render('[red valve]{  }'), (e) => e instanceof ComponentError && /the note for "red valve" is empty/.test(e.message));
});

test('annot-css: an empty target is a diagnostic', () => {
  assert.throws(() => render('[]{note}'), (e) => e instanceof ComponentError && /the brackets are empty|no annotation/.test(e.message));
});

test('annot-css: a block with no annotation says what to write', () => {
  throwsAt('Plain text with nothing to point at.');
});

test('annot-css: an unclosed annotation and an unknown argument are diagnostics', () => {
  assert.throws(() => render('[red valve]{note'), (e) => e instanceof ComponentError && /unclosed/.test(e.message));
  throwsAt('[a]{b}', 'sideways');
  throwsAt('[a]{b}', 'ne neon');
});

test('annot-css: the page carries the hand-drawn styles only when it uses the component, inlined and offline', () => {
  const source = '## A Valve\nPlain English text here.\n```annot-css ne amber\nClose the [red valve]{before you drain} first.\n```\n';
  const { html } = renderDoc(source);
  assert.match(html, /\.ann-amber \{/);
  assert.match(html, /--_ann-arrow-mask: url\("data:image\/svg\+xml/);
  assert.doesNotMatch(html, /<link[^>]+stylesheet/i);
  const plain = renderDoc('## A Valley\nPlain English text here.\n').html;
  assert.doesNotMatch(plain, /--ann-color/);
});

test('annot-css: the page mode decides the light or dark palette of the note', () => {
  const { html } = renderDoc('## A Valve\nPlain English text here.\n```annot-css\nClose the [red valve]{first}.\n```\n');
  assert.match(html, /html\[data-mode="dark"\] \.ann \{ color-scheme: dark; \}/);
  assert.match(html, /@media \(prefers-color-scheme: dark\) \{\s*html\[data-mode="auto"\] \.ann \{ color-scheme: dark; \}/);
});
