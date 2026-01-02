# Darkroom

Advanced, AI-powered, local-only desktop photo editor — a modern Adobe Photoshop Pro clone with offline privacy, full RAW support, and advanced image batch and queue workflows.

---

## 🚫 Important

- **Local-only application**: No cloud features, internet connectivity, or external API calls by default.
- All workflow, processing, and file saving happen on your device only.

---

## ✨ Major Features and Goals

Our ultimate goal is to develop **Darkroom** into a **powerful, offline-first image editor resembling Adobe Photoshop Pro**, with advanced editing capabilities and AI-powered enhancements for professionals. Here's the primary focus:

### Photoshop-Like Editing Features (Core Goals)

1. **Layer-Based Editing**:
   - Support multiple editable layers (e.g., images, text, shapes).
   - Operations:
     - Add, reorder, hide, lock, and merge layers.
     - Adjust opacity, blending modes, and positions.
   - Editable mask layers for non-destructive workflows.

2. **History/Undo-Redo**:
   - Fully interactive history stack for all actions.
   - Support for non-destructive edits (e.g., applying masks, adjustment layers).

3. **Precision Editing Tools**:
   - Arbitrary-angle cropping and zoom during cropping.
   - Freehand brushes with variable size and opacity.
   - Shape and text overlays with customizable settings.

4. **Customizable Workspace**:
   - Layer management panel.
   - Toolbars for selecting colors, cropping, brushes, shapes, text, etc.
   - Drag-and-drop adjustment panel to reorder image tools.

5. **Batch Workflows**:
   - Import/export powerful batches of images with queues.
   - Hybrid pipelines (process RAW, JPEG, TIFF files together).

---

### AI-Enhanced Editing (Planned)

1. **Object Selection and Removal**:
   - Auto-detect subjects and background for easy selection/grouping.
   - One-click object removal (AI-based inpainting).
   - Context-aware editing, such as background-only or subject-only changes.

2. **Super-Resolution and Upscaling**:
   - AI-assisted photo upscaling to target resolutions (e.g., 4K, 8K).

3. **Face Detection and Manipulation**:
   - Auto-enhance features such as colorization.
   - Support for AI-savable presets (e.g., automated corrections).

---

### 🚀 Additional Goals

- **Pluggable Processing Pipelines**: Extend the app for custom AI models, filters, and tools.
- **Keyboard Shortcuts**: Enhance workflows with hotkeys, like Photoshop.
- **Version Control for Edits**: Grid-like history visualization.
- **Super-Smooth User Experience**: Keep everything fast and responsive.

---

## Project Structure

The structure of the Darkroom repository is as follows:

```
darkroom-app/
├── backend/      # Python FastAPI API, Alembic migrations, queue, storage and DB
├── frontend/     # React/TypeScript app, Electron shell (desktop)
├── docs/         # Planning docs, wireframes, feature checklist
├── .env.example  # Example environment configuration
└── README.md
```

Key documentation:
- `docs/DARKROOM_FEATURE_CHECKLIST.md` — Progress tracking and feature matrix.
- `docs/wireframes/` — UI sketches and workflow diagrams.

---

## Individual Updates and Status

### Core Flow Verification
- The upload and database persistence flow has been verified. Files are saved locally, with records written to the SQLite database.
- The app routes were tested with FastAPI’s interactive docs under development.

### Latest Updates
1. **Environment Configuration**
   - Key environment variables moved to `.env`:
     - `DARKROOM_DATABASE_URL`: Database connection string.
     - `DARKROOM_STORAGE_PATH`: Local storage for uploads.
     - `DARKROOM_LOG_LEVEL`: Log verbosity (default: `INFO`).

2. **Database Migrations**
   - Set up Alembic for managing database migrations:
     - Initial migration: `images` table added.

---

## Quickstart (Developer, Windows PowerShell)

These exact steps are known to work for local development:

### 1. Clone and Navigate
```powershell
git clone https://github.com/<your-username>/darkroom-app.git
cd darkroom-app
```

### 2. Create and Activate Virtual Environment
```powershell
# Create (if not already there):
python -m venv .venv

# Activate:
.\.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
```powershell
pip install --upgrade pip
pip install -r backend/requirements.txt
```

### 4. Set Environment Variables
- Create a `.env` file in the project root (use `.env.example` as a template).
- Modify to customize `DARKROOM_DATABASE_URL`, `DARKROOM_STORAGE_PATH`, etc.

### 5. Initialize Database
```powershell
alembic upgrade head
```

### 6. Start Dev Server
```powershell
uvicorn backend.main:app --reload
```

---

This README file now reflects the updated vision and roadmap for transforming Darkroom into a **local, advanced, privacy-friendly Adobe Photoshop Pro clone**. Everything we discussed (layer-based editing, advanced tools, AI enhancements) is documented here to keep the vision clear.
