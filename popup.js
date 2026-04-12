'use strict';

// ─── i18n ────────────────────────────────────────────────────────────────────
const I18N = {
  en: {
    tagline: 'Measure & Pick Colors',
    ruler: 'Ruler',
    colorPicker: 'Color Picker',
    hintStart: 'Click on page to set start point',
    autoCopyFormat: 'Auto-copy format:',
    savedColors: 'Saved Colors',
    clear: 'Clear',
    savedEmpty: '<span class="empty-icon">✨</span>Picked colors will appear here',
    copied: '✓ Copied to clipboard',
    copiedX: (v) => `✓ Copied ${v}`,
    footer: '🔒 No data collected · <span>100% private</span>',
    swatchTitle: (hex) => `${hex} — click to copy`,
  },
  tr: {
    tagline: 'Ölç & Renk Seç',
    ruler: 'Cetvel',
    colorPicker: 'Renk Seçici',
    hintStart: 'Başlangıç noktası için sayfaya tıkla',
    autoCopyFormat: 'Otomatik kopyalama formatı:',
    savedColors: 'Kayıtlı Renkler',
    clear: 'Temizle',
    savedEmpty: '<span class="empty-icon">✨</span>Seçilen renkler burada görünecek',
    copied: '✓ Panoya kopyalandı',
    copiedX: (v) => `✓ ${v} kopyalandı`,
    footer: '🔒 Veri toplanmaz · <span>%100 gizli</span>',
    swatchTitle: (hex) => `${hex} — kopyalamak için tıkla`,
  },
};

let lang = 'tr';
const t = (key) => (I18N[lang] && I18N[lang][key]) || I18N.en[key];

function applyI18n() {
  document.documentElement.setAttribute('lang', lang);
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const val = I18N[lang][key];
    if (typeof val === 'string') el.innerHTML = val;
  });
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-lang') === lang);
  });
  // Dinamik içerikleri yeniden render et
  renderHistory();
}

// ─── State ───────────────────────────────────────────────────────────────────
let activeFormat  = 'hex';
let lastColor     = null;
let colorHistory  = [];
let rulerActive   = false;

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const rulerBtn    = document.getElementById('rulerBtn');
const pickerBtn   = document.getElementById('pickerBtn');
const activeHint  = document.getElementById('activeHint');
const hintText    = document.getElementById('hintText');

const historyList     = document.getElementById('colorHistory');
const historyEmpty    = document.getElementById('colorHistoryEmpty');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const globalToast     = document.getElementById('globalToast');

// ─── Init: storage tek kaynak ────────────────────────────────────────────────
loadState();

async function loadState() {
  const data = await chrome.storage.local.get([
    'lastColor',
    'colorHistory',
    'activeFormat',
    'pendingToast',
    'lang',
  ]);

  // Default TR — kullanıcı değiştirdiyse storage'dan oku
  lang = data.lang === 'en' ? 'en' : 'tr';
  applyI18n();

  if (data.activeFormat) activeFormat = data.activeFormat;
  setActiveFormatUI(activeFormat);

  if (data.lastColor) lastColor = data.lastColor;

  if (Array.isArray(data.colorHistory)) {
    colorHistory = data.colorHistory;
    renderHistory();
  }
  // Popup her açıldığında content script'e sor — storage'a güvenme.
  setRulerActiveState(await isRulerRunning());

  // Yeni bir sonuç varsa toast göster ve bayrağı temizle.
  // (Clipboard'a zaten content.js içinde yazıldı.)
  if (data.pendingToast) {
    showToast();
    chrome.storage.local.set({ pendingToast: false });
  }
}

// ─── Storage değişikliklerini dinle ─────────────────────────────────────────
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;

  if (changes.lastColor?.newValue) {
    lastColor = changes.lastColor.newValue;
  }

  if (changes.colorHistory?.newValue) {
    colorHistory = changes.colorHistory.newValue;
    renderHistory();
  }

  if (changes.pendingToast?.newValue) {
    showToast();
    chrome.storage.local.set({ pendingToast: false });
  }
});

// ─── Ruler button ─────────────────────────────────────────────────────────────
rulerBtn.addEventListener('click', async () => {
  const isActive = rulerBtn.classList.contains('active');

  if (isActive) {
    await sendToContent({ action: 'stopRuler' });
    setRulerActiveState(false);
    return;
  }

  const injected = await ensureContentScript();
  if (!injected) return;

  await sendToContent({ action: 'startRuler' });
  setRulerActiveState(true);
  // Popup'ı hemen kapat — kullanıcı sayfayla etkileşebilsin, crosshair görünsün.
  // Ölçüm bitince background.js chrome.action.openPopup() ile geri açar.
  window.close();
});

// ─── Color Picker button ──────────────────────────────────────────────────────
pickerBtn.addEventListener('click', async () => {
  const injected = await ensureContentScript();
  if (!injected) return;
  await sendToContent({ action: 'startPicker' });
});

// ─── Format toggle (event delegation — empty ve result seti ortak) ─────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.fmt-btn');
  if (!btn) return;

  activeFormat = btn.getAttribute('data-fmt');
  setActiveFormatUI(activeFormat);
  chrome.storage.local.set({ activeFormat });

  if (lastColor) {
    copyToClipboard(formatColorValue(lastColor, activeFormat), null, null);
    showToast();
  }
});

// ─── History: tıklayınca kopyala ─────────────────────────────────────────────
historyList.addEventListener('click', (e) => {
  const sw = e.target.closest('.history-swatch');
  if (!sw) return;
  const hex = sw.getAttribute('data-hex');
  const color = colorHistory.find((c) => c.hex === hex);
  if (!color) return;
  copyToClipboard(formatColorValue(color, activeFormat), null, null);
  showToast(I18N[lang].copiedX(hex));
});

// ─── Language switch ─────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.lang-btn');
  if (!btn) return;
  lang = btn.getAttribute('data-lang');
  chrome.storage.local.set({ lang });
  applyI18n();
});

// ─── History clear ───────────────────────────────────────────────────────────
clearHistoryBtn.addEventListener('click', () => {
  colorHistory = [];
  chrome.storage.local.set({ colorHistory: [] });
  renderHistory();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setActiveFormatUI(fmt) {
  document.querySelectorAll('.fmt-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-fmt') === fmt);
  });
}

function setRulerActiveState(active) {
  rulerActive = active;
  rulerBtn.classList.toggle('active', active);
  activeHint.style.display = active ? 'flex' : 'none';
  hintText.textContent = I18N[lang].hintStart;
}

// Saved colors: yuvarlak swatch listesi
function renderHistory() {
  const hasAny = colorHistory.length > 0;
  historyEmpty.style.display = hasAny ? 'none' : 'block';
  historyList.style.display  = hasAny ? 'flex' : 'none';
  clearHistoryBtn.style.display = hasAny ? 'inline-block' : 'none';

  historyList.innerHTML = '';
  colorHistory.forEach((c) => {
    const sw = document.createElement('button');
    sw.className = 'history-swatch';
    sw.setAttribute('data-hex', c.hex);
    sw.setAttribute('title', I18N[lang].swatchTitle(c.hex));
    sw.style.background = c.hex;
    historyList.appendChild(sw);
  });
}

function formatColorValue(colorData, fmt) {
  switch (fmt) {
    case 'rgb':  return `rgb(${colorData.rgb})`;
    case 'hsl':  return `hsl(${colorData.hsl})`;
    case 'rgba': return `rgba(${colorData.rgba})`;
    default:     return colorData.hex;
  }
}

function copyToClipboard(text, btnEl, feedback) {
  navigator.clipboard.writeText(text).then(() => {
    if (btnEl && feedback) {
      const original = btnEl.textContent;
      btnEl.textContent = feedback;
      setTimeout(() => { btnEl.textContent = original; }, 1500);
    }
  }).catch(() => {});
}

function showToast(msg) {
  if (!globalToast) return;
  globalToast.textContent = msg || I18N[lang].copied;
  globalToast.classList.add('show');
  setTimeout(() => globalToast.classList.remove('show'), 1500);
}

async function ensureContentScript() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return false;
    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'ping' });
    } catch {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
      await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['content.css'] });
    }
    return true;
  } catch (err) {
    console.error('PixelTape: could not inject content script', err);
    return false;
  }
}

// Content script'e sor: ruler şu an çalışıyor mu?
async function isRulerRunning() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return false;
    const res = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
    return !!(res && res.rulerActive);
  } catch {
    return false;
  }
}

async function sendToContent(message) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) await chrome.tabs.sendMessage(tab.id, message);
  } catch (err) {
    console.error('PixelTape: sendMessage failed', err);
  }
}
