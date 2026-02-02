# Darkroom App - Startup Guide

## ✅ Code Verification Complete

All code has been checked and verified:
- **Frontend**: No TypeScript errors, builds successfully
- **Backend**: No Python syntax errors
- **Dependencies**: All installed and ready

## 🚀 How to Start the App

### On Windows (PowerShell):

1. **Navigate to the frontend directory:**
   ```powershell
   cd darkroom-app/frontend
   ```

2. **Start the app:**
   ```powershell
   npm run electron:dev
   ```
   
   Or simply:
   ```powershell
   npm start
   ```

### What Happens:

1. Vite dev server starts on `http://127.0.0.1:5173/`
2. Electron window opens automatically
3. Developer tools open for debugging
4. Hot reload is enabled for development

### Available Commands:

| Command | Description |
|---------|-------------|
| `npm run dev` | Start only the Vite dev server |
| `npm run build` | Build for production |
| `npm run electron:dev` | Start Electron + Vite (recommended) |
| `npm start` | Alias for electron:dev |
| `npm run type-check` | Check TypeScript types |

## 🔧 Backend (Optional)

If you need the backend API running:

1. **Navigate to backend:**
   ```powershell
   cd darkroom-app/backend
   ```

2. **Activate virtual environment (if using one):**
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

3. **Start the FastAPI server:**
   ```powershell
   uvicorn main:app --reload
   ```

The API will be available at `http://127.0.0.1:8000`

## ✨ Features Ready:

- Image editing canvas
- Layer management
- Adjustment panels
- Batch processing
- RAW file support
- And much more!

## 📝 Notes:

- The app runs locally and offline
- No internet connection required
- All processing happens on your machine
- Your images stay on your device

---

**Status:** ✅ All systems ready! No code errors found.

**Last Checked:** February 2, 2026
