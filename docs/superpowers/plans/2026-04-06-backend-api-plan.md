# Vexloft Panel Backend API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Multi-tenant QR menü yönetim sistemi backend API'si — auth, işletme CRUD, menü yönetimi, tema, dosya upload, public endpoint.

**Architecture:** Fastify REST API, Prisma ORM ile PostgreSQL, Redis cache/session, JWT auth (access+refresh), Zod validation, disk-based file upload. Docker compose ile development, Coolify deploy.

**Tech Stack:** Node.js 20, TypeScript, Fastify, Prisma, PostgreSQL 16, Redis 7, Zod, bcrypt, jsonwebtoken, fastify-multipart

---

## File Structure

```
vexloftpanel/
├── src/
│   ├── app.ts                  # Fastify instance, CORS, plugins, route registration
│   ├── server.ts               # Start server, graceful shutdown
│   ├── routes/
│   │   ├── auth.ts             # POST register/login/refresh/change-password, GET me
│   │   ├── businesses.ts       # GET list, POST create, GET/:slug, PUT/:slug, DELETE/:slug
│   │   ├── themes.ts           # GET/PUT businesses/:slug/theme
│   │   ├── categories.ts       # CRUD + reorder for businesses/:slug/categories
│   │   ├── menu-items.ts       # CRUD + reorder for businesses/:slug/menu-items
│   │   ├── business-info.ts    # GET/PUT businesses/:slug/info
│   │   ├── upload.ts           # POST /upload multipart file
│   │   └── public.ts           # GET /public/:slug (no auth, cached)
│   ├── middleware/
│   │   ├── auth.ts             # JWT verify → request.user
│   │   └── rbac.ts             # authorize(roles), checkOwnership(slug)
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── redis.ts            # ioredis client singleton
│   │   ├── jwt.ts              # generateTokens, verifyAccess, verifyRefresh
│   │   ├── upload.ts           # saveFile, deleteFile, getUploadPath
│   │   └── cache.ts            # getCache, setCache, invalidateCache
│   ├── schemas/
│   │   ├── auth.ts             # registerSchema, loginSchema, changePasswordSchema
│   │   ├── business.ts         # createBusinessSchema, updateBusinessSchema
│   │   ├── category.ts         # createCategorySchema, updateCategorySchema, reorderSchema
│   │   ├── menu-item.ts        # createMenuItemSchema, updateMenuItemSchema, reorderSchema
│   │   └── theme.ts            # updateThemeSchema
│   └── types/
│       └── index.ts            # UserPayload, AuthenticatedRequest, Role enum
├── prisma/
│   ├── schema.prisma           # Full database schema
│   └── seed.ts                 # Admin + 3 sample businesses with full menu data
├── uploads/                    # Git-ignored, volume mounted
├── docker-compose.yml          # api + postgres + redis
├── Dockerfile                  # Multi-stage Node.js 20 Alpine
├── .env.example                # Template env vars
├── .gitignore
├── package.json
└── tsconfig.json
```

---

### Task 1: Project Scaffolding + Docker

**Files:**
- Create: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `.env`, `docker-compose.yml`, `Dockerfile`

- [ ] **Step 1: Initialize npm project**

```bash
cd "/Users/berkeakgun/Desktop/Kişisel/vexloftpanel"
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install fastify @fastify/cors @fastify/multipart @fastify/static @prisma/client ioredis jsonwebtoken bcryptjs zod uuid
npm install -D typescript @types/node @types/jsonwebtoken @types/bcryptjs @types/uuid prisma tsx
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
uploads/
.next/
```

- [ ] **Step 5: Create .env.example and .env**

```
DATABASE_URL=postgresql://vexloft:vexloft123@localhost:5432/vexloftpanel
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
PORT=3001
UPLOAD_DIR=./uploads
UPLOAD_MAX_SIZE=5242880
CORS_ORIGIN=http://localhost:3000
```

- [ ] **Step 6: Create docker-compose.yml**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: vexloftpanel
      POSTGRES_USER: vexloft
      POSTGRES_PASSWORD: vexloft123
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
volumes:
  pgdata:
  redisdata:
```

- [ ] **Step 7: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
RUN mkdir -p uploads
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

- [ ] **Step 8: Add scripts to package.json**

Add to package.json scripts:
```json
{
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  }
}
```

- [ ] **Step 9: Start Docker services**

```bash
docker compose up -d
```

- [ ] **Step 10: Git init and commit**

```bash
git init
git add -A
git commit -m "chore: scaffold project with Docker, TypeScript, dependencies"
```

---

### Task 2: Prisma Schema + Migration

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Create Prisma schema**

Full schema with all models: User (id, email, password, name, role), Business (id, ownerId, name, slug, template, isActive), BusinessTheme (1:1 with Business, all color/font/layout fields), Category (businessId, nameTr/En, slug, banner, sortOrder, layout, isActive), MenuItem (categoryId, businessId, nameTr/En, descriptionTr/En, price, image, sortOrder, isActive, badges JSON), BusinessInfo (1:1 with Business, tagline, established, locationTr/En, hoursTr/En, phone, website, instagram).

Enums: Role (ADMIN, OWNER), Template (CAFE, RESTAURANT, PUB, CUSTOM), LayoutType (FULLCARD, LIST, GRID, HYBRID), CategoryLayout (DEFAULT, CHALKBOARD, GRID).

All IDs are UUID with @default(uuid()). Relations with onDelete Cascade where appropriate.

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name init
```

- [ ] **Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add Prisma schema with all models and initial migration"
```

---

### Task 3: Core Libs (Prisma, Redis, JWT, Types)

**Files:**
- Create: `src/types/index.ts`, `src/lib/prisma.ts`, `src/lib/redis.ts`, `src/lib/jwt.ts`, `src/lib/cache.ts`, `src/lib/upload.ts`

- [ ] **Step 1: Create types**

UserPayload interface (userId, role, businessSlug?), extend Fastify's FastifyRequest with user property.

- [ ] **Step 2: Create Prisma singleton**

Standard Prisma client singleton pattern.

- [ ] **Step 3: Create Redis client**

ioredis client from REDIS_URL env.

- [ ] **Step 4: Create JWT helpers**

generateTokens(payload) → {accessToken, refreshToken}, verifyAccessToken(token), verifyRefreshToken(token). Access: 15min, Refresh: 7d. Store refresh in Redis with key `refresh:{userId}`.

- [ ] **Step 5: Create cache helpers**

getCache(key), setCache(key, data, ttl), invalidateCache(pattern). Pattern-based invalidation for `public:menu:{slug}`.

- [ ] **Step 6: Create upload helpers**

saveFile(file, businessSlug) → path. Generates UUID filename, saves to UPLOAD_DIR/{businessSlug}/. deleteFile(path). Validates mime type (jpeg, png, webp) and size (5MB max).

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add core libs — prisma, redis, jwt, cache, upload, types"
```

---

### Task 4: Auth Middleware + Zod Schemas

**Files:**
- Create: `src/middleware/auth.ts`, `src/middleware/rbac.ts`, `src/schemas/auth.ts`, `src/schemas/business.ts`, `src/schemas/category.ts`, `src/schemas/menu-item.ts`, `src/schemas/theme.ts`

- [ ] **Step 1: Create auth middleware**

`authenticate` — extracts Bearer token, verifies JWT, attaches user payload to request. Returns 401 if invalid.

- [ ] **Step 2: Create RBAC middleware**

`authorize(...roles)` — checks request.user.role against allowed roles. Returns 403 if not allowed.
`checkOwnership` — for business-scoped routes: admin passes always, owner only if business.ownerId matches request.user.userId. Extracts slug from request params.

- [ ] **Step 3: Create all Zod schemas**

Auth: registerSchema (email, password min 6, name), loginSchema (email, password), changePasswordSchema (currentPassword, newPassword).
Business: createBusinessSchema (name, slug, template, ownerId), updateBusinessSchema (partial).
Category: createCategorySchema (nameTr, nameEn, layout?, sortOrder?), updateCategorySchema (partial), reorderSchema ([{id, sortOrder}]).
MenuItem: createMenuItemSchema (nameTr, nameEn, descriptionTr, descriptionEn, price, categoryId, image?, badges?), updateMenuItemSchema (partial), reorderSchema.
Theme: updateThemeSchema (all color/font/layout fields, all optional).

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add auth/rbac middleware and Zod validation schemas"
```

---

### Task 5: Fastify App + Auth Routes

**Files:**
- Create: `src/app.ts`, `src/server.ts`, `src/routes/auth.ts`

- [ ] **Step 1: Create Fastify app**

Register @fastify/cors (CORS_ORIGIN), @fastify/multipart (5MB limit), @fastify/static (uploads dir). Register all route plugins. Error handler for Zod validation errors.

- [ ] **Step 2: Create server.ts**

Start server on PORT, graceful shutdown (close prisma, redis).

- [ ] **Step 3: Create auth routes**

POST /auth/register — validate with Zod, hash password with bcrypt, create user, return tokens.
POST /auth/login — validate, find user by email, compare password, generate tokens, store refresh in Redis.
POST /auth/refresh — verify refresh token from body, check Redis, generate new tokens, rotate refresh.
GET /auth/me — authenticate middleware, return user info (no password).
POST /auth/change-password — authenticate, verify current password, hash new, update.

- [ ] **Step 4: Test manually**

```bash
npm run dev
# In another terminal:
curl -X POST http://localhost:3001/auth/register -H "Content-Type: application/json" -d '{"email":"admin@vexloft.com","password":"admin123","name":"Berke"}'
```

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: add Fastify app setup and auth routes"
```

---

### Task 6: Business Routes

**Files:**
- Create: `src/routes/businesses.ts`

- [ ] **Step 1: Implement business CRUD**

GET /businesses — authenticate + if admin: list all with owner info, if owner: list own businesses.
POST /businesses — authenticate + authorize(ADMIN) + validate, create business + auto-create BusinessTheme + BusinessInfo.
GET /businesses/:slug — authenticate + checkOwnership, include theme + info + category count + item count.
PUT /businesses/:slug — authenticate + checkOwnership + validate, update.
DELETE /businesses/:slug — authenticate + authorize(ADMIN), cascade delete.

- [ ] **Step 2: Commit**

```bash
git add src/routes/businesses.ts
git commit -m "feat: add business CRUD routes with ownership check"
```

---

### Task 7: Theme + BusinessInfo Routes

**Files:**
- Create: `src/routes/themes.ts`, `src/routes/business-info.ts`

- [ ] **Step 1: Implement theme routes**

GET /businesses/:slug/theme — authenticate + checkOwnership, return theme.
PUT /businesses/:slug/theme — authenticate + checkOwnership + validate, upsert theme, invalidate cache.

- [ ] **Step 2: Implement business info routes**

GET /businesses/:slug/info — authenticate + checkOwnership, return info.
PUT /businesses/:slug/info — authenticate + checkOwnership + validate, upsert info, invalidate cache.

- [ ] **Step 3: Commit**

```bash
git add src/routes/
git commit -m "feat: add theme and business info routes"
```

---

### Task 8: Category Routes

**Files:**
- Create: `src/routes/categories.ts`

- [ ] **Step 1: Implement category CRUD + reorder**

GET /businesses/:slug/categories — authenticate + checkOwnership, list ordered by sortOrder, include item count.
POST /businesses/:slug/categories — authenticate + checkOwnership + validate, create with auto slug from nameTr, auto sortOrder (max+1).
PUT /businesses/:slug/categories/:id — authenticate + checkOwnership + validate, update, invalidate cache.
DELETE /businesses/:slug/categories/:id — authenticate + checkOwnership, cascade delete items, invalidate cache.
PUT /businesses/:slug/categories/reorder — authenticate + checkOwnership + validate array, batch update sortOrder, invalidate cache.

- [ ] **Step 2: Commit**

```bash
git add src/routes/categories.ts
git commit -m "feat: add category CRUD and reorder routes"
```

---

### Task 9: MenuItem Routes

**Files:**
- Create: `src/routes/menu-items.ts`

- [ ] **Step 1: Implement menu item CRUD + reorder**

GET /businesses/:slug/menu-items — authenticate + checkOwnership, query param ?categoryId for filter, ordered by sortOrder.
POST /businesses/:slug/menu-items — authenticate + checkOwnership + validate, verify categoryId belongs to this business, create with auto sortOrder.
PUT /businesses/:slug/menu-items/:id — authenticate + checkOwnership + validate, update, invalidate cache.
DELETE /businesses/:slug/menu-items/:id — authenticate + checkOwnership, delete, invalidate cache.
PUT /businesses/:slug/menu-items/reorder — authenticate + checkOwnership + validate, batch update, invalidate cache.

- [ ] **Step 2: Commit**

```bash
git add src/routes/menu-items.ts
git commit -m "feat: add menu item CRUD and reorder routes"
```

---

### Task 10: Upload Route

**Files:**
- Create: `src/routes/upload.ts`

- [ ] **Step 1: Implement file upload**

POST /upload — authenticate, accept multipart file, validate type (jpeg/png/webp) and size (5MB), save to disk using upload helper, return {path, url}. Query param ?businessSlug to organize files per business.

- [ ] **Step 2: Serve uploaded files**

Static file serving already configured in app.ts via @fastify/static pointing to UPLOAD_DIR with prefix /uploads.

- [ ] **Step 3: Commit**

```bash
git add src/routes/upload.ts
git commit -m "feat: add file upload route with validation"
```

---

### Task 11: Public Menu Endpoint

**Files:**
- Create: `src/routes/public.ts`

- [ ] **Step 1: Implement public endpoint**

GET /public/:slug — NO auth required. Check Redis cache first (key: `public:menu:{slug}`). If miss: query business + theme + info + categories (ordered, active only) + items (ordered, active only) per category. Nest items inside categories. Set cache with 5min TTL. Return full menu data object matching spec response shape.

- [ ] **Step 2: Commit**

```bash
git add src/routes/public.ts
git commit -m "feat: add public menu endpoint with Redis cache"
```

---

### Task 12: Seed Script

**Files:**
- Create: `prisma/seed.ts`

- [ ] **Step 1: Create seed script**

Create admin user (admin@vexloft.com, bcrypt hashed password).
Create 3 businesses:
- The Cozy Bean (CAFE template, FULLCARD layout, warm cream colors)
- Maison Élégante (RESTAURANT template, LIST layout, dark/gold colors)
- The Black Sheep (PUB template, HYBRID layout, dark wood/amber colors)

For each business: create BusinessTheme with template-appropriate colors, BusinessInfo with location/hours, Categories with correct layout types, MenuItems with all data from existing qr-menu static files (menu-data.ts, restaurant-data.ts, pub-data.ts).

Use the EXACT same data that's currently in the qr-menu project's lib/ files so the migration is seamless.

- [ ] **Step 2: Run seed**

```bash
npm run db:seed
```

- [ ] **Step 3: Verify with Prisma Studio**

```bash
npm run db:studio
```

Check all tables have data.

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: add seed script with admin user and 3 sample businesses"
```

---

### Task 13: Register Routes in App + Final Test

**Files:**
- Modify: `src/app.ts`

- [ ] **Step 1: Register all route plugins in app.ts**

Make sure all 8 route files are registered as Fastify plugins.

- [ ] **Step 2: End-to-end manual test**

```bash
# Start services
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev

# Test auth
curl -s http://localhost:3001/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"admin@vexloft.com","password":"admin123"}' | jq

# Test public endpoint
curl -s http://localhost:3001/public/the-cozy-bean | jq '.categories | length'
# Expected: 6 (cafe categories)

# Test business list
TOKEN=$(curl -s ... | jq -r '.accessToken')
curl -s http://localhost:3001/businesses -H "Authorization: Bearer $TOKEN" | jq
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: register all routes, verify end-to-end"
```

---

### Task 14: Docker Build + GitHub Push

**Files:**
- No new files

- [ ] **Step 1: Test Docker build**

```bash
docker build -t vexloftpanel .
```

- [ ] **Step 2: Create GitHub repo and push**

```bash
gh repo create vexloftpanel --public --source=. --push
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: finalize Docker build and push to GitHub"
```
