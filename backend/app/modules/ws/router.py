import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.middleware.auth import decode_token
from app.modules.ws.manager import ws_manager

router = APIRouter(tags=["WebSocket"])

_AUTH_TIMEOUT = 5  # seconds to wait for auth handshake


async def _authenticate(websocket: WebSocket) -> dict | None:
    """Accept connection and wait for auth handshake message. Returns payload or None."""
    await websocket.accept()
    try:
        msg = await asyncio.wait_for(websocket.receive_json(), timeout=_AUTH_TIMEOUT)
    except (TimeoutError, Exception):
        await websocket.close(code=4001)
        return None

    if msg.get("type") != "auth":
        await websocket.close(code=4001)
        return None

    try:
        return decode_token(msg.get("token", ""))
    except Exception:
        await websocket.close(code=4001)
        return None


@router.websocket("/ws/map")
async def ws_map(websocket: WebSocket):
    payload = await _authenticate(websocket)
    if payload is None:
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
    except (TimeoutError, WebSocketDisconnect):
        ws_manager.disconnect(websocket, rooms)


@router.websocket("/ws/tasks")
async def ws_tasks(websocket: WebSocket):
    payload = await _authenticate(websocket)
    if payload is None:
        return

    user_id = payload.get("sub", "unknown")
    rooms = ["tasks_global", f"user_{user_id}"]

    await ws_manager.connect(websocket, rooms)
    try:
        while True:
            data = await asyncio.wait_for(websocket.receive_json(), timeout=35)
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except (TimeoutError, WebSocketDisconnect):
        ws_manager.disconnect(websocket, rooms)


@router.websocket("/ws/taskops")
async def ws_taskops(websocket: WebSocket):
    payload = await _authenticate(websocket)
    if payload is None:
        return

    user_id = payload.get("sub", "unknown")
    role = payload.get("role", "unknown")
    rooms = ["taskops_global", f"taskops_user_{user_id}", f"taskops_role_{role}"]

    await ws_manager.connect(websocket, rooms)
    try:
        while True:
            data = await asyncio.wait_for(websocket.receive_json(), timeout=35)
            if data.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except (TimeoutError, WebSocketDisconnect):
        ws_manager.disconnect(websocket, rooms)
