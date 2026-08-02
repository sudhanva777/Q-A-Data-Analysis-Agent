import logging
import os
import time
import traceback
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from src import db
from src.analysis_service import (
    answer_question,
    delete_dataset_file,
    fetch_history,
    get_dataset_details,
    get_dataset_path,
    list_datasets,
    upload_dataset_file,
)

# Create required directories
os.makedirs("data", exist_ok=True)
os.makedirs("outputs", exist_ok=True)
os.makedirs("logs", exist_ok=True)

# Initialize database schema
if os.path.exists("logs"):
    db.init_db()
else:
    db.init_db()

# CORS and docs configuration
allowed_origins_raw = os.environ.get("ALLOWED_ORIGINS") or os.environ.get("FRONTEND_ORIGIN") or "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_raw.split(",") if origin.strip()]
ENABLE_OPENAPI_DOCS = os.environ.get("ENABLE_OPENAPI_DOCS", "true").lower() in ("1", "true", "yes")

app = FastAPI(
    title="CSV/Excel Data Q&A Agent API",
    description="REST API for AI-powered tabular data Q&A with sandboxed execution & zero hallucinated numbers",
    version="1.0.0",
    docs_url="/docs" if ENABLE_OPENAPI_DOCS else None,
    redoc_url="/redoc" if ENABLE_OPENAPI_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_OPENAPI_DOCS else None,
)

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s %(message)s")
logger = logging.getLogger("api")

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("Validation error for %s %s: %s", request.method, request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=422,
        content={"error": "Invalid request payload.", "details": exc.errors()},
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception for %s %s: %s", request.method, request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Something went wrong processing this request."},
    )

# Enable CORS for React frontend (Vite dev server)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve chart image files generated in outputs/
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")


class QueryRequest(BaseModel):
    dataset_id: str
    question: str


@app.get("/health")
def health_check():
    """Basic health check endpoint."""
    return {
        "status": "ok",
        "service": "CSV/Excel Data Q&A Agent API",
        "model": "llama-3.3-70b-versatile",
        "timestamp": time.time(),
    }


@app.get("/datasets")
def list_dataset_metadata():
    """List available datasets in data/ folder with metadata."""
    return {"status": "success", "datasets": list_datasets()}


@app.get("/datasets/{dataset_id}")
def retrieve_dataset_details(dataset_id: str):
    """Retrieve detailed schema and preview for a specific dataset."""
    try:
        return get_dataset_details(dataset_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Failed to inspect dataset: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to inspect dataset.") from exc


@app.delete("/datasets/{dataset_id}")
def remove_dataset(dataset_id: str):
    """Remove a dataset file from the data directory."""
    try:
        return delete_dataset_file(dataset_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Failed to delete dataset: %s", exc)
        raise HTTPException(status_code=500, detail="Failed to delete dataset.") from exc


MAX_UPLOAD_BYTES = 50 * 1024 * 1024

@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    """Upload a CSV or Excel file and return metadata + schema."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="A file is required.")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Uploaded file exceeds maximum allowed size of 50 MB.",
        )

    try:
        return upload_dataset_file(file.filename, contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Failed to parse uploaded file: %s", exc)
        raise HTTPException(status_code=400, detail="Failed to parse uploaded file.") from exc


@app.post("/query")
def process_query(body: QueryRequest):
    """Execute natural language Q&A against dataset using agent pipeline."""
    dataset_id = body.dataset_id.strip()
    question = body.question.strip()

    if not dataset_id or not question:
        raise HTTPException(status_code=400, detail="dataset_id and question are required.")

    try:
        return answer_question(dataset_id, question)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(exc)}") from exc


@app.get("/history")
def get_history(limit: int = Query(default=50, ge=1, le=200)):
    """Fetch recent interaction history logs from SQLite database."""
    return fetch_history(limit=limit)


# Compatibility aliases for the older /api/* route names used by earlier frontend builds.
@app.get("/api/health")
def health_check_api():
    return health_check()


@app.get("/api/datasets")
def list_dataset_metadata_api():
    return list_dataset_metadata()


@app.get("/api/datasets/{dataset_id}")
def retrieve_dataset_details_api(dataset_id: str):
    return retrieve_dataset_details(dataset_id)


@app.delete("/api/datasets/{dataset_id}")
def remove_dataset_api(dataset_id: str):
    return remove_dataset(dataset_id)


@app.post("/api/upload")
async def upload_dataset_api(file: UploadFile = File(...)):
    return await upload_dataset(file)


@app.post("/api/query")
def process_query_api(body: QueryRequest):
    return process_query(body)


@app.get("/api/history")
def get_history_api(limit: int = Query(default=50, ge=1, le=200)):
    return get_history(limit=limit)
