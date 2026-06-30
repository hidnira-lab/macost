from fastapi import FastAPI

app = FastAPI(title="Macost API")

@app.get("/")
def read_root():
    return {"status": "Macost backend running"}