import os
import subprocess
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models import User

router = APIRouter(prefix="/settings", tags=["settings"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="Только для администраторов")
    return current_user


@router.get("/db-info")
async def db_info(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(_require_admin),
):
    rows = await db.execute(text("""
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
            (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = t.schemaname AND table_name = t.tablename) AS columns
        FROM pg_tables t
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    """))
    tables = [
        {"table": r.tablename, "size": r.size, "columns": r.columns}
        for r in rows.fetchall()
    ]

    db_size = await db.execute(text(
        "SELECT pg_size_pretty(pg_database_size(current_database())) AS size"
    ))
    total_size = db_size.scalar()

    # row counts for key tables
    counts = {}
    for tbl in ("users", "locations", "tasks", "taskops_tasks", "taskops_projects"):
        try:
            res = await db.execute(text(f"SELECT COUNT(*) FROM {tbl}"))
            counts[tbl] = res.scalar()
        except Exception:
            counts[tbl] = None

    return {
        "total_size": total_size,
        "tables": tables,
        "counts": counts,
    }


@router.get("/backup")
async def create_backup(_: User = Depends(_require_admin)):
    db_url = os.environ.get("DATABASE_URL", "")
    # parse postgresql+asyncpg://user:pass@host:port/dbname
    # → host, port, user, password, dbname
    import re
    m = re.match(
        r"postgresql\+asyncpg://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)",
        db_url,
    )
    if not m:
        raise HTTPException(status_code=500, detail="Не удалось распарсить DATABASE_URL")

    user, password, host, port, dbname = m.groups()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"backup_{dbname}_{timestamp}.sql"

    env = os.environ.copy()
    env["PGPASSWORD"] = password

    try:
        result = subprocess.run(
            [
                "pg_dump",
                "-h", host,
                "-p", port,
                "-U", user,
                "-d", dbname,
                "--no-password",
                "--format=plain",
                "--encoding=UTF8",
            ],
            capture_output=True,
            env=env,
            timeout=120,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="pg_dump не найден на сервере")
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=500, detail="pg_dump превысил лимит времени")

    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"pg_dump завершился с ошибкой: {result.stderr.decode()[:500]}",
        )

    sql_bytes = result.stdout

    def iter_content():
        yield sql_bytes

    return StreamingResponse(
        iter_content(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
