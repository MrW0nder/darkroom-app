# Darkroom

Advanced, AI-powered, local-only desktop photo editor — a modern Adobe Lightroom Pro clone with offline privacy, full RAW support, and advanced image batch and queue workflows.

---

## 🚫 Important

- Local-only application: No cloud features, internet connectivity, or external API calls by default.
- All workflow, processing, and file saving happens on your device only.

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
├── backend/      # Python FastAPI API, AI pipeline, queue, storage and DB
├── frontend/     # React/TypeScript app, Electron shell (desktop)
├── docs/         # Planning docs, wireframes, feature checklist
├── .gitignore
├── LICENSE
└── README.md
```

Key docs:
- `docs/DARKROOM_FEATURE_CHECKLIST.md` — progress tracking and feature matrix
- `docs/wireframes/` — UI sketches and workflow diagrams

---

## What I did (status update — verified 2025-12-12)

During a live troubleshooting session we performed and verified the following on a Windows dev machine using PowerShell:

- Created/activated a local virtual environment at `.venv` and confirmed Python is using it.
- Installed backend dependencies from `backend/requirements.txt` into `.venv`.
- Ensured SQLAlchemy was installed into the active venv.
- Fixed `backend/init_db.py` import behavior by running it as a module and created the database tables:
  - Command used: `python -m backend.init_db`
  - Result: "Database tables created successfully."
- Confirmed the SQLite DB file exists at `backend/storage/db.sqlite` and that the `images` table exists with expected columns:
  - id, filename, filepath, width, height, format, metadata, created_at
- Started the FastAPI app with Uvicorn:
  - Command used: `python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000`
  - Verified /docs and OpenAPI operated and `POST /api/import` returned 200 OK.
- Performed an upload via the interactive docs; verified that:
  - The uploaded file is saved under `backend/storage/originals/<hashed_filename>.<ext>`
  - A matching DB row was inserted into the `images` table (filename set to the original filename, `filepath` stores saved location)
- Created two temporary helper scripts during troubleshooting:
  - `backend/check_tables.py` — quick table inspection
  - `backend/check_recent.py` — shows newest file in originals & matching DB rows

These steps confirm the core upload + persistence flow is working on your dev machine.

---

## Quickstart (developer, Windows PowerShell)

These exact steps were used and are known to work for local development.

1. Clone
```powershell
git clone https://github.com/<your-username>/darkroom-app.git
cd darkroom-app
```

2. Create/activate venv (if you already have `.venv`):
```powershell
# create if needed:
python -m venv .venv

# activate:
.\.venv\Scripts\Activate.ps1
```

3. Confirm Python is the venv interpreter:
```powershell
python -c "import sys; print('PYTHON:', sys.executable); print('VERSION:', sys.version)"
```

4. Install backend dependencies:
```powershell
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
python -m pip install SQLAlchemy
```

5. Initialize DB (run as module so imports resolve):
```powershell
python -m backend.init_db
# Expected output: "Database tables created successfully."
```

6. Run the dev server:
```powershell
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

7. Test uploads:
- Open http://127.0.0.1:8000/docs and use the import endpoint (POST `/api/import`) via the interactive UI.
- Files are saved to `backend/storage/originals/`.
- DB rows are written to `backend/storage/db.sqlite` → table `images`.

8. Helpful checks (used during debugging)
```powershell
# List files saved by uploads
Get-ChildItem -Path .\backend\storage\originals -File | Sort-Object LastWriteTime -Descending | Select-Object Name,LastWriteTime,Length | Format-Table

# Quick DB checks (helper script)
python backend/check_recent.py
```

9. Stop server: press Ctrl+C in the uvicorn terminal  
Deactivate venv:
```powershell
deactivate
```

---

## Files created during troubleshooting
- `backend/check_tables.py`
- `backend/check_recent.py`

Remove them if you want a clean repo:
```powershell
Remove-Item backend/check_tables.py
Remove-Item backend/check_recent.py
```

---

## Notes about common issues & fixes

- "No module named 'backend'" when running a script:
  - Run the script as a module from the project root, e.g. `python -m backend.init_db`, or add the project root to `sys.path` at the top of the script.
- If a package is missing (e.g., SQLAlchemy), ensure `.venv` is activated and install into that interpreter:
  - `python -m pip install SQLAlchemy`
- Swagger/OpenAPI docs list possible responses (201, 422, etc.) — the implemented endpoint returned 200 in our session. We should harmonize the documented and returned status codes.

---

## Remaining tasks / short-term roadmap

1. API behavior & docs
   - Decide canonical status codes (e.g., return 201 Created on successful import).
   - Ensure OpenAPI schema matches actual responses.

2. DB & storage conventions
   - Current behavior: `filename` stores original filename; `filepath` stores full saved path (hashed filename).
   - Decide whether to store the hashed filename in `filename` or keep original; implement and migrate if required.

3. Cleanup & tests
   - Remove temporary helper scripts after verification.
   - Add unit and integration tests for the upload flow (file saved + DB row inserted).
   - Add schema migrations (Alembic) if the DB schema will evolve.

4. Hardening & validations
   - File size limits, allowed formats, robust metadata extraction and error handling.
   - Concurrency & file-locking considerations for queue/batch imports.

5. Production readiness
   - Add Dockerfile and production Uvicorn/Gunicorn configuration.
   - Support for configurable storage backends (local path or S3-compatible).
   - CI/CD: run tests, lint, and build artifacts on push.

6. Feature roadmap (longer-term)
   - Background worker for heavy tasks (Celery/RQ)
   - Full AI pipeline integration (local models, optimized inference)
   - User accounts, per-user storage, collection management
   - UI/UX polish, keyboard customizations, preset marketplace

---

## If you want me to update the README in the repo
I can create the updated README as a commit/PR for you. Tell me which you prefer:
- "Commit and push to main" — I will give the exact git commands you can run locally, or I can prepare a PR (I will need permission to create a branch/PR via the GitHub API).
- "Only provide file contents" — copy/paste this file over your existing README.md (you already pushed other changes earlier).

---

If you'd like any of the remaining tasks prioritized and turned into concrete issues or PRs, tell me one small task and I'll create the exact code change or issue text for you.
