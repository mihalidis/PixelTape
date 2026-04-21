'use strict';

// ─── i18n ────────────────────────────────────────────────────────────────────
let lang = 'en';
let _messages = {};

async function loadMessages(l) {
  try {
    const url = chrome.runtime.getURL(`_locales/${l}/messages.json`);
    const res = await fetch(url);
    _messages = await res.json();
  } catch {
    // keep current _messages on failure
  }
}

// Looks up a key and substitutes $PLACEHOLDER$ tokens with provided args.
function t(key, ...args) {
  const entry = _messages[key];
  if (!entry) return key;
  let msg = entry.message;
  if (entry.placeholders && args.length) {
    for (const [name, ph] of Object.entries(entry.placeholders)) {
      const idx = parseInt(ph.content.replace('$', ''), 10) - 1;
      msg = msg.replace(new RegExp('\\$' + name + '\\$', 'gi'), args[idx] ?? '');
    }
  }
  return msg;
}

function applyI18n() {
  document.documentElement.setAttribute('lang', lang);
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const val = t(el.getAttribute('data-i18n'));
    el.innerHTML = val;
  });
  document.querySelectorAll('.lang-btn').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-lang') === lang);
  });
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
const outlineBtn  = document.getElementById('outlineBtn');
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
  lang = data.lang === 'tr' ? 'tr' : 'en';
  await loadMessages(lang);
  applyI18n();

  if (data.activeFormat) activeFormat = data.activeFormat;
  setActiveFormatUI(activeFormat);

  if (data.lastColor) lastColor = data.lastColor;

  if (Array.isArray(data.colorHistory)) {
    colorHistory = data.colorHistory;
    renderHistory();
  }
  // Popup her açıldığında content script'e sor — storage'a güvenme.
  const status = await getContentStatus();
  setRulerActiveState(!!status.rulerActive);
  setOutlineActiveState(!!status.outlineActive);

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

// ─── Outline (pesticide) button ──────────────────────────────────────────────
outlineBtn.addEventListener('click', async () => {
  const isActive = outlineBtn.classList.contains('active');
  const injected = await ensureContentScript();
  if (!injected) return;
  await sendToContent({ action: isActive ? 'stopOutline' : 'startOutline' });
  setOutlineActiveState(!isActive);
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
  showToast(t('copiedX', hex));
});

// ─── Language switch ─────────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.lang-btn');
  if (!btn) return;
  lang = btn.getAttribute('data-lang');
  chrome.storage.local.set({ lang });
  loadMessages(lang).then(() => applyI18n());
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
  hintText.textContent = t('hintStart');
}

function setOutlineActiveState(active) {
  outlineBtn.classList.toggle('active', active);
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
    sw.setAttribute('title', t('swatchTitle', c.hex));
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
  globalToast.textContent = msg || t('copied');
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

// Content script'e sor: hangi modlar aktif?
async function getContentStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return {};
    const res = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
    return res || {};
  } catch {
    return {};
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
