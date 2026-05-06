import asyncio
from collections import defaultdict

from fastapi import WebSocket, WebSocketDisconnect


class ConnectionManager:
    def __init__(self):
        self.room_connections: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, ws: WebSocket, rooms: list[str]) -> None:
        await ws.accept()
        for room in rooms:
            self.room_connections[room].add(ws)

    def disconnect(self, ws: WebSocket, rooms: list[str]) -> None:
        for room in rooms:
            self.room_connections[room].discard(ws)

    async def broadcast_to_room(self, room: str, event: str, data: dict) -> None:
        message = {"event": event, "data": data}
        dead = set()
        for ws in self.room_connections.get(room, set()).copy():
            try:
                await ws.send_json(message)
            except (WebSocketDisconnect, RuntimeError):
                dead.add(ws)
        for ws in dead:
            self.room_connections[room].discard(ws)

    async def broadcast_to_rooms(self, rooms: list[str], event: str, data: dict) -> None:
        await asyncio.gather(*(self.broadcast_to_room(r, event, data) for r in rooms))


ws_manager = ConnectionManager()
