export default function ansiConverter(input: string): string {
  const ANSI_RE = /\x1b\[(.*?)m/g;
  const fgColors: Record<number, string> = {
    30: 'black', 31: 'red', 32: 'green', 33: 'yellow',
    34: 'blue', 35: 'magenta', 36: 'cyan', 37: 'white',
    90: 'bright-black', 91: 'bright-red', 92: 'bright-green', 93: 'bright-yellow',
    94: 'bright-blue', 95: 'bright-magenta', 96: 'bright-cyan', 97: 'bright-white',
  };
  const bgColors: Record<number, string> = {
    40: 'black', 41: 'red', 42: 'green', 43: 'yellow',
    44: 'blue', 45: 'magenta', 46: 'cyan', 47: 'white',
    100: 'bright-black', 101: 'bright-red', 102: 'bright-green', 103: 'bright-yellow',
    104: 'bright-blue', 105: 'bright-magenta', 106: 'bright-cyan', 107: 'bright-white',
  };

  interface Styles {
    bold: boolean;
    faint: boolean;
    italic: boolean;
    underline: boolean;
    inverse: boolean;
    crossed: boolean;
    fg: string | null;
    bg: string | null;
  }

  let styles: Styles = {
    bold: false,
    faint: false,
    italic: false,
    underline: false,
    inverse: false,
    crossed: false,
    fg: null,
    bg: null,
  };

  function openSpan(): string {
    const classes: string[] = [];
    if (styles.bold) classes.push('ansi-bold');
    if (styles.faint) classes.push('ansi-faint');
    if (styles.italic) classes.push('ansi-italic');
    if (styles.underline) classes.push('ansi-underline');
    if (styles.crossed) classes.push('ansi-crossed');
    if (styles.inverse) classes.push('ansi-inverse');
    if (styles.fg) classes.push('ansi-fg-' + styles.fg);
    if (styles.bg) classes.push('ansi-bg-' + styles.bg);
    if (classes.length === 0) return '';
    return `<span class="${classes.join(' ')}">`;
  }

  function closeSpan(): string {
    return '</span>';
  }

  function applyCodes(codes: string[]): void {
    if (codes.length === 0) codes = ['0'];

    for (let codeStr of codes) {
      const code = parseInt(codeStr);
      if (code === 0) {
        styles = { bold: false, faint: false, italic: false, underline: false, inverse: false, crossed: false, fg: null, bg: null };
      } else if (code === 1) styles.bold = true;
      else if (code === 2) styles.faint = true;
      else if (code === 3) styles.italic = true;
      else if (code === 4) styles.underline = true;
      else if (code === 7) styles.inverse = true;
      else if (code === 9) styles.crossed = true;
      else if (code === 22) { styles.bold = false; styles.faint = false; }
      else if (code === 23) styles.italic = false;
      else if (code === 24) styles.underline = false;
      else if (code === 27) styles.inverse = false;
      else if (code === 29) styles.crossed = false;
      else if (code >= 30 && code <= 37) styles.fg = fgColors[code];
      else if (code === 39) styles.fg = null;
      else if (code >= 40 && code <= 47) styles.bg = bgColors[code];
      else if (code === 49) styles.bg = null;
      else if (code >= 90 && code <= 97) styles.fg = fgColors[code];
      else if (code >= 100 && code <= 107) styles.bg = bgColors[code];
    }
  }

  function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m] || m);
  }

  let result = '';
  let lastIndex = 0;
  let open = false;

  let match: RegExpExecArray | null;
  while ((match = ANSI_RE.exec(input)) !== null) {
    const textBefore = input.substring(lastIndex, match.index);
    if (textBefore) {
      if (open) result += closeSpan();
      if (styles.bold || styles.fg || styles.bg || styles.italic || styles.underline || styles.inverse || styles.crossed || styles.faint) {
        result += openSpan() + escapeHtml(textBefore);
        open = true;
      } else {
        result += escapeHtml(textBefore);
        open = false;
      }
    }

    const codes = match[1].split(';').filter(c => c.length > 0);
    applyCodes(codes);

    lastIndex = ANSI_RE.lastIndex;
  }

  const tail = input.substring(lastIndex);
  if (tail) {
    if (open) result += closeSpan();
    if (styles.bold || styles.fg || styles.bg || styles.italic || styles.underline || styles.inverse || styles.crossed || styles.faint) {
      result += openSpan() + escapeHtml(tail);
      open = true;
    } else {
      result += escapeHtml(tail);
      open = false;
    }
  }
  if (open) result += closeSpan();

  return result;
}
