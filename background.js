'use strict';

// PixelTape background service worker
// Storage tek kaynak. Sonuç geldiğinde popup'ı tekrar aç, renk geçmişini tut.

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'measurementResult') {
    tryOpenPopup();
    chrome.storage.local.set({ pendingToast: true, liveMeasurement: null });
  }

  if (message.action === 'colorResult') {
    tryOpenPopup();
    chrome.storage.local.set({ lastColor: message.color, pendingToast: true });
  }

  if (message.action === 'rulerCancelled') {
    tryOpenPopup();
    chrome.storage.local.set({ liveMeasurement: null });
  }

  sendResponse({});
});

// Ölçüm/renk seçimi sonrası action popup'ını tekrar aç.
// Not: chrome.action.openPopup() MV3 service worker'dan yalnızca
// kullanıcı etkileşimi taze iken (onMessage dahil) çalışır. Gecikme eklersen
// "user gesture" düşer ve sessizce başarısız olur — bu yüzden mesaj handler
// içinde anında (await yok) çağırıyoruz.
function tryOpenPopup() {
  if (!chrome.action || !chrome.action.openPopup) return;
  chrome.action.openPopup().catch((err) => {
    console.warn('PixelTape: openPopup failed', err);
  });
}
