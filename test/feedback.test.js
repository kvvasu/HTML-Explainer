// The "Was this helpful?" row (src/render.js markup, src/runtime/feedback.js behavior). The vote stays in the page, so the test
// runs the runtime module against a small stand-in for the two buttons and checks what the page shows after each click.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderDoc } from '../src/render.js';
import { renderVideo } from '../src/video/render.js';

const RUNTIME = readFileSync(new URL('../src/runtime/feedback.js', import.meta.url), 'utf8');
const sectionOf = (html) => html.match(/<section class="am-feedback"[\s\S]*?<\/section>/)[0];

test('feedback: every page ends with the question and one button per vote', () => {
  const html = renderDoc('## A\nPlain English text here.\n').html;
  const section = sectionOf(html);
  assert.match(section, /data-am="feedback"/);
  assert.match(section, /data-thanks="Thanks for the feedback\."/);
  assert.match(section, /<p class="am-feedback-q">Was this helpful\?<\/p>/);
  assert.match(section, /data-vote="up" aria-pressed="false"[^>]*>.*?Yes</);
  assert.match(section, /data-vote="down" aria-pressed="false"[^>]*>.*?No</);
  assert.match(section, /role="status" aria-live="polite"/);
  // The script is inlined with the page script; the page has no script or style from another file.
  assert.match(html, /data-am="feedback"/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
});

test('feedback: the labels are the page language', () => {
  assert.match(sectionOf(renderDoc('## A\n这是中文正文。\n').html), /这个回答有帮助吗？/);
  assert.match(sectionOf(renderDoc('## A\n這是中文正文。\n').html), /這個回答有幫助嗎？/);
  assert.match(sectionOf(renderDoc('## A\nこれは日本語の本文です。\n').html), /この回答は役に立ちましたか？/);
});

test('feedback: a doc-template page carries it too, and a video does not', async () => {
  const doc = renderDoc('---\ntemplate: doc\n---\n## A\nPlain English text here.\n').html;
  assert.match(doc, /data-am="feedback"/);
  const video = (await renderVideo('---\ntitle: T\n---\n## A\n> Narration only.\n')).html;
  assert.doesNotMatch(video, /data-am="feedback"/);
});

test('feedback: the vote uses the theme accent tokens, so it follows wada and every other theme in both modes', () => {
  const css = renderDoc('## A\nPlain English text here.\n').html.match(/<style>([\s\S]*?)<\/style>/)[1];
  assert.match(css, /\.am-feedback-btn\[aria-pressed="true"\] \{ color: var\(--accent\); background: var\(--accent-bg\); border-color: var\(--accent\); \}/);
  assert.match(css, /\.am-feedback \{[\s\S]*?border-top: 1px solid var\(--line-2\)/);
  // Page chrome sets no colors of its own.
  assert.doesNotMatch(css.match(/\.am-feedback[^{]*\{[^}]*\}/g).join(''), /#[0-9a-f]{3,8}\b/i);
  // The wada theme defines both tokens the pressed vote reads.
  const wada = renderDoc('## A\nPlain English text here.\n', { theme: 'wada' }).html;
  assert.match(wada, /html\[data-theme="wada"\]\[data-mode="light"\] \{[\s\S]*--accent: #11636b;[\s\S]*--accent-bg: #dcf0f1;/);
});

// A stand-in for the two buttons, so the runtime module runs without a browser.
function fixture() {
  const attributes = (init) => {
    const values = new Map(Object.entries(init));
    const handlers = [];
    return {
      getAttribute: (name) => (values.has(name) ? values.get(name) : null),
      setAttribute: (name, value) => values.set(name, String(value)),
      addEventListener: (_type, handler) => handlers.push(handler),
      click: () => handlers.forEach((handler) => handler()),
    };
  };
  const up = attributes({ 'aria-pressed': 'false' });
  const down = attributes({ 'aria-pressed': 'false' });
  const status = { textContent: '' };
  const box = {
    dataset: { thanks: 'Thanks for the feedback.' },
    querySelectorAll: (selector) => (selector === 'button[data-vote]' ? [up, down] : []),
    querySelector: (selector) => (selector === '.am-feedback-status' ? status : null),
  };
  return { document: { querySelector: (selector) => (selector === '[data-am="feedback"]' ? box : null) }, up, down, status };
}

test('feedback: a vote presses one button, a second vote moves it, and a third click takes it back', () => {
  const page = fixture();
  new Function('document', RUNTIME)(page.document);

  assert.equal(page.up.getAttribute('aria-pressed'), 'false');
  assert.equal(page.status.textContent, '');

  page.up.click();
  assert.equal(page.up.getAttribute('aria-pressed'), 'true', 'the up vote is pressed');
  assert.equal(page.down.getAttribute('aria-pressed'), 'false');
  assert.equal(page.status.textContent, 'Thanks for the feedback.');

  page.down.click();
  assert.equal(page.up.getAttribute('aria-pressed'), 'false', 'one vote at a time');
  assert.equal(page.down.getAttribute('aria-pressed'), 'true');
  assert.equal(page.status.textContent, 'Thanks for the feedback.');

  page.down.click();
  assert.equal(page.down.getAttribute('aria-pressed'), 'false', 'clicking the pressed vote takes it back');
  assert.equal(page.up.getAttribute('aria-pressed'), 'false');
  assert.equal(page.status.textContent, '');
});

test('feedback: a page without the row runs the module and changes nothing', () => {
  const calls = [];
  const document = { querySelector: (selector) => { calls.push(selector); return null; } };
  new Function('document', RUNTIME)(document);
  assert.deepEqual(calls, ['[data-am="feedback"]']);
});
