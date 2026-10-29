// Wada: the Sanzo Wada mid-century print palette (combination 176 of "A Dictionary of Color Combinations":
// Hermosa Pink #f9c1ce, Seashell Pink #fdd4bd, Calamine Blue #78cdd0). Warm paper, a pink wash and a teal accent;
// the three pastel colors are too light for text, so each keeps its hue and is darkened for the roles it fills.
import { SANS, MONO } from './fonts.js';

export default {
  name: 'wada',
  summary: 'Sanzo Wada palette',
  label: { zh: '和田配色', 'zh-Hant': '和田配色', en: 'Wada', ja: '和田配色', he: 'ואדה' }, // lang-ok: viewer-facing theme labels
  scope: ['page', 'video'],
  tokens: {
    common: { '--font-sans': SANS, '--font-mono': MONO, '--radius': '4px', '--shadow': 'none', '--bw': '1.5px', '--head-font': 'var(--font-sans)' },
    light: {
      '--bg': '#fbf1ee', '--paper': '#fffdfc', '--ink': '#241a1a', '--ink-2': '#5b4645', '--ink-3': '#94807e',
      '--line': '#2a1e1e', '--line-2': '#eed9d5', '--fill': '#f9ebe7',
      '--accent': '#11636b', '--accent-bg': '#dcf0f1',
      '--ok': '#1c6448', '--ok-bg': '#ddf0e6', '--err': '#9c2540', '--err-bg': '#fbe1e6',
      '--warn': '#85500d', '--warn-bg': '#fbeedb', '--head-bg': '#241a1a', '--head-fg': '#fffdfc',
    },
    dark: {
      '--bg': '#161112', '--paper': '#1f1819', '--ink': '#f7ebe7', '--ink-2': '#cbb6b2', '--ink-3': '#957f7c',
      '--line': '#e9d3ce', '--line-2': '#3b2c2e', '--fill': '#2a2022',
      '--accent': '#7ed8dd', '--accent-bg': '#123237',
      '--ok': '#86d3a9', '--ok-bg': '#17342a', '--err': '#f5939f', '--err-bg': '#3d1b22',
      '--warn': '#edbd77', '--warn-bg': '#3a2b12', '--head-bg': '#f7ebe7', '--head-fg': '#161112',
    },
  },
};
