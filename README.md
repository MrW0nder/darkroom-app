# Darkroom

Advanced, AI-powered, local-only desktop photo editor — a modern Adobe Lightroom Pro clone with offline privacy, full RAW support, and advanced image batch and queue workflows.

---

## 🚫 Important

- **Local-only application**: No cloud features, internet connectivity, or external API calls by default.
- All workflow, processing, and file saving happen on your device only.

---

## ✨ Major Features (Goals)

- True layer-based image editing: brush, text, cropping, shapes, masks, history
- Non-destructive edits with advanced undo/redo
- Arbitrary-angle cropping and zoom during crop
- Customizable adjustment groups/panels (add, remove, reorder, drag/drop)
- Keyboard shortcuts for core workflows
- Watermarking and preset management
- Powerful batch import/export with queue management
- RAW format compatibility and hybrid pipelines (RAW, JPEG, TIFF, etc.)

### AI-enhanced Editing (Planned)
- Object detection and easy selection/grouping
- One‑click object removal (AI inpainting)
- Context-aware object replacement (several generated options)
- Background-only or subject-only editing modes
- Super-resolution / upscaling (multiple target sizes)
- Face detection, auto-colorization, savable AI presets

---

## Project Structure

```
darkroom-app/
├── backend/      # Python FastAPI API, Alembic migrations, queue, storage and DB
├── frontend/     # React/TypeScript app, Electron shell (desktop)
├── docs/         # Planning docs, wireframes, feature checklist
├── .env.example  # Example environment configuration
└── README.md
```

Key docs:
- `docs/DARKROOM_FEATURE_CHECKLIST.md` — progress tracking and feature matrix
- `docs/wireframes/` — UI sketches and workflow diagrams

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
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### 7. Open and Test
- API Docs: <http://127.0.0.1:8000/docs>
- Test file uploads at `POST /api/import` via the interactive UI. Uploaded files are saved in `/backend/storage/originals/`.

---

## Notes About Common Issues

- `ModuleNotFoundError`:
  Ensure you’re running from the project root (`darkroom-app`) and the virtual environment is active.

- SQLite Locking:
  SQLite is used for local development but may need replacement for concurrent production workloads.

- Logs:
  Logs (to console) include the effective database URL and storage path at startup.

---

## Remaining Short-Term Tasks

### 1. API Enhancements
- Adjust response status codes (e.g., `201 Created` on file import).
- Ensure OpenAPI documentation matches the actual responses.

### 2. Hardening
- Add stricter file validations (size, format).
- Add concurrency considerations for batch imports.

### 3. Production Readiness
- Add Dockerfile.
- Implement S3-compatible cloud storage.

### 4. Test Suite
- Unit and integration tests for upload and database interaction.

---

Darkroom is under active development. Contributions and feedback are welcome!