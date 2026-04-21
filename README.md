<div align="center">

<img src="icons/icon128.png" alt="PixelTape" width="96" height="96" />

# PixelTape

**Measure · Pick Colors · Outline**
A minimal, privacy-first Chrome extension built for frontend developers and QA testers.

![Version](https://img.shields.io/badge/version-1.0.0-b39ddb?style=flat-square)
![Manifest](https://img.shields.io/badge/manifest-v3-f48fb1?style=flat-square)
![Privacy](https://img.shields.io/badge/privacy-100%25-4caf96?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-9575cd?style=flat-square)

</div>

---

## ✨ Features

<table>
<tr>
<td width="33%" valign="top">

### 📐 Ruler
Measure the distance between any two points on a page in pixels. A live `w × h` tooltip follows your cursor while dragging, and the result is copied to the clipboard after the second click. It stays in measurement mode until you press **ESC** — so you can take multiple measurements back-to-back.

</td>
<td width="33%" valign="top">

### 🎨 Color Picker
Grab any pixel on the page using the native **EyeDropper API**. Displays the value in **HEX**, **RGB**, **HSL**, and **RGBA**, and automatically copies your chosen format to the clipboard. Picked colors accumulate in the *Saved Colors* list.

</td>
<td width="33%" valign="top">

### 🔲 Outline
One click draws a 1px outline around **every element** on the page. Each tag type (div, section, p, ul, button, img…) gets its own distinct color, so you can tell nested elements apart at a glance — far faster than clicking around the DevTools element tree. Click again to turn it off.

</td>
</tr>
</table>

### 🪄 Extras

- 🎯 **Auto-copy format** — Pre-select your preferred format (HEX / RGB / HSL / RGBA)
- 💾 **Saved Colors** — Every picked color is stored as a round swatch; click to re-copy (max 18)
- 🌍 **Bilingual** — Turkish and English (defaults to TR, your choice is persisted)
- 🔒 **100% private** — No data collected, no network requests, everything lives in local `chrome.storage.local`
- ⚡ **Manifest V3** — Modern service worker architecture
- 📦 **Zero dependencies** — Vanilla JS, CSS, Chrome APIs — no external libraries

---

## 🚀 Installation

```bash
# 1. Clone the repo
git clone https://github.com/<user>/pixeltape.git

# 2. Open chrome://extensions in Chrome
# 3. Enable "Developer mode" in the top right
# 4. Click "Load unpacked" → select the pixeltape folder
```

---

## 🎮 Usage

### 📐 Ruler
1. Open the PixelTape popup → click the **Ruler** button
2. Your cursor becomes a crosshair — click anywhere on the page to set the start point
3. A live `w: 20px - h: 15px` tooltip follows the cursor until the second click
4. On the second click the measurement is copied to the clipboard automatically
5. Click again to start a new measurement — press **ESC** to exit the mode

### 🎨 Color Picker
1. Open the PixelTape popup → choose an **Auto-copy format** (HEX, RGB, HSL, RGBA)
2. Click the **Color Picker** button → the native EyeDropper opens
3. Pick a pixel → the value is copied to the clipboard in your chosen format
4. The color is added to *Saved Colors* — click it any time to re-copy

### 🔲 Outline
1. Open the PixelTape popup → click the **Outline** button
2. Every element on the page instantly gets a colored outline based on its tag type
3. Identify spacing, alignment, and nesting issues without opening DevTools
4. Click **Outline** again to remove all outlines and restore the page

---

## 🎨 Design System

PixelTape comes with a carefully crafted color palette and typography:

| Element                 | Value                                           |
| ----------------------- | ----------------------------------------------- |
| **Font**                | Nunito (400/600/700/800/900) + DM Mono          |
| **Header Gradient**     | `#e8e0ff → #fce4f5 → #d8f5ee`                   |
| **Lavender Accent**     | `#b39ddb` / `#9575cd` / `#5c42a8`               |
| **Pink Accent**         | `#f48fb1` / `#ec407a`                           |
| **Mint (active)**       | `#4caf96` / `#d4f5ec`                           |
| **Border Radius**       | 24px shell · 16px buttons · 14px cards          |

---

## 📁 Project Structure

```
pixeltape/
├── manifest.json        # Manifest V3 configuration
├── popup.html           # Extension popup UI
├── popup.css            # Design system styles
├── popup.js             # Popup logic + i18n + state
├── content.js           # Injected ruler/picker/outline logic
├── content.css          # Overlay, tooltip, and marker styles
├── background.js        # Service worker — popup open, message relay
├── icons/               # 16 / 48 / 128 px extension icons
└── README.md
```

---

## 🔐 Privacy

PixelTape **collects no data** and makes no external requests.

- ❌ No analytics
- ❌ No telemetry
- ❌ No remote APIs
- ✅ All data stays in `chrome.storage.local` — only in your browser
- ✅ Source code is fully open and readable

---

## 🛠️ Tech

- **Manifest V3** Chrome Extension
- **Vanilla JavaScript** (no frameworks, no libraries)
- **Chrome APIs** — `storage`, `scripting`, `tabs`, `action`, `clipboardWrite`
- **Native EyeDropper API** (Chrome 95+)

---

## 📜 License

MIT © PixelTape

---

<div align="center">

**🔒 No data collected · 100% private**

Made with 💜 for developers & designers

</div>
