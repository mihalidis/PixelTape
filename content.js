'use strict';

// ─── Guard: don't inject twice ────────────────────────────────────────────────
if (window.__pixelTapeInjected) {
  // Already injected, just respond to messages
} else {
  window.__pixelTapeInjected = true;

  // ─── State ──────────────────────────────────────────────────────────────────
  let mode        = null; // 'ruler' | 'picker' | null
  let startPoint  = null; // { x, y } for ruler
  let overlayEl   = null;
  let selectionEl = null;
  let tooltipEl   = null;
  let escHintEl   = null;
  let startMarkerEl = null;
  let colorTooltipEl = null;
  let liveWriteAt   = 0; // throttle için son storage yazma zamanı

  // ─── Message listener ────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'ping') {
      sendResponse({ pong: true });
      return;
    }
    if (message.action === 'getStatus') {
      sendResponse({
        rulerActive: mode === 'ruler',
        outlineActive: !!document.getElementById('pt-pesticide-style'),
      });
      return;
    }
    if (message.action === 'startRuler') startRuler();
    if (message.action === 'stopRuler')  stopAll();
    if (message.action === 'startPicker') startPicker();
    if (message.action === 'startOutline') startOutline();
    if (message.action === 'stopOutline')  stopOutline();
    sendResponse({});
  });

  // ─── OUTLINE (Pesticide-style) ───────────────────────────────────────────────
  const PESTICIDE_CSS = `
    body          { outline: 1px solid #9575cd !important; }
    article       { outline: 1px solid #ec407a !important; }
    nav           { outline: 1px solid #7e57c2 !important; }
    aside         { outline: 1px solid #a0357a !important; }
    section       { outline: 1px solid #f48fb1 !important; }
    header        { outline: 1px solid #b39ddb !important; }
    footer        { outline: 1px solid #d81b60 !important; }
    main          { outline: 1px solid #5c42a8 !important; }
    h1            { outline: 1px solid #4caf96 !important; }
    h2            { outline: 1px solid #66bb9a !important; }
    h3            { outline: 1px solid #26a69a !important; }
    h4            { outline: 1px solid #00897b !important; }
    h5            { outline: 1px solid #00695c !important; }
    h6            { outline: 1px solid #2d7d6a !important; }
    p             { outline: 1px solid #9b8dbf !important; }
    span          { outline: 1px solid #c4b8e0 !important; }
    div           { outline: 1px solid #b39ddb !important; }
    blockquote    { outline: 1px solid #7e57c2 !important; }
    pre, code     { outline: 1px solid #f48fb1 !important; }
    ul, ol, dl    { outline: 1px solid #ec407a !important; }
    li, dt, dd    { outline: 1px solid #fbbde8 !important; }
    a             { outline: 1px solid #7e57c2 !important; }
    button        { outline: 1px solid #ec407a !important; }
    input, textarea, select, option { outline: 1px solid #5c42a8 !important; }
    label, fieldset, legend, form   { outline: 1px solid #a0357a !important; }
    img, picture, video, svg, canvas { outline: 1px solid #4caf96 !important; }
    table         { outline: 1px solid #9575cd !important; }
    thead, tbody, tfoot { outline: 1px solid #b39ddb !important; }
    tr            { outline: 1px solid #c4b8e0 !important; }
    th            { outline: 1px solid #a0357a !important; }
    td            { outline: 1px solid #f48fb1 !important; }
    iframe, object, embed { outline: 1px solid #00897b !important; }
  `;

  function startOutline() {
    if (document.getElementById('pt-pesticide-style')) return;
    const style = document.createElement('style');
    style.id = 'pt-pesticide-style';
    style.textContent = PESTICIDE_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function stopOutline() {
    const style = document.getElementById('pt-pesticide-style');
    if (style) style.remove();
  }

  // ─── DOM helpers ─────────────────────────────────────────────────────────────
  function createElement(id, tag = 'div') {
    const existing = document.getElementById(id);
    if (existing) existing.remove();
    const el = document.createElement(tag);
    el.id = id;
    document.body.appendChild(el);
    return el;
  }

  function createOverlayElements() {
    overlayEl      = createElement('pt-overlay');
    selectionEl    = createElement('pt-selection');
    tooltipEl      = createElement('pt-tooltip');
    escHintEl      = createElement('pt-esc-hint');
    startMarkerEl  = createElement('pt-start-marker');
    escHintEl.textContent = 'Press ESC to cancel';
    escHintEl.style.display = 'block';
  }

  function removeOverlayElements() {
    ['pt-overlay', 'pt-selection', 'pt-tooltip', 'pt-esc-hint',
     'pt-start-marker', 'pt-color-tooltip'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.remove();
    });
    overlayEl = selectionEl = tooltipEl = escHintEl = startMarkerEl = colorTooltipEl = null;
  }

  // ─── RULER ───────────────────────────────────────────────────────────────────
  // Akış:
  //  1. startRuler → overlay + crosshair; startPoint = null
  //  2. 1. click   → startPoint set, marker göster, mousemove'da canlı kutu+tooltip
  //  3. 2. click   → ölçümü clipboard'a yaz, selection/tooltip/marker temizle,
  //                  startPoint = null (mod aktif kalır, tekrar 1. click beklenir)
  //  4. ESC        → stopAll, popup'ı geri aç
  function startRuler() {
    stopAll();
    mode = 'ruler';
    startPoint = null;
    createOverlayElements();
    resetRulerVisuals();

    overlayEl.addEventListener('click',     onRulerClick);
    overlayEl.addEventListener('mousemove', onRulerMove);
    document.addEventListener('keydown',    onEscape);
  }

  // Canlı kutuyu, tooltip'i ve başlangıç noktası işaretini gizle
  function resetRulerVisuals() {
    if (selectionEl) {
      selectionEl.style.display = 'none';
      selectionEl.style.width  = '0px';
      selectionEl.style.height = '0px';
    }
    if (tooltipEl)     tooltipEl.style.display = 'none';
    if (startMarkerEl) startMarkerEl.style.display = 'none';
  }

  function onRulerClick(e) {
    const x = e.clientX;
    const y = e.clientY;

    if (!startPoint) {
      // 1. click — başlangıç noktasını set et
      startPoint = { x, y };
      startMarkerEl.style.left    = x + 'px';
      startMarkerEl.style.top     = y + 'px';
      startMarkerEl.style.display = 'block';
      return;
    }

    // 2. click — ölçümü bitir, clipboard'a yaz, görselleri temizle
    const w = Math.abs(x - startPoint.x);
    const h = Math.abs(y - startPoint.y);
    writeClipboard(`w: ${w}px - h: ${h}px`);

    // Ruler modunda kal — başlangıç noktasını sıfırla, kullanıcı tekrar başlasın
    startPoint = null;
    resetRulerVisuals();
  }

  function onRulerMove(e) {
    const x = e.clientX;
    const y = e.clientY;

    if (!startPoint) return;

    // Canlı seçim dikdörtgenini çiz
    const left   = Math.min(x, startPoint.x);
    const top    = Math.min(y, startPoint.y);
    const width  = Math.abs(x - startPoint.x);
    const height = Math.abs(y - startPoint.y);

    selectionEl.style.display = 'block';
    selectionEl.style.left    = left + 'px';
    selectionEl.style.top     = top  + 'px';
    selectionEl.style.width   = width  + 'px';
    selectionEl.style.height  = height + 'px';

    // Tooltip: "w: 20px - h: 15px"
    tooltipEl.style.display = 'block';
    tooltipEl.textContent   = `w: ${width}px - h: ${height}px`;
    tooltipEl.style.left    = (x + 16) + 'px';
    tooltipEl.style.top     = (y + 16) + 'px';
  }

  // ─── COLOR PICKER ─────────────────────────────────────────────────────────────
  function startPicker() {
    stopAll();
    mode = 'picker';

    // Use native EyeDropper API (Chrome 95+)
    if ('EyeDropper' in window) {
      const eyeDropper = new EyeDropper();
      eyeDropper.open()
        .then(async (result) => {
          const hex = result.sRGBHex.toUpperCase();
          const colorData = hexToAllFormats(hex);
          // Aktif formatı storage'dan oku ve sayfa odaktayken clipboard'a yaz.
          const { activeFormat = 'hex', colorHistory = [] } =
            await chrome.storage.local.get(['activeFormat', 'colorHistory']);
          writeClipboard(formatColorValue(colorData, activeFormat));

          // Saved colors listesini burada güncelle — background'a bağımlı değiliz.
          // Aynı hex varsa başa taşı, max 18 renk tut.
          const history = (Array.isArray(colorHistory) ? colorHistory : [])
            .filter((c) => c.hex !== colorData.hex);
          history.unshift({ ...colorData, ts: Date.now() });
          if (history.length > 18) history.length = 18;

          await chrome.storage.local.set({
            lastColor: colorData,
            colorHistory: history,
            pendingToast: true,
          });

          sendColorResult(colorData);
        })
        .catch(() => {
          // User cancelled — do nothing
        })
        .finally(() => {
          mode = null;
        });
    } else {
      // Fallback: manual canvas-based picker
      startCanvasPicker();
    }
  }

  // Canvas fallback for older Chrome versions
  function startCanvasPicker() {
    createOverlayElements();

    colorTooltipEl = createElement('pt-color-tooltip');
    colorTooltipEl.innerHTML = '<div class="pt-swatch"></div>';

    overlayEl.style.cursor = 'crosshair';
    overlayEl.addEventListener('mousemove', onPickerMove);
    overlayEl.addEventListener('click',     onPickerClick);
    document.addEventListener('keydown',    onEscape);
  }

  function getColorAtPoint(x, y) {
    // Hide overlay temporarily to capture page color
    overlayEl.style.display = 'none';
    const canvas  = document.createElement('canvas');
    canvas.width  = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');

    // Use html2canvas-like approach: just get computed bg color
    // For a real pixel-accurate fallback, we use a screenshot approach
    // Since EyeDropper is available in all modern Chrome, this is just a safety net
    overlayEl.style.display = 'block';

    // Return a placeholder — in practice EyeDropper API covers us
    return '#000000';
  }

  function onPickerMove(e) {
    if (!colorTooltipEl) return;
    colorTooltipEl.style.display = 'block';
    colorTooltipEl.style.left = e.clientX + 'px';
    colorTooltipEl.style.top  = e.clientY + 'px';
  }

  function onPickerClick(e) {
    const hex = getColorAtPoint(e.clientX, e.clientY);
    const colorData = hexToAllFormats(hex);
    sendColorResult(colorData);
    stopAll();
  }

  // ─── STOP ────────────────────────────────────────────────────────────────────
  function stopAll() {
    mode = null;
    startPoint = null;

    if (overlayEl) {
      overlayEl.removeEventListener('click',     onRulerClick);
      overlayEl.removeEventListener('mousemove', onRulerMove);
      overlayEl.removeEventListener('mousemove', onPickerMove);
      overlayEl.removeEventListener('click',     onPickerClick);
    }

    document.removeEventListener('keydown', onEscape);
    removeOverlayElements();
  }

  function onEscape(e) {
    if (e.key === 'Escape') {
      stopAll();
      chrome.runtime.sendMessage({ action: 'rulerCancelled' });
    }
  }

  // ─── Color conversion ─────────────────────────────────────────────────────────
  function hexToAllFormats(hex) {
    // Normalize hex
    const cleanHex = hex.startsWith('#') ? hex : '#' + hex;
    const r = parseInt(cleanHex.slice(1, 3), 16);
    const g = parseInt(cleanHex.slice(3, 5), 16);
    const b = parseInt(cleanHex.slice(5, 7), 16);

    // RGB string
    const rgb = `${r}, ${g}, ${b}`;

    // RGBA string (full opacity)
    const rgba = `${r}, ${g}, ${b}, 1`;

    // HSL conversion
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;

    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      if (max === rNorm) h = ((gNorm - bNorm) / delta) % 6;
      else if (max === gNorm) h = (bNorm - rNorm) / delta + 2;
      else h = (rNorm - gNorm) / delta + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    const hsl = `${h}°, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%`;

    return {
      hex:  cleanHex.toUpperCase(),
      rgb,
      hsl,
      rgba,
    };
  }

  // ─── Clipboard (content script → page odakta olduğu için çalışır) ──────────
  function writeClipboard(text) {
    try {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } catch {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); } catch {}
    ta.remove();
  }

  function formatColorValue(colorData, fmt) {
    switch (fmt) {
      case 'rgb':  return `rgb(${colorData.rgb})`;
      case 'hsl':  return `hsl(${colorData.hsl})`;
      case 'rgba': return `rgba(${colorData.rgba})`;
      default:     return colorData.hex;
    }
  }

  // ─── Messaging ───────────────────────────────────────────────────────────────
  function sendMeasurementResult(w, h) {
    chrome.runtime.sendMessage({ action: 'measurementResult', w, h });
  }

  function sendColorResult(colorData) {
    chrome.runtime.sendMessage({ action: 'colorResult', color: colorData });
  }
}
