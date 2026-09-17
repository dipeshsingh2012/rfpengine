from fastapi import FastAPI
from app.api.v1.api import api_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add CORSMiddleware right here:
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://frontend-d5wo6laxd-dipesh-s-projects4.vercel.app/",  # Your production Vercel domain
        "http://localhost:3000",        # Local frontend development
    ],
    allow_credentials=True,
    allow_methods=["*"],                # Allows GET, POST, OPTIONS, etc.
    allow_headers=["*"],                # Allows custom headers like Authorization
)

# Ensure the api_router is mounted at the correct base path
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
