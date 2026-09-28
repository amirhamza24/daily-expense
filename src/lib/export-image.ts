import { toJpeg, toPng } from 'html-to-image';

export type ImageFormat = 'png' | 'jpg';

/** Mark elements with `data-export-ignore` to leave them out of the image (buttons, footers…). */
const isIgnored = (el: Element) => el instanceof HTMLElement && el.dataset.exportIgnore !== undefined;

/** "Weekly groceries!" -> "weekly-groceries" (keeps non-Latin letters such as Bangla). */
export function toFileSlug(value: string) {
  return (
    value
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'details'
  );
}

/**
 * Renders a DOM node to a PNG/JPG data URL. Uses the browser's own renderer
 * (SVG foreignObject), so Tailwind v4 colors (oklch, color-mix) and CSS
 * variables for light/dark themes come out exactly as on screen.
 */
/** Computed colors come back as "rgba(0, 0, 0, 0)" / "transparent" when nothing is painted. */
const isTransparent = (color: string) =>
  !color || color === 'transparent' || /^rgba\(.*,\s*0(\.0+)?\)$/.test(color);

/** First non-transparent background of the node or its ancestors, else white. */
function solidBackground(node: HTMLElement) {
  for (let el: HTMLElement | null = node; el; el = el.parentElement) {
    const bg = getComputedStyle(el).backgroundColor;
    if (!isTransparent(bg)) return bg;
  }
  return '#ffffff';
}

export async function renderNode(
  node: HTMLElement,
  format: ImageFormat,
  opts: { backgroundColor?: string } = {},
) {
  // Ignored direct children (e.g. a footer) still take space in scrollHeight
  const ignoredHeight = Array.from(node.children)
    .filter(isIgnored)
    .reduce((sum, el) => sum + (el as HTMLElement).offsetHeight, 0);

  const options = {
    pixelRatio: Math.min(3, Math.max(2, window.devicePixelRatio || 1)),
    // Always solid: a transparent canvas turns black in JPG (and in many PNG viewers)
    backgroundColor: opts.backgroundColor ?? solidBackground(node),
    width: node.offsetWidth,
    height: node.scrollHeight - ignoredHeight,
    // Undo on-screen constraints: scroll clipping, entrance animation
    style: { maxHeight: 'none', overflow: 'visible', animation: 'none', transform: 'none', margin: '0' },
    filter: (el: HTMLElement) => !isIgnored(el),
  };

  const render = (opts: typeof options & { skipFonts?: boolean }) =>
    format === 'png' ? toPng(node, opts) : toJpeg(node, { ...opts, quality: 0.95 });

  try {
    return await render(options);
  } catch {
    // Font embedding can fail on some networks/browsers; fall back to system fonts
    return render({ ...options, skipFonts: true });
  }
}

function triggerDownload(href: string, fileName: string) {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadNodeAsImage(
  node: HTMLElement,
  fileName: string,
  format: ImageFormat,
  opts: { backgroundColor?: string } = {},
) {
  triggerDownload(await renderNode(node, format, opts), `${fileName}.${format}`);
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Multi-page A4 PDF of a node. Pages break at the bottom edge of elements
 * marked `data-report-section` where possible, so sections aren't cut in half.
 */
export async function downloadNodeAsPdf(node: HTMLElement, fileName: string) {
  const [{ jsPDF }, dataUrl] = await Promise.all([
    import('jspdf'),
    renderNode(node, 'png', { backgroundColor: '#ffffff' }),
  ]);
  const img = await loadImage(dataUrl);

  // Section bottoms in CSS px relative to the node, converted to image px
  const scaleToImg = img.width / node.offsetWidth;
  const nodeTop = node.getBoundingClientRect().top;
  const breaks = Array.from(node.querySelectorAll<HTMLElement>('[data-report-section]'))
    .map((el) => (el.getBoundingClientRect().bottom - nodeTop) * scaleToImg)
    .sort((a, b) => a - b);

  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const contentW = pageW - margin * 2;
  const ptPerPx = contentW / img.width;
  const pagePx = (pageH - margin * 2) / ptPerPx;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  let y = 0;
  let first = true;

  while (y < img.height - 1) {
    let sliceEnd = Math.min(img.height, y + pagePx);
    if (sliceEnd < img.height) {
      // Prefer the last section boundary that fits, if it leaves the page at least 40% full
      const fit = breaks.filter((b) => b > y + pagePx * 0.4 && b <= sliceEnd).pop();
      if (fit) sliceEnd = fit;
    }
    const sliceH = Math.ceil(sliceEnd - y);

    canvas.width = img.width;
    canvas.height = sliceH;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, y, img.width, sliceH, 0, 0, img.width, sliceH);

    if (!first) pdf.addPage();
    first = false;
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentW, sliceH * ptPerPx);
    y = sliceEnd;
  }

  pdf.save(`${fileName}.pdf`);
}
