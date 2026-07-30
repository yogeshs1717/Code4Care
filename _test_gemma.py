import sys, os
sys.path.insert(0, '.')

from backend.services.llm.google_gemma import GoogleGemmaService
import asyncio

async def test():
    svc = GoogleGemmaService(api_key='AQ.Ab8RN6JvqwNEi7xVhDywVSwYt5-3OKeF-7UFVSqrPyT_RWcfCA')
    try:
        result = await svc.generate_summary('{"health_score": {"score": 70}}')
        print(f'Summary: {result[:200]}')
    except Exception as e:
        print(f'Error type: {type(e).__name__}')
        print(f'Error: {e}')

asyncio.run(test())
