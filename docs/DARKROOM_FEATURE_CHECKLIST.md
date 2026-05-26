# Darkroom Feature Checklist

> **Project constraint:**  
> **Local-only operation. No internet/collab/cloud features. All work and files are 100% offline.**

> **Legend:** ✅ Done · 🔶 Partial (UI exists, backend/logic incomplete) · ⬜ Not started

---

## Core Editor Features

- ✅ Canvas-based image editing — pan/zoom toward pointer, fit-to-screen, ResizeObserver, Konva.js stage (MainCanvas.tsx)
- ✅ Layer system — full CRUD (create/delete/duplicate/reorder/toggle visibility+lock) via API; blend modes; opacity per layer (LayersPanel.tsx + layer-manager.ts)
- ✅ History panel with undo/redo and time travel — 200-entry localStorage-persisted stack; click to jump; filter by type; sort toggle (HistoryPanel.tsx + history-manager.ts)
- ✅ Adjustment tools — exposure (EV), contrast (cubic S-curve), brightness (gamma), highlights/shadows (weighted curves), white balance (Bradford CAT + Kelvin), sharpness (unsharp mask/blur), saturation, vibrance — all with real-time preview + commit to history (AdjustmentsPanel.tsx + MainCanvas.tsx)
- ✅ Keyboard shortcuts — save, export, undo/redo, tool selection (V/C/B/T/S), layer ops, zoom, help (useKeyboard.ts)
- ⬜ Option for AI auto-edit for each adjustment tool AND for global image edits
- ✅ Watermarking — text + image watermarks, canvas drawing tool, 9-position picker, opacity, saved watermarks in localStorage, POST to /api/watermark/apply (WatermarkPanel.tsx)
- 🔶 Customizable section tabs on the right adjustment panel — tab reordering via drag-and-drop implemented; add/remove/rename tabs and moving sections across tabs not yet done

---

## File Handling

- 🔶 Support import/export for JPEG, PNG, TIFF, RAW, WebP — file input accepts RAW types (15 formats) and image formats; RAW processing is simulated only (RAWImportPanel.tsx)
- 🔶 Drag-and-drop file import (multi-select and batch) — UI drag-and-drop exists in BatchQueuePanel but no real import logic
- 🔶 File browser import — file input exists; importImage() API endpoint exists (POST /api/import); batch processing not wired
- 🔶 Export single image, batch selection, via queued jobs — **ExportPage and ExportDialog both fully wired**: POST /api/export/batch and /api/export/single; ImageProcessor applies all adjustments server-side; download link returned. Progress/cancel during export not yet implemented.
- ⬜ Show "rejected" images in import/export pane (shaded + hover-to-show "rejected" label)

---

## AI Features

- ⬜ Object detection and segmentation
- ⬜ AI-powered object removal (inpainting)
- ⬜ AI object replacement (show 5 candidates, allow recasting; pick/keep/reject via checkbox side panel)
- ⬜ Context-aware replacements — fits naturally into scene
- ⬜ Smart background editing (protect selected objects with masking, edit background independently)
- ⬜ AI super-resolution/upscale (user selects output size: 720p/1080p/4K/etc.)
- ⬜ Hybrid RAW pipeline: process RAW at full fidelity for AI
- ⬜ Metadata preservation (EXIF, color profiles, etc.)
- ⬜ Face detection tools (UI overlays, auto/manual select)
- ⬜ Auto colorization of dull/B&W images
- ✅ Savable presets — GET/POST/DELETE /api/presets/; category filter; apply preset callback (PresetsPanel.tsx)

---

## Queue & Batch Processing

- 🔶 Import/export handled via queue — tab UI exists, simulated progress bars, but no real file processing or API calls (BatchQueuePanel.tsx)
- 🔶 Progress bar/status for all jobs; cancel, re-order, exclude — UI present for status/remove/clear; no real cancel/reorder
- ⬜ Job settings and metadata editable before queue start

---

## Device Management

- ⬜ Show current device (GPU/CPU), allow user switching if available
- ⬜ Automatic fallback to CPU if GPU is busy/unavailable (or vice versa)
- ⬜ Device info/settings page

---

## UX/UI

- ✅ Lightroom-style dark theme, clear panel/layout
- ✅ Side panels for history, queue, import/export, tools — sidebar collapse/expand with drag-to-resize (Editor.tsx)
- ✅ Toolbar with manual tools (crop, brush, text, shapes)
- ✅ Top menu bar — File/Image/Help menus with dropdowns, keyboard shortcuts display, flip H/V, About dialog, Library/Editor navigation (MenuBar.tsx)
- ⬜ Modal previews for AI results (multi-option, manual pick/recast)
- 🔶 Image thumbnails tray — grid size picker exists; filmstrip toggle state exists; no actual filmstrip component rendered
- 🔶 Collapsible image preview tray at bottom — toggle state implemented, no actual tray rendered
- ⬜ Dual-window workflow (import/export window + editing window)
- ⬜ "Rejected" images in import/export: shaded with hover "rejected" popup
- ⬜ Tooltips, onboarding/help modals
- ⬜ Face detection UI overlay (auto/manual)
- ⬜ Colorization preview
- ✅ Savable preset library (see AI Features above)
- ✅ Watermark preview/configurator (WatermarkPanel.tsx)
- ✅ Resizable (slidable) panels — drag divider between panels; width persisted to localStorage (Editor.tsx)
- ✅ Project management — create, edit, delete, cover photo upload + crop, filtering, pinning (Library.tsx)

---

## [Pro Suggestions]

- ⬜ Adjustment "sync": copy/apply same settings/preset to multiple images in queue
- ✅ Comparison mode: before/after/side-by-side — slider, side-by-side, overlay; smooth DOM-direct dragging; full SVG filter pipeline (CompareView.tsx)
- ✅ Non-destructive edits — per-layer adjustments stored separately, original image untouched
- ⬜ Export templates: batch export config save/load
- ⬜ Basic support for optional plugins/extensions (local only)

---

## Next Priority Items (suggested order)

1. **Real batch import** — connect BatchQueuePanel drag-and-drop to importImage() API; show actual layers created
3. **Filmstrip / image tray** — render a real bottom tray of project images to switch between
4. **Color Grading panel** — wire ColorGradingPanel.tsx sliders to the adjustment state (sliders exist, onApply never fires)
5. **RAW import** — connect RAWImportPanel to a real backend RAW decoder (e.g. rawpy/LibRaw)
