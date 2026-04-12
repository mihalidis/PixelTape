<div align="center">

<img src="icons/icon128.png" alt="PixelTape" width="96" height="96" />

# PixelTape

**Measure distances & pick colors on any webpage**
Frontend geliştiriciler ve QA test uzmanları için yapılmış, minimal ve gizli bir Chrome uzantısı.

![Version](https://img.shields.io/badge/version-1.0.0-b39ddb?style=flat-square)
![Manifest](https://img.shields.io/badge/manifest-v3-f48fb1?style=flat-square)
![Privacy](https://img.shields.io/badge/privacy-100%25-4caf96?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-9575cd?style=flat-square)

</div>

---

## ✨ Özellikler

<table>
<tr>
<td width="50%" valign="top">

### 📐 Ruler
Sayfa üzerindeki herhangi iki nokta arasındaki mesafeyi piksel cinsinden ölç. Sürükleme sırasında canlı `w × h` tooltip, iki tıklamadan sonra sonuç panoya kopyalanır. ESC'ye basana kadar ölçüm modunda kalır — birden fazla ölçümü arka arkaya yapabilirsin.

</td>
<td width="50%" valign="top">

### 🎨 Color Picker
Native **EyeDropper API** ile sayfanın herhangi bir pikselinden rengi al. **HEX**, **RGB**, **HSL** ve **RGBA** formatlarında görüntüler, seçtiğin formatı otomatik olarak panoya kopyalar. Picked renkler *Saved Colors* listesinde birikir.

</td>
</tr>
</table>

### 🪄 Ek özellikler

- 🎯 **Auto-copy format seçimi** — HEX / RGB / HSL / RGBA arasından tercih ettiğin formatı önceden belirle
- 💾 **Saved Colors** — Seçilen her renk küçük yuvarlak swatch olarak birikir; tıklayınca yeniden kopyalar (max 18)
- 🌍 **Dil desteği** — Türkçe ve İngilizce (varsayılan TR, seçim kalıcı)
- 🔒 **%100 gizli** — Hiçbir veri toplanmaz, harici istek yok, tüm veriler lokal `chrome.storage.local` üzerinde
- ⚡ **Manifest V3** — Modern service worker mimarisi
- 📦 **Sıfır bağımlılık** — Vanilla JS, CSS, Chrome API — hiçbir external library yok

---

## 🚀 Kurulum

```bash
# 1. Depoyu klonla
git clone https://github.com/<kullanıcı>/pixeltape.git

# 2. Chrome'da chrome://extensions adresini aç
# 3. Sağ üstten "Developer mode" aç
# 4. "Load unpacked" → pixeltape klasörünü seç
```

---

## 🎮 Kullanım

### Ruler
1. PixelTape popup'ını aç → **Ruler** butonuna tıkla
2. İmlecin crosshair'e dönüşür, sayfanın herhangi bir noktasına tıkla
3. İkinci tıklamaya kadar canlı `w: 20px - h: 15px` bilgisi görünür
4. İkinci tıklamada ölçüm otomatik olarak panoya kopyalanır
5. Yeni bir ölçüm yapmak için tekrar tıklayabilirsin — **ESC** ile modu kapat

### Color Picker
1. PixelTape popup'ını aç → **Auto-copy format**'ı seç (HEX, RGB, HSL, RGBA)
2. **Color Picker** butonuna tıkla → sayfa üzerinde büyüteç çıkar
3. İstediğin pikseli seç → seçtiğin format otomatik olarak panoya kopyalanır
4. Renk, *Saved Colors* listesine eklenir — tekrar kullanmak için üstüne tıkla

---

## 🎨 Tasarım Sistemi

PixelTape özenle tasarlanmış bir renk paleti ve tipografi ile gelir:

| Element                 | Değer                                           |
| ----------------------- | ----------------------------------------------- |
| **Font**                | Nunito (400/600/700/800/900) + DM Mono         |
| **Header Gradient**     | `#e8e0ff → #fce4f5 → #d8f5ee`                  |
| **Lavender Accent**     | `#b39ddb` / `#9575cd` / `#5c42a8`              |
| **Pink Accent**         | `#f48fb1` / `#ec407a`                          |
| **Mint (active)**       | `#4caf96` / `#d4f5ec`                          |
| **Border Radius**       | 24px shell · 16px buttons · 14px cards         |

---

## 📁 Proje Yapısı

```
pixeltape/
├── manifest.json        # Manifest V3 yapılandırması
├── popup.html           # Extension popup UI
├── popup.css            # Tasarım sistemi stilleri
├── popup.js             # Popup logic + i18n + state
├── content.js           # Sayfaya enjekte edilen ruler/picker mantığı
├── content.css          # Overlay, tooltip ve marker stilleri
├── background.js        # Service worker — popup açma, mesaj relay
├── icons/               # 16 / 48 / 128 px uzantı ikonları
└── README.md
```

---

## 🔐 Gizlilik

PixelTape **hiçbir veri toplamaz**, hiçbir harici sunucuya istek atmaz.

- ❌ Analytics yok
- ❌ Telemetry yok
- ❌ Uzak API yok
- ✅ Tüm veriler `chrome.storage.local` içinde — sadece senin tarayıcında
- ✅ Kaynak kodu tamamen açık ve okunabilir

---

## 🛠️ Teknoloji

- **Manifest V3** Chrome Extension
- **Vanilla JavaScript** (hiçbir framework veya library yok)
- **Chrome APIs** — `storage`, `scripting`, `tabs`, `action`, `clipboardWrite`
- **Native EyeDropper API** (Chrome 95+)

---

## 📜 Lisans

MIT © PixelTape

---

<div align="center">

**🔒 No data collected · 100% private**

Made with 💜 for developers & designers

</div>
