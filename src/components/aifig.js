// ai-figure figures: an additional diagram engine beside flow / sequence / tree (it does not replace them), for the figure
// types this repository does not draw: mindmap, arch, quadrant, gantt, state, swimlane, bubble, radar.
// The body is the library's own markdown DSL, which the model already writes and which fig() reads without coordinates.
// fig() never throws on a markdown string (a typo or an empty block returns a blank 1x1 svg), so this component validates the
// block itself: a bad aifig block must be a ComponentError with the line, not a blank drawing on the page.
//
// The library draws with its own palette and a fixed light or dark theme, and a page switches mode while it is open, so the
// figure is re-colored after fig() returns: the picture then follows the page theme like flow and tree do (--node-*, --edge-*)
// and reads in both modes. Two mechanisms, because the library writes the colors two ways:
//   - text and the .node / .edge groups: a <style> element at the top of the svg (scoped to .am-aifig-svg, because a style
//     element inside inline svg is not confined to it);
//   - the shapes of the other figure types: their fill / stroke presentation attributes are rewritten to the same tokens.
// A radar keeps its series apart through --series-1..6 (a color is the only thing that tells two radar series apart).
import { diagramLabel } from '../svg/shapes.js';
import { esc } from '../svg/text.js';
import { aifigure } from '../aifigure.js';
import { ComponentError, contentLines } from './error.js';

const FIGURES = [
  'flow', 'tree', 'mindmap', 'arch', 'sequence', 'quadrant', 'gantt',
  'state', 'er', 'timeline', 'swimlane', 'bubble', 'radar',
];
const HEADER = /^figure\s+([A-Za-z]+)\s*$/;
const COMMENT = /^%%/;

// The token chains are the ones base.css uses for its own diagrams, fallbacks included, so a theme that sets no diagram token
// draws the figure the way it draws flow: on its paper, with its ink.
const NODE_FILL = 'var(--node-fill, var(--paper, #ffffff))';
const NODE_STROKE = 'var(--node-stroke, var(--line, #1d2026))';
const EDGE = 'var(--edge-color, var(--ink-2, #4b5260))';
const NODE_TEXT = 'var(--node-text, var(--ink, #16181d))';
const PAPER = 'var(--paper, #ffffff)';

const STYLE = `<style>
.am-aifig-svg text { font-family: inherit; fill: ${NODE_TEXT}; }
.am-aifig-svg .node rect, .am-aifig-svg .node circle, .am-aifig-svg .node ellipse, .am-aifig-svg .node polygon { fill: ${NODE_FILL}; stroke: ${NODE_STROKE}; }
.am-aifig-svg .edge path, .am-aifig-svg .edge line { stroke: ${EDGE}; }
.am-aifig-svg marker polygon { fill: ${EDGE}; }
</style>`;

export default {
  name: 'aifig',
  summary: 'Diagram from the ai-figure DSL (13 figure types)',
  syntax: `\`\`\`aifig
figure <type>              ← flow, tree, mindmap, arch, sequence, quadrant, gantt,
                             state, er, timeline, swimlane, bubble or radar
title: One line            ← optional; subtitle, direction (TB | LR), palette (figma, antv, …)
A[Source] --> B[Target]    ← the lines the type needs: nodes and links, actors and messages, rows…
\`\`\`
- Use flow / sequence / er / timeline when one of those components fits: they take the theme's diagram tokens and change markers.
- aifig is for a figure they cannot draw: a mindmap, an arch stack, a quadrant, a gantt or a swimlane.
- The colors are the page theme's: nodes, edges and text follow it in light and dark. A radar keeps its series apart with the
  theme's --series-1 to --series-6 when it sets them.`,
  example: '```aifig\nfigure flow\ndirection: LR\nstart((Start)) --> login[Login]\nlogin --> dashboard[Dashboard]: sign in\n```',
  render(text, { ui = {}, dir = 'ltr' } = {}) {
    const lines = contentLines(text).filter(({ text: t }) => !COMMENT.test(t));
    if (!lines.length) throw new ComponentError('aifig is empty: start with "figure <type>"', 1);
    const head = lines[0].text.match(HEADER);
    if (!head) {
      throw new ComponentError(`aifig: the first line must be "figure <type>", one of: ${FIGURES.join(', ')}. The line "${lines[0].text}" is not`, lines[0].line);
    }
    const type = head[1].toLowerCase();
    if (!FIGURES.includes(type)) {
      throw new ComponentError(`aifig: "${head[1]}" is not a figure type. Use one of: ${FIGURES.join(', ')}`, lines[0].line);
    }
    if (lines.length < 2) {
      throw new ComponentError(`aifig: figure ${type} needs at least one line after the header, for example "A[Start] --> B[End]"`, 1);
    }

    let engine;
    let svg;
    let names;
    try {
      engine = aifigure();
      names = nodeNames(engine, text);
      svg = engine.fig(text);
    } catch (err) {
      throw new ComponentError(`aifig: ${err.message}. Write the ai-figure DSL: "figure <type>", then one node or data line per line`, 1);
    }
    // A block the library cannot read comes back as a small empty svg with no text. Say what to fix, not show a blank figure.
    if (!/<text[\s>]/.test(svg)) {
      throw new ComponentError(`aifig: figure ${type} drew nothing. Check the lines after "figure ${type}" against the ai-figure syntax (a node is A[Text], a link is A --> B: label)`, 1);
    }

    const label = diagramLabel(ui, 'aifig', [type, ...names]);
    return `<figure class="am-diagram am-aifig am-aifig--${type}" role="img" aria-label="${esc(label)}"${dir === 'rtl' ? ' dir="rtl"' : ''}>${themed(svg, type)}</figure>`;
  },
};

// The svg with its own stylesheet and the page theme's colors.
function themed(svg, type) {
  const marked = svg.replace(/^<svg\b/, '<svg class="am-aifig-svg"');
  const colored = recolor(marked, type);
  return colored.replace(/^(<svg\b[^>]*>)/, `$1${STYLE}`);
}

const SKIP_TAG = /^(style|stop)$/i;
const TEXT_TAG = /^(text|tspan)$/i;
// A value the figure does not color: none, a gradient or filter reference, a translucent color of its own, or no hex at all.
const NOT_A_COLOR = /^(none|transparent|currentcolor|url\(|rgba?\()/i;

// One color, read as what the drawing uses it for. A hex value carries its role well enough to recolor every figure type,
// including the ones the library gives no classes: a light tint is a node's surface, a gray is a line or an axis, and a
// saturated color is a border, a bar or a series.
function roleOf(value) {
  const v = value.trim().toLowerCase();
  if (v === 'white' || v === '#fff' || v === '#ffffff') return 'paper';
  if (NOT_A_COLOR.test(v)) return null;
  const rgb = hexRgb(v);
  if (!rgb) return null;
  const { s, l } = saturationAndLightness(rgb);
  if (s < 0.12) return 'line';
  if (l > 0.85) return 'surface';
  return 'strong';
}

function hexRgb(value) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(value);
  if (!m) return null;
  const hex = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

function saturationAndLightness(rgb) {
  const [r, g, b] = rgb.map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  return { s: d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l };
}

// The token for one attribute. A radar's saturated colors are its series, so they keep their identity through --series-N;
// in every other figure a saturated color is a border or a mark, and a bubble's surface (its label sits on it) is a surface.
function tokenFor(role, kind, type, value, series) {
  if (role === 'paper') return PAPER;
  if (role === 'line') return EDGE;
  if (role === 'surface') return NODE_FILL;
  if (type === 'radar') {
    if (!series.has(value)) series.set(value, (series.size % 6) + 1);
    return `var(--series-${series.get(value)}, ${value})`;
  }
  if (type === 'bubble' && kind === 'fill') return NODE_FILL;
  return NODE_STROKE;
}

// Rewrite the fill / stroke of every shape, tag by tag. Text becomes the node text color whatever the library wrote on it
// (white on a bubble, dark blue on a box: the surface under it is a node surface now), and loses the library's font stack,
// which the page font replaces.
function recolor(svg, type) {
  const series = new Map();
  return svg.replace(/<([a-zA-Z][\w:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (tag, name, attrs) => {
    if (SKIP_TAG.test(name)) return tag;
    if (TEXT_TAG.test(name)) {
      const text = attrs
        .replace(/\s+font-family="[^"]*"/g, '')
        .replace(/\bfill="([^"]*)"/g, `fill="${NODE_TEXT}"`);
      return `<${name}${text}>`;
    }
    const out = attrs.replace(/\b(fill|stroke)="([^"]*)"/g, (whole, kind, value) => {
      const role = roleOf(value);
      return role ? `${kind}="${tokenFor(role, kind, type, value.trim().toLowerCase(), series)}"` : whole;
    });
    return `<${name}${out}>`;
  });
}

// The first node labels, for the figure's accessible name. A figure type that has no nodes (a gantt, a quadrant) gives none.
function nodeNames(engine, text) {
  try {
    const config = engine.parseFigmd(text);
    return (config?.nodes ?? []).map((n) => n.label).filter(Boolean).slice(0, 8);
  } catch {
    return [];
  }
}
