// Hand-drawn annotations (neat-annotations.css, vendored in src/themes/annot-css.css): a highlighted span, a hand-drawn
// arrow and a handwritten label. This is the opt-in alternative to annot, which draws bracket lines under a sentence and is
// still the better tool for a long annotated sentence; annot-css is for one or two notes that point at a word or a phrase.
// The class contract is the library's: `ann`, one direction (ann-ne …), one color (ann-amber …), and data-note as the label.
// The target text goes INSIDE the span: the arrow points at the span's box, so an empty span points at nothing.
import { esc } from '../svg/text.js';
import { ComponentError, contentLines } from './error.js';

const DIRS = new Set(['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']);
const COLORS = new Set(['amber', 'blue', 'green', 'red', 'purple', 'rainbow']);
// The brackets may be empty, so an empty target gets its own message instead of reading as an unclosed annotation.
const SEG = /\[([^\]]*)\]\{([^}]*)\}/g;
// The opening of an annotation, closed or not, so the caller can tell a block with nothing to draw from a broken one.
const OPENS = /\[[^\]]*\]\{/;

export default {
  name: 'annot-css',
  summary: 'Hand-drawn annotation: arrow + handwritten label (opt-in look)',
  syntax: `\`\`\`annot-css [n|ne|e|se|s|sw|w|nw] [amber|blue|green|red|purple|rainbow]
Write the [words to annotate]{the note that points at them} in a sentence.
A line without brackets is plain text.
\`\`\`
- Defaults: direction ne (up and to the right), color amber. The arrow is drawn outside the span and points at it.
- The note is a visual label, so do not put information there that the text does not also say.
- For a long sentence with several notes, use annot: it places the notes on separate rows instead of overlapping them.`,
  example: '```annot-css ne amber\nClose the [red valve]{before you drain} before you remove the pump.\n```',
  render(text, { args = '' } = {}) {
    const [dirArg = '', colorArg = ''] = args.split(/\s+/).filter(Boolean);
    if (dirArg && !DIRS.has(dirArg.toLowerCase())) {
      throw new ComponentError(`annot-css: "${dirArg}" is not a direction. Use one of: ${[...DIRS].join(', ')}`, 1);
    }
    if (colorArg && !COLORS.has(colorArg.toLowerCase())) {
      throw new ComponentError(`annot-css: "${colorArg}" is not a color. Use one of: ${[...COLORS].join(', ')}`, 1);
    }
    const dir = (dirArg || 'ne').toLowerCase();
    const color = (colorArg || 'amber').toLowerCase();

    const lines = contentLines(text);
    if (!lines.length) throw new ComponentError('annot-css needs at least one line', 1);
    // A block with no annotation has nothing to draw; say so instead of rendering plain paragraphs.
    if (!lines.some(({ text: t }) => OPENS.test(t))) {
      throw new ComponentError('annot-css: no annotation in the block. Write the words in brackets and the label in braces: [words]{note}', 1);
    }
    const body = lines.map(({ text: t, line }) => `<p class="am-annot-css-line">${lineHtml(t, line, dir, color)}</p>`);
    return `<div class="am-annot-css">${body.join('')}</div>`;
  },
};

function lineHtml(sentence, line, dir, color) {
  const stripped = sentence.replace(SEG, '');
  if (/\[[^\]]*\]\{|\]\{[^}]*$/.test(stripped)) {
    throw new ComponentError(`annot-css has an unclosed annotation; expected [words]{note}: "${sentence}"`, line);
  }
  let out = '';
  let last = 0;
  SEG.lastIndex = 0;
  for (const m of sentence.matchAll(SEG)) {
    const [whole, target, note] = m;
    const text = target.trim();
    const label = note.trim();
    if (!text) throw new ComponentError(`annot-css: the brackets are empty. Write the words the note points at: [words]{note}`, line);
    if (!label) throw new ComponentError(`annot-css: the note for "${text}" is empty. Write it in the braces: [${text}]{note}`, line);
    out += esc(sentence.slice(last, m.index));
    out += `<span class="ann ann-${dir} ann-${color}" data-note="${esc(label)}">${esc(text)}</span>`;
    last = m.index + whole.length;
  }
  return out + esc(sentence.slice(last));
}
