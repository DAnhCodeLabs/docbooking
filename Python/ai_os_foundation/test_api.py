import asyncio
import httpx

async def run_test():
    # Phải khớp với host/port trong main.py
    url = "http://127.0.0.1:8001/v1/chat/completions"
    
    payload = {
        "model": "gemini/gemini-2.5-flash", # Sử dụng model bạn yêu cầu
        "messages": [
            {
                "role": "user",
                "content": [{"text": "Chào bạn, hãy phản hồi để xác nhận hệ thống đã thông suốt."}]
            }
        ],
        "temperature": 0.5
    }
    
    # Timeout 60 giây vì AI có thể trả lời lâu
    async with httpx.AsyncClient(timeout=60.0) as client:
        print("📡 Bước 1: Kiểm tra kết nối vật lý...")
        try:
            health = await client.get("http://127.0.0.1:8001/health")
            print(f"🔗 Server Health: {health.json()}")
            
            print("📡 Bước 2: Gửi yêu cầu xử lý AI...")
            response = await client.post(url, json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print("✅ AI Trả lời:", data['choices'][0]['content'][0]['text'])
                print(f"📊 Usage: {data['usage']}")
            else:
                print(f"❌ Server trả lỗi {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"❌ LỖI KẾT NỐI: Server chưa được bật ở Terminal khác hoặc sai Port. Chi tiết: {e}")

if __name__ == "__main__":
    asyncio.run(run_test())