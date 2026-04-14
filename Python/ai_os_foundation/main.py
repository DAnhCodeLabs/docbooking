from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from src.interfaces.schemas import UniversalRequest, UniversalResponse
from src.kernel.engine import AIEngine
import uvicorn

# Khởi tạo ASGI App
app = FastAPI(title="Universal AI Foundation API")

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Server Python đang chạy ở cổng 8001"}

@app.post("/v1/chat/completions", response_model=UniversalResponse)
async def chat_completion(request: UniversalRequest):
    try:
        # Chuyển request vào Lõi điều phối (có chứa Failover)
        return await AIEngine.execute(request)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    print("🚀 Đang khởi động Server tại http://127.0.0.1:8001")
    uvicorn.run("main:app", host="127.0.0.1", port=8001, reload=True)