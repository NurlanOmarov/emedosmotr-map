import asyncio

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.middleware.auth import decode_token
from app.modules.ws.manager import ws_manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/map")
async def ws_map(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
    except Exception:
        await websocket.close(code=4001)
        return

    user_id = payload.get("sub", "unknown")
    role = payload.get("role", "unknown")
    rooms = ["map_global", f"role_{role}", f"user_{user_id}"]

    await ws_manager.connect(websocket, rooms)
    try:
        while True:
            data = await asyncio.wait_for(websocket.receive_json(), timeout=35)
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except (WebSocketDisconnect, asyncio.TimeoutError):
        ws_manager.disconnect(websocket, rooms)


@router.websocket("/ws/tasks")
async def ws_tasks(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = decode_token(token)
    except Exception:
        await websocket.close(code=4001)
        return

    user_id = payload.get("sub", "unknown")
    rooms = ["tasks_global", f"user_{user_id}"]

    await ws_manager.connect(websocket, rooms)
    try:
        while True:
            data = await asyncio.wait_for(websocket.receive_json(), timeout=35)
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except (WebSocketDisconnect, asyncio.TimeoutError):
        ws_manager.disconnect(websocket, rooms)
