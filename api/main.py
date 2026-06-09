from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routers import patients, sessions, risk, scores, reports

app = FastAPI(title="Revaive API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patients.router, prefix="/patients", tags=["patients"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(risk.router, prefix="/risk", tags=["risk"])
app.include_router(scores.router, prefix="/scores", tags=["scores"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])
