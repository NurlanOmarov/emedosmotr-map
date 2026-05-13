# eMedosmotr-map — Подключение к серверу

## Параметры сервера
- **Provider:** ps.kz
- **Host:** `82.115.49.125`
- **IPv6:** `2a00:5da0:2005:1::2bf`
- **User:** `administrator`
- **Port:** `4822`
- **Auth:** Только SSH-ключи (пароль отключён)
- **OS:** Ubuntu 24.04 LTS
- **Ресурсы:** 2 CPU / 2 GB RAM / 40 GB диск

## Подключение
```bash
ssh -p 4822 -i ~/.ssh/emedosmotr_deploy_ed25519 administrator@82.115.49.125
```

## SSH-ключи
- **Приватный ключ (локально):** `~/.ssh/emedosmotr_deploy_ed25519`
- **Публичный ключ:** `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIze7eyWpZAx6i2ZtHW+Qjaacb2X0L4F7uuC5w1Ng5kf github-actions-emedosmotr`
- **На сервере:** `/home/administrator/.ssh/authorized_keys`

## Структура на сервере
- **Проект:** `/home/administrator/emedosmotr-map`
- **Инфра (nginx + certbot):** `/home/administrator/emedosmotr-infra`
- **SSL сертификаты:** `/home/administrator/emedosmotr-infra/certbot/conf/live/`
- **Бэкапы:** `/backups/emedosmotr-map/`

## Домен
- **Домен:** `emedosmotr-map.kz`
- **DNS:** A-запись → `82.115.49.125`
- **SSL:** Certbot (Let's Encrypt), автообновление каждые 12ч через certbot-контейнер

## Docker контейнеры
| Контейнер | Описание |
|-----------|----------|
| `emedosmotr-infra-nginx-1` | Центральный Nginx (порты 80, 443) |
| `emedosmotr-infra-certbot-1` | Certbot (автообновление SSL) |
| `emedosmotr_backend` | FastAPI backend (внутренний порт 8000) |
| `emedosmotr_nginx` | Frontend Nginx (внешний порт 8090) |
| `emedosmotr_postgres` | PostgreSQL + PostGIS (внутренний) |
| `emedosmotr_redis` | Redis (внутренний) |
| `emedosmotr_celery_worker` | Celery worker |
| `emedosmotr_celery_beat` | Celery beat (планировщик) |

## Деплой
- **Автоматический:** Push в `main` → GitHub Actions → SSH → docker compose up
- **Ручной:**
```bash
ssh -p 4822 -i ~/.ssh/emedosmotr_deploy_ed25519 administrator@82.115.49.125
cd /home/administrator/emedosmotr-map
git pull origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec -T backend alembic upgrade head
```

## GitHub Actions секреты
| Секрет | Значение |
|--------|----------|
| `SERVER_HOST` | `82.115.49.125` |
| `SERVER_USER` | `administrator` |
| `SSH_PORT` | `4822` |
| `SSH_PRIVATE_KEY` | Приватный SSH-ключ `~/.ssh/emedosmotr_deploy_ed25519` |

## Nginx (центральный)
Конфиг: `/home/administrator/emedosmotr-infra/nginx/nginx.conf`

Перезапуск nginx после правки:
```bash
cd /home/administrator/emedosmotr-infra
docker compose exec nginx nginx -t      # проверка
docker compose restart nginx            # перезапуск
```

## SSL — ручное обновление (при необходимости)
```bash
cd /home/administrator/emedosmotr-infra
docker compose run --rm certbot renew
docker compose restart nginx
```

## Логи
```bash
# Backend
docker logs --tail 50 emedosmotr_backend

# Frontend nginx
docker logs --tail 50 emedosmotr_nginx

# Celery worker
docker logs --tail 50 emedosmotr_celery_worker

# Центральный nginx
docker logs --tail 50 emedosmotr-infra-nginx-1

# Все контейнеры — ресурсы
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
```

## Firewall (UFW)
```bash
sudo ufw status verbose
# Открыты: 4822/tcp (SSH), 80/tcp (HTTP), 443/tcp (HTTPS)
# Всё остальное — закрыто

# Добавить новый порт при необходимости:
sudo ufw allow PORT/tcp
```

## Автозапуск и восстановление
1. **Docker:** настроен на автозагрузку (`systemctl enable docker`)
2. **Контейнеры:** `restart: unless-stopped` в compose-файлах
3. **fail2ban:** защита SSH, бан после 5 неудачных попыток (порт 4822)

## Если SSH недоступен
Использовать VNC-консоль на портале ps.kz → войти под `ubuntu` (начальный пользователь).

---
*Настроен 2026-05-13*
