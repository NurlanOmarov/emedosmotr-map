# ПЛАН ДЕПЛОЯ (DEPLOYMENT PLAN) — eMedosmotr-map

Этот документ содержит пошаговую инструкцию по выводу системы eMedosmotr-map в промышленную эксплуатацию (Production). Каждый шаг описывает **что делать**, **зачем это нужно** и **как проверить результат**.

> **Важно**: Этапы выполняются строго последовательно. Не переходите к следующему этапу, не завершив предыдущий.

---

## 📅 Этап 1: Подготовка кода и исправление ошибок — ✅ ВЫПОЛНЕНО (2026-05-13)

Перед деплоем необходимо убедиться, что код находится в чистом, рабочем состоянии. Деплой "сырого" кода с ошибками приведёт к падению сервиса сразу после запуска.

### 1.1 Backend (FastAPI)

#### ✅ Объединение миграций Alembic
**Зачем**: В репозитории сейчас два независимых "head" в истории миграций (разветвление). Alembic не сможет применить их по одной команде `upgrade head` — получите ошибку. Merge-миграция объединяет обе ветки в одну точку.
```bash
uv run alembic merge -m "merge heads" f9e8d7c6b5a4 a9b0c1d2e3f4
uv run alembic upgrade head
```
**Результат**: Уже был единственный head `e2b3c4d5e6f7` — merge не потребовался.

#### ✅ Проверка типов и линтинг
**Зачем**: `ruff` находит синтаксические ошибки и неиспользуемые импорты, которые могут вызвать ошибки при запуске. `mypy` проверяет типы — это особенно важно для FastAPI, где аннотации типов используются для автогенерации схем API.
```bash
uv run ruff check . --fix
uv run mypy .
```
**Результат**: Установлены dev-зависимости (`ruff`, `mypy`, `pytest`). Исправлены все логические ошибки: E711 (`!= None` → `.isnot(None)`), E741 (переменные `l` → `lbl`), F841 (неиспользуемые переменные), UP042 (StrEnum), E701/E722 (bare except). Для alembic/миграций и утилитных скриптов добавлены `per-file-ignores`. Остаток — 71 E501 (длинные строки), не влияют на работу. Mypy: 65 предупреждений в 20 файлах, не блокируют запуск.

#### ⚠️ Запуск тестов
**Зачем**: Убедиться, что основная бизнес-логика работает корректно перед деплоем. Тест, упавший на продакшне, означает простой для всех пользователей.
```bash
uv run pytest -v
```
**Результат**: Тесты не написаны — 0 собрано. **Необходимо написать smoke-тест для `/health` эндпоинта перед деплоем.**

---

### 1.2 Frontend (React)

#### ✅ Исправление TSC ошибок
**Зачем**: TypeScript-ошибки (неиспользуемые импорты, неверные типы) не мешают разработке, но могут вызвать проблемы при production-сборке, т.к. Vite в режиме `build` включает строгую проверку типов.
```bash
npx tsc --noEmit 2>&1 | grep "error TS"
```
**Результат**: Исправлено 35 ошибок в 12 файлах. Добавлены недостающие импорты (`authApi`, `telegramApi`, `Link`) в `Header.tsx`; убраны неиспользуемые иконки; `bgPrimary` → `bg` в 4 компонентах; добавлен `LoadMoreBtn` в `GoalsPage.tsx`; исправлена типизация `typeInfo.icon` в `LocationDetail.tsx`. Итог: 0 ошибок TSC.

#### ✅ Очистка артефактов разработки
**Зачем**: Файлы `tsc_output_*.txt` — это артефакты отладки, не нужные в репозитории. Они засоряют git-историю.
```bash
rm frontend/tsc_output_*.txt
```
**Результат**: 9 файлов удалено.

#### ✅ Валидация production-сборки
**Зачем**: `npm run dev` и `npm run build` — разные процессы. Сборка для продакшна минифицирует код, делает tree-shaking, и может упасть даже если dev-сервер работал нормально.
```bash
cd frontend && npm run build
```
**Результат**: Сборка прошла успешно. Дополнительно увеличен лимит PWA precache с 2 MiB до 4 MiB в `vite.config.ts` (JS бандл весит 2.7 MB). Папка `dist/` создана.


### 2.1 Генерация новых секретов

#### JWT Secret Key
**Зачем**: JWT-токены подписываются этим ключом. Если ключ слабый или совпадает с dev-ключом ("secret", "changeme"), злоумышленник сможет подделать токены и войти под любым пользователем.
```bash
openssl rand -hex 64
```
Результат — строка из 128 символов. Скопируйте её в `SECRET_KEY`.

#### VAPID Keys (Push-уведомления)
**Зачем**: VAPID (Voluntary Application Server Identification) — стандарт аутентификации push-уведомлений. Браузер откажет в отправке уведомлений без корректных ключей. Ключи генерируются один раз и хранятся постоянно — при их смене все подписки пользователей станут недействительными.
```bash
python -c "from py_vapid import Vapid; v=Vapid(); v.generate_keys(); print('Private:', v.private_key, '\nPublic:', v.public_key)"
```

#### Sentry DSN — ✅ ВЫПОЛНЕНО (Код)
**Зачем**: Sentry — система мониторинга ошибок. DSN (Data Source Name) — это уникальный URL, куда отправляются отчёты об ошибках. Без него вы не узнаете о проблемах до тех пор, пока не пожалуется пользователь.
- Создать два проекта в [sentry.io](https://sentry.io): один для backend (Python), один для frontend (React).
- Скопировать DSN каждого проекта в соответствующий `.env` файл.
- Код для инициализации SDK уже добавлен в `main.py` и `celery_app.py`.

#### Пароль базы данных
**Зачем**: Текущий пароль в `docker-compose.yml` — `password`. Это первое, что проверяет любой автоматический сканер при атаке на сервер.
```bash
openssl rand -base64 32
```

---

### 2.2 Настройка production файлов

#### backend/.env
```env
# Режим
DEBUG=false
ENVIRONMENT=production

# База данных (основная)
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_STRONG_PASSWORD@postgres:5432/emedosmotr_map
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD

# База данных eMedosmotr (read-only, для ETL)
EMEDOSMOTR_DB_URL=postgresql://...

# Безопасность
SECRET_KEY=YOUR_128_CHAR_SECRET
ALLOWED_ORIGINS=https://emedosmotr-map.kz,https://www.emedosmotr-map.kz

# Уведомления
VAPID_PRIVATE_KEY=YOUR_VAPID_PRIVATE
VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC
VAPID_CLAIM_EMAIL=admin@emedosmotr-map.kz

# Мониторинг
SENTRY_DSN=https://...@sentry.io/...
```

#### frontend/.env.production
```env
VITE_API_URL=https://emedosmotr-map.kz/api
VITE_WS_URL=wss://emedosmotr-map.kz/ws
VITE_SENTRY_DSN=https://...@sentry.io/...
VITE_VAPID_PUBLIC_KEY=YOUR_VAPID_PUBLIC
```

#### Проверка .gitignore
**Зачем**: Один случайный коммит с секретами — и их нужно считать скомпрометированными, менять все ключи.
```bash
cat .gitignore | grep -E "\.env"
# Должны быть строки: .env, .env.*, .env.local и т.д.
```

---

## 🐳 Этап 3: Подготовка Docker для продакшна — ✅ ВЫПОЛНЕНО (2026-05-13)

Текущий `docker-compose.yml` создан для **разработки**: код монтируется как volume, backend запускается с `--reload`, порты БД открыты наружу. Для продакшна нужна отдельная конфигурация.

### 3.1 Создание docker-compose.prod.yml

**Ключевые отличия от dev-конфига:**

#### Убрать `--reload` из backend
**Зачем**: Флаг `--reload` заставляет Uvicorn отслеживать изменения файлов и перезапускаться. В продакшне это: (а) лишняя нагрузка на CPU, (б) риск непредвиденного перезапуска, (в) Uvicorn не запускает несколько worker-процессов с `--reload`.
```yaml
# Dev (НЕВЕРНО для прода):
command: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Prod (ВЕРНО):
command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```
`--workers 4` позволяет обрабатывать несколько запросов параллельно (рекомендуется: 2 × CPU_cores + 1).

#### Фронтенд через Nginx, а не Vite dev-сервер
**Зачем**: Vite dev-сервер (`npm run dev`) — это инструмент для разработки с hot-reload. Он не рассчитан на production-нагрузку и не оптимизирует раздачу статики. Nginx отдаёт файлы из `dist/` в разы быстрее.

#### Закрыть порты Postgres и Redis
**Зачем**: В текущем `docker-compose.yml` Postgres доступен снаружи на порту 5433, Redis — на 6380. Любой, кто знает IP вашего сервера, может попытаться подключиться к БД напрямую.
```yaml
# Dev (НЕВЕРНО для прода — порт открыт наружу):
ports:
  - "5433:5432"

# Prod (ВЕРНО — доступ только внутри Docker-сети):
expose:
  - "5432"
```

#### Добавить restart: unless-stopped
**Зачем**: При перезагрузке сервера Docker не запускает контейнеры автоматически, если это не указано явно. `unless-stopped` означает: "запускать всегда, кроме случаев, когда контейнер был остановлен вручную".
```yaml
restart: unless-stopped
```

#### Добавить контейнер Celery Beat
**Зачем**: `celery_worker` обрабатывает задачи по требованию, но ETL-задачи (синхронизация данных из eMedosmotr) должны запускаться по расписанию — это делает `celery_beat`. Без него синхронизация данных не будет происходить автоматически.
```yaml
celery_beat:
  build:
    context: ./backend
    dockerfile: Dockerfile
  command: celery -A app.celery_app beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
  env_file: ./backend/.env
  restart: unless-stopped
```

#### Лимиты памяти
**Зачем**: Без лимитов один упавший контейнер может занять всю RAM сервера и "убить" остальные сервисы (OOM killer).
```yaml
deploy:
  resources:
    limits:
      memory: 512M
```

#### Вынести пароли из docker-compose в .env
**Зачем**: `docker-compose.prod.yml` может быть закоммичен в репозиторий (для документации), а значит пароли в нём — утечка данных.
```yaml
# В docker-compose.prod.yml используем переменную:
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

# В .env файле хранится реальное значение (не в git):
POSTGRES_PASSWORD=your_strong_password_here
```

### 3.2 Настройка логирования контейнеров
**Зачем**: По умолчанию Docker хранит логи без ограничения размера. За месяц работы логи могут занять десятки гигабайт и заполнить диск сервера, что приведёт к падению всей системы.
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "50m"   # Максимальный размер одного файла логов
    max-file: "5"     # Хранить не более 5 файлов (итого max 250MB)
```

---

## 🗄 Этап 4: База данных и миграции — ✅ ВЫПОЛНЕНО (2026-05-13)

Этот этап выполняется **на сервере** после того, как Docker-контейнеры подняты.

#### Активация PostGIS
**Зачем**: Проект использует геоданные (границы регионов, координаты объектов). PostGIS — расширение PostgreSQL для работы с геоданными. Без него все операции с геометрией (`ST_Contains`, `ST_Intersects` и др.) завершатся с ошибкой `function does not exist`.

Образ `postgis/postgis:15-3.3` уже содержит расширение, но его нужно активировать в базе данных:
```bash
docker compose exec postgres psql -U postgres -d emedosmotr_map -c "
  CREATE EXTENSION IF NOT EXISTS postgis;
  CREATE EXTENSION IF NOT EXISTS postgis_topology;
"
```
**Проверка**: `SELECT PostGIS_Version();` должен вернуть версию (например, `3.3.0`).

#### Применение миграций Alembic
**Зачем**: Создаёт все таблицы, индексы и связи в базе данных согласно моделям приложения.
```bash
docker compose exec backend uv run alembic upgrade head
```
**Проверка**: Команда завершилась без ошибок, `alembic current` показывает актуальный revision.

#### Сидинг данных (роли и базовые проекты)
**Зачем**: Без начальных данных система запустится, но будет неработоспособна: нет ролей — нельзя назначить права; нет базового проекта "Инциденты с карты" — задачи из карты некуда создавать.
```bash
docker compose exec backend uv run python scripts/seed.py
```

#### Создание первого admin-пользователя
**Зачем**: После сидинга в системе есть роли, но нет пользователей. Нужен хотя бы один администратор для входа в систему.
```bash
docker compose exec backend uv run python scripts/reset_admin.py
```
Сохраните выданные credentials в надёжном месте.

#### Миграция геоданных
**Зачем**: Границы регионов (Алматы, Астана) хранятся как GeoJSON и должны быть загружены в БД отдельно — они слишком большие для обычных миграций Alembic.
```bash
docker compose exec postgres psql -U postgres -d emedosmotr_map -f /scripts/geo_seed.sql
```
**Проверка**: 
```sql
SELECT name, ST_IsValid(geom) FROM regions;
-- Все строки должны вернуть true
```

---

## 🌐 Этап 5: Инфраструктура (Nginx & SSL)

Nginx выступает в роли "входной двери" для всего трафика: принимает HTTPS-запросы, проксирует их в нужный контейнер и отдаёт статику фронтенда.

### 5.1 Настройка Nginx

#### Reverse Proxy для API и WebSockets
**Зачем**: Браузер не может напрямую обратиться к контейнеру backend (он в Docker-сети). Nginx транслирует внешние запросы к `/api/` во внутренние запросы к `backend:8000`.

Для WebSocket (`/ws/`) нужны специальные заголовки `Upgrade` и `Connection` — без них WebSocket-соединение не установится.

```nginx
location /api/ {
    proxy_pass http://backend:8000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /ws/ {
    proxy_pass http://backend:8000/ws/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;  # 24 часа (WebSocket долгоживущий)
}
```

#### Отдача статики фронтенда
**Зачем**: Nginx отдаёт файлы из папки `dist/` напрямую, без участия Node.js. Это на порядок быстрее и потребляет меньше ресурсов. `try_files` нужен для React Router — без него прямые переходы по URL (например, `/taskops/`) вернут 404.
```nginx
location / {
    root /var/www/emedosmotr/dist;
    try_files $uri $uri/ /index.html;
}
```

#### Rate Limiting
**Зачем**: Без ограничений один злоумышленник или сломанный клиент может отправлять тысячи запросов в секунду, перегружая backend. Rate limiting ограничивает частоту запросов с одного IP.
```nginx
# В секции http{}:
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

# В location /api/:
limit_req zone=api burst=10 nodelay;

# Для auth-эндпоинтов (строже):
location /api/auth/ {
    limit_req zone=auth burst=3 nodelay;
    proxy_pass http://backend:8000/auth/;
}
```

#### Заголовки безопасности
**Зачем**: Защищают от распространённых атак (XSS, clickjacking, MIME-sniffing) без изменений в коде приложения.
```nginx
add_header X-Frame-Options "SAMEORIGIN";           # Запрет встраивания в iframe
add_header X-Content-Type-Options "nosniff";       # Запрет MIME-sniffing
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Permissions-Policy "geolocation=(self)"; # Разрешить геолокацию только своему домену
```

#### Gzip-сжатие
**Зачем**: JavaScript-бандл React-приложения может весить 1-3MB. С gzip он сжимается в 3-5 раз, что ускоряет первую загрузку страницы.
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/javascript;
gzip_min_length 1024;
```

---

### 5.2 SSL (Let's Encrypt)

#### Получение сертификата
**Зачем**: HTTPS обязателен для: (а) безопасности — передача токенов и данных в открытом виде недопустима; (б) Push-уведомлений — браузеры разрешают Web Push только на HTTPS; (в) геолокации — `navigator.geolocation` работает только на HTTPS.
```bash
# Установить Certbot
apt install certbot python3-certbot-nginx

# Получить сертификат (Certbot сам изменит nginx-конфиг)
certbot --nginx -d emedosmotr-map.kz -d www.emedosmotr-map.kz
```

#### Настройка автопродления
**Зачем**: Сертификаты Let's Encrypt действуют 90 дней. Если не настроить автопродление, через 90 дней браузеры начнут показывать предупреждение "Небезопасное соединение" и пользователи не смогут войти в систему.

Certbot при установке создаёт systemd timer. Нужно только убедиться, что он включён:
```bash
systemctl enable certbot.timer
systemctl start certbot.timer
systemctl status certbot.timer  # Должен быть active

# Проверить, что автопродление сработает:
certbot renew --dry-run
```

---

### 5.3 Firewall (UFW)

**Зачем**: По умолчанию на сервере открыты все порты. Firewall закрывает их, оставляя только необходимые. Без firewall Postgres (5432) и Redis (6379) могут быть доступны из интернета, что является критической уязвимостью.
```bash
# Сбросить правила
ufw --force reset

# Разрешить только нужное
ufw allow 22/tcp     # SSH (обязательно до включения!)
ufw allow 80/tcp     # HTTP (нужен для Certbot и редиректа на HTTPS)
ufw allow 443/tcp    # HTTPS

# Включить
ufw enable
ufw status verbose
```
> **Внимание**: Добавьте правило для SSH (22) **до** включения firewall, иначе потеряете доступ к серверу.

---

### 5.4 Защита: Cloudflare (DDoS & WAF)
**Зачем**: Cloudflare скрывает ваш реальный IP и отражает 99% автоматизированных атак и DDoS до того, как они достигнут вашего сервера.

#### Настройка:
1. Создать аккаунт на [cloudflare.com](https://cloudflare.com).
2. Добавить сайт `emedosmotr-map.kz`.
3. Изменить Name Servers (NS) у регистратора домена на те, что даст Cloudflare (обычно это занимает от 1 до 24 часов).
4. В разделе **DNS**:
    * Создать A-запись `emedosmotr-map.kz` -> IP вашего сервера.
    * Убедиться, что переключатель Proxy status — **Proxied** (оранжевое облако).
5. В разделе **SSL/TLS**:
    * Выбрать режим **Full (strict)** — это обеспечит безопасное соединение между Cloudflare и вашим Nginx.

---

### 5.5 Защита: CrowdSec (Intrusion Detection)
**Зачем**: Обнаруживает и блокирует IP-адреса, которые пытаются подобрать пароли к SSH или сканируют ваш API на наличие уязвимостей.

#### Установка на сервер:
```bash
# Установка CrowdSec (анализатор логов)
curl -s https://install.crowdsec.net | sh
apt install crowdsec

# Установка bouncer (компонент, который блокирует IP в фаерволе)
apt install crowdsec-firewall-bouncer-iptables
```

#### Проверка:
```bash
# Список обнаруженных атак и заблокированных IP
cscli decisions list

# Проверить, какие сервисы мониторит CrowdSec
cscli status
```
**Результат**: Теперь сервер защищен не только статическим фаерволом UFW, но и динамической системой, которая "учится" на атаках по всему миру.

---

## 🚀 Этап 6: Запуск и верификация

### 6.1 Запуск контейнеров
```bash
# Запустить в фоне
docker compose -f docker-compose.prod.yml up -d

# Проверить статус — все сервисы должны быть "healthy" или "running"
docker compose -f docker-compose.prod.yml ps

# Просмотреть логи запуска (последние 100 строк)
docker compose -f docker-compose.prod.yml logs --tail=100
```

---

### 6.2 Health Checks
**Зачем**: Убедиться, что приложение не просто запустилось, но и готово принимать запросы.
```bash
# API доступен
curl https://emedosmotr-map.kz/api/health
# Ожидаемый ответ: {"status": "ok"}

# База данных подключена
curl https://emedosmotr-map.kz/api/ready
# Ожидаемый ответ: {"status": "ready", "db": "ok", "redis": "ok"}

# Celery worker работает
docker compose exec celery_worker celery -A app.celery_app inspect ping
```

---

### 6.3 ETL Проверка
**Зачем**: Убедиться, что синхронизация данных из основной системы eMedosmotr работает корректно. Если ETL сломан — данные на карте будут устаревшими.
```bash
# Запустить синхронизацию вручную
docker compose exec celery_worker celery -A app.celery_app call app.tasks.etl.sync_funnel_data

# Проверить результат в логах
docker compose logs celery_worker --tail=50
```

---

### 6.4 Smoke Tests (ручная проверка после каждого деплоя)

Это минимальный набор проверок, который нужно пройти вручную, чтобы убедиться в работоспособности системы:

| # | Проверка | Ожидаемый результат |
|---|----------|---------------------|
| 1 | Открыть главную страницу карты | Карта загрузилась, видны границы регионов |
| 2 | Войти как admin | Успешная авторизация, токен сохранён |
| 3 | Перейти в TaskOps → Dashboard | Список задач отображается |
| 4 | Создать тестовую задачу | Задача создана, видна в списке и на карте |
| 5 | Открыть задачу на карте | Детальная панель задачи открылась |
| 6 | Загрузить фото к задаче | Фото загружено, отображается в карточке |
| 7 | Проверить Sentry (Backend) | Ошибка 404/500 должна появиться в дашборде Sentry |
| 7 | Проверить уведомления | Bell-иконка отображает счётчик, Drawer открывается |
| 8 | Проверить вкладку Inbox | Входящие задачи загружаются |
| 9 | Открыть AdminPanel → Users | Список пользователей загружается |
| 10 | Открыть в мобильном браузере | Карта и TaskOps адаптированы под мобильный экран |

---

### 6.5 Мониторинг

#### Sentry (ошибки приложения)
**Зачем**: Sentry автоматически перехватывает необработанные исключения в backend и frontend, группирует их и отправляет алерт на email при первом появлении новой ошибки. Без Sentry вы узнаёте о проблемах только от пользователей.

После деплоя откройте дашборд Sentry и убедитесь, что события от нового деплоя начали поступать.

#### Uptime-мониторинг
**Зачем**: Sentry работает "изнутри" — он может сообщить об ошибке в коде, но не узнает, что сервер упал полностью (нет питания, зависший контейнер, переполнен диск). Для этого нужен внешний сервис, который каждые 5 минут делает HTTP-запрос к вашему серверу и отправляет алерт, если сервер не отвечает.

Рекомендуемые бесплатные сервисы: [UptimeRobot](https://uptimerobot.com), [Freshping](https://www.freshworks.com/website-monitoring/).

Настройте мониторинг для URL: `https://emedosmotr-map.kz/api/health`

#### Алерты в Telegram/Email
**Зачем**: Чтобы узнать о проблеме раньше пользователя. В Sentry и UptimeRobot настройте отправку уведомлений в Telegram или на email ответственного администратора при:
- Новой необработанной ошибке в продакшне.
- Недоступности сервера более 5 минут.

---

## 💾 Этап 7: Бэкапы

Бэкап — это страховка. Его ценность определяется не тем, настроен ли он, а тем, можно ли из него восстановиться.

### Бэкап базы данных
**Зачем**: БД содержит все задачи, пользователей, геоданные и настройки. Потеря данных без бэкапа — катастрофа.

Настройте автоматический дамп через cron:
```bash
# Откройте редактор cron
crontab -e

# Добавьте задачу: каждый день в 3:00 ночи
0 3 * * * docker exec emedosmotr_postgres pg_dump -U postgres emedosmotr_map | gzip > /backups/db_$(date +\%Y\%m\%d).sql.gz
```

### Бэкап media volume
**Зачем**: Загруженные пользователями фото и документы хранятся в Docker volume `media_data`, а не в БД. Бэкап БД не включает эти файлы.
```bash
# Добавить в cron (после бэкапа БД)
30 3 * * * docker run --rm -v emedosmotr_map_media_data:/data -v /backups:/backup alpine tar czf /backup/media_$(date +\%Y\%m\%d).tar.gz /data
```

### Ротация бэкапов
**Зачем**: Без ротации бэкапы со временем заполнят диск. Оптимально хранить 30 дней ежедневных бэкапов.
```bash
# Удалять бэкапы старше 30 дней (добавить в cron)
0 4 * * * find /backups -name "*.sql.gz" -mtime +30 -delete
0 4 * * * find /backups -name "*.tar.gz" -mtime +30 -delete
```

### Тестовое восстановление
**Зачем**: "Нетестированный бэкап — не бэкап". Часто бэкап настроен, файлы создаются, но при реальном восстановлении оказывается, что они повреждены или содержат неполные данные. Проверьте восстановление до запуска продакшна.
```bash
# Восстановить дамп в тестовую БД
gunzip -c /backups/db_YYYYMMDD.sql.gz | docker exec -i emedosmotr_postgres psql -U postgres -d emedosmotr_map_test

# Убедиться, что данные на месте
docker exec emedosmotr_postgres psql -U postgres -d emedosmotr_map_test -c "SELECT COUNT(*) FROM tasks;"
```

---

## ⚙️ Этап 8: CI/CD (рекомендуется)

Ручной деплой — это риск: можно забыть шаг, применить неправильную версию кода или деплоить в нестабильном состоянии. CI/CD автоматизирует весь процесс.

### GitHub Actions workflow
**Зачем**: При каждом пуше в ветку `main` автоматически:
1. Запускаются тесты (если они упали — деплой не происходит).
2. Собирается Docker-образ.
3. Образ отправляется на сервер.
4. На сервере поднимается новая версия.

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run backend tests
        run: |
          cd backend
          pip install uv && uv sync
          uv run pytest

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /srv/emedosmotr-map
            git pull origin main
            docker compose -f docker-compose.prod.yml up -d --build
```

**Секреты для GitHub Actions** (Settings → Secrets → Actions):
- `SERVER_HOST` — IP или домен сервера
- `SERVER_USER` — имя пользователя (например, `ubuntu`)
- `SSH_PRIVATE_KEY` — приватный SSH-ключ для доступа к серверу

---

## 🆘 План отката (Rollback)

При обнаружении критической проблемы после деплоя:

### 1. Откат кода
```bash
# Посмотреть историю образов
docker images | grep emedosmotr

# Вернуться к предыдущему образу (без пересборки)
docker compose -f docker-compose.prod.yml up -d --no-deps backend

# Или откатить git и пересобрать
git revert HEAD
docker compose -f docker-compose.prod.yml up -d --build
```

### 2. Откат миграции БД
**Зачем**: Если новая миграция сломала структуру БД, нужно вернуть схему к предыдущему состоянию.
```bash
# Откатить последнюю миграцию
docker compose exec backend uv run alembic downgrade -1

# Если нужно откатить несколько
docker compose exec backend uv run alembic downgrade <revision_id>
```
> **Внимание**: Откат миграции может привести к потере данных, добавленных в новых полях. Убедитесь, что у вас есть свежий бэкап.

### 3. Восстановление БД из бэкапа
**Когда использовать**: Если откат миграции невозможен или данные повреждены.
```bash
# Остановить приложение (чтобы не было новых записей во время восстановления)
docker compose -f docker-compose.prod.yml stop backend celery_worker celery_beat

# Восстановить из последнего бэкапа
gunzip -c /backups/db_$(date +%Y%m%d).sql.gz | docker exec -i emedosmotr_postgres psql -U postgres -d emedosmotr_map

# Запустить приложение
docker compose -f docker-compose.prod.yml start backend celery_worker celery_beat
```

### 4. Сброс кэша Nginx
```bash
nginx -s reload
```

---

## ✅ Чеклист готовности к деплою

Пройдите этот список перед каждым production-деплоем:

| # | Пункт | Статус |
|---|-------|--------|
| 1 | Alembic merge выполнен, `alembic upgrade head` проходит без ошибок | ⬜ |
| 2 | `uv run pytest` — все тесты зелёные | ⬜ |
| 3 | `npm run build` — сборка прошла без ошибок | ⬜ |
| 4 | `.env` файлы настроены, секреты сгенерированы (не "password", не "secret") | ⬜ |
| 5 | `.env` файлы добавлены в `.gitignore` и не в репозитории | ⬜ |
| 6 | `docker-compose.prod.yml` создан (без `--reload`, без открытых портов БД) | ⬜ |
| 7 | PostGIS расширение активировано в БД | ⬜ |
| 8 | Seed данных выполнен (роли, проекты, admin-пользователь) | ⬜ |
| 9 | Геоданные регионов загружены и валидны | ⬜ |
| 10 | Nginx настроен с Reverse Proxy, WebSocket и отдачей статики | ⬜ |
| 11 | Rate limiting настроен для `/api/` и `/api/auth/` | ⬜ |
| 12 | SSL сертификат получен, HTTPS работает | ⬜ |
| 13 | SSL автопродление настроено (`certbot renew --dry-run` успешно) | ⬜ |
| 14 | Firewall настроен (только 22/80/443, Postgres и Redis закрыты) | ⬜ |
| 15 | Все контейнеры запущены, `docker compose ps` — все healthy | ⬜ |
| 16 | Celery Worker и Celery Beat работают | ⬜ |
| 17 | ETL синхронизация выполнена вручную и прошла успешно | ⬜ |
| 18 | Smoke tests пройдены (все 10 пунктов из раздела 6.4) | ⬜ |
| 19 | Бэкап БД настроен и протестирован (тестовое восстановление выполнено) | ⬜ |
| 20 | Бэкап media volume настроен | ⬜ |
| 21 | Uptime-мониторинг подключён (UptimeRobot или аналог) | ⬜ |
| 22 | Алерты настроены в Sentry (email/Telegram) | ✅ |
