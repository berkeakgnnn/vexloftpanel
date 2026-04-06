# Vexloft Panel — Backend API Tasarım Spesifikasyonu (Faz 1)

## Özet

Multi-tenant QR menü yönetim sistemi backend API'si. Fastify + PostgreSQL + Redis. JWT auth, işletme CRUD, menü yönetimi, tema özelleştirme, dosya upload. Coolify'da deploy.

## Faz Planı

- **Faz 1 (bu spec):** Backend API + veritabanı
- **Faz 2:** Admin Panel Frontend
- **Faz 3:** Public menü entegrasyonu (qr-menu projesini API'den besleme)

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** Fastify
- **ORM:** Prisma
- **Veritabanı:** PostgreSQL (Coolify servisi)
- **Cache/Session:** Redis (Coolify servisi)
- **Auth:** JWT (access + refresh token)
- **Dosya upload:** fastify-multipart, disk storage (Coolify volume)
- **Validation:** Zod (schema validation)
- **Deploy:** Docker → Coolify

## Veritabanı Şeması

### User
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | UUID | Primary key |
| email | String | Unique, login için |
| password | String | bcrypt hash |
| name | String | Görünen isim |
| role | Enum | ADMIN veya OWNER |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Business
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | UUID | Primary key |
| ownerId | UUID | → User (OWNER) |
| name | String | İşletme adı |
| slug | String | Unique, URL için (the-cozy-bean) |
| template | Enum | CAFE, RESTAURANT, PUB, CUSTOM |
| isActive | Boolean | Menü yayında mı |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### BusinessTheme
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | UUID | Primary key |
| businessId | UUID | → Business (1:1) |
| primaryColor | String | Ana renk hex (#3e2723) |
| accentColor | String | Vurgu renk (#8d6346) |
| bgColor | String | Arka plan (#faf6f0) |
| cardBgColor | String | Kart arka planı (#ffffff) |
| textColor | String | Ana metin (#2c1810) |
| mutedTextColor | String | Soluk metin (#8d7b6a) |
| borderColor | String | Border (#e8dcc8) |
| fontHeading | String | Başlık fontu (Playfair Display) |
| fontBody | String | Body fontu (Inter) |
| layoutType | Enum | FULLCARD, LIST, GRID, HYBRID |
| heroImage | String | Nullable, dosya path |
| logo | String | Nullable, dosya path |
| customCSS | String | Nullable, ileri seviye özelleştirme |

### Category
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | UUID | Primary key |
| businessId | UUID | → Business |
| nameTr | String | Türkçe isim |
| nameEn | String | İngilizce isim |
| slug | String | URL-safe isim |
| banner | String | Nullable, dosya path |
| sortOrder | Int | Sıralama |
| layout | Enum | DEFAULT, CHALKBOARD, GRID |
| isActive | Boolean | |

### MenuItem
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | UUID | Primary key |
| categoryId | UUID | → Category |
| businessId | UUID | → Business (hızlı query için) |
| nameTr | String | Türkçe isim |
| nameEn | String | İngilizce isim |
| descriptionTr | String | Türkçe açıklama |
| descriptionEn | String | İngilizce açıklama |
| price | Decimal | Fiyat |
| image | String | Nullable, dosya path |
| sortOrder | Int | Sıralama |
| isActive | Boolean | |
| badges | JSON | Nullable, esnek alanlar {volume, abv, type} |

### BusinessInfo
| Alan | Tip | Açıklama |
|------|-----|----------|
| id | UUID | Primary key |
| businessId | UUID | → Business (1:1) |
| tagline | String | Nullable (SPECIALTY COFFEE & MORE) |
| established | String | Nullable (EST. 2024) |
| locationTr | String | |
| locationEn | String | |
| hoursTr | String | |
| hoursEn | String | |
| phone | String | Nullable |
| website | String | Nullable |
| instagram | String | Nullable |

## API Endpoints

### Auth
```
POST   /auth/register        — Kayıt (email, password, name)
POST   /auth/login            — Login → {accessToken, refreshToken}
POST   /auth/refresh           — Refresh token → yeni access token
GET    /auth/me                — Mevcut kullanıcı bilgisi
POST   /auth/change-password   — Şifre değiştir
```

### Business
```
GET    /businesses             — Liste (admin: hepsi, owner: kendininki)
POST   /businesses             — Yeni işletme (admin only)
GET    /businesses/:slug       — Detay
PUT    /businesses/:slug       — Güncelle
DELETE /businesses/:slug       — Sil (admin only)
```

### Theme
```
GET    /businesses/:slug/theme     — Tema ayarları
PUT    /businesses/:slug/theme     — Tema güncelle (tüm renk, font, layout alanları)
```

### Categories
```
GET    /businesses/:slug/categories            — Kategori listesi (sortOrder'a göre)
POST   /businesses/:slug/categories            — Yeni kategori
PUT    /businesses/:slug/categories/:id        — Güncelle
DELETE /businesses/:slug/categories/:id        — Sil (altındaki ürünler de silinir)
PUT    /businesses/:slug/categories/reorder    — Sıralama güncelle [{id, sortOrder}]
```

### Menu Items
```
GET    /businesses/:slug/menu-items            — Ürün listesi (?categoryId= filtre)
POST   /businesses/:slug/menu-items            — Yeni ürün
PUT    /businesses/:slug/menu-items/:id        — Güncelle
DELETE /businesses/:slug/menu-items/:id        — Sil
PUT    /businesses/:slug/menu-items/reorder    — Sıralama güncelle [{id, sortOrder}]
```

### Business Info
```
GET    /businesses/:slug/info      — İşletme bilgileri
PUT    /businesses/:slug/info      — Güncelle
```

### Upload
```
POST   /upload    — Dosya yükle (multipart/form-data) → {path, url}
```
- Kabul edilen tipler: image/jpeg, image/png, image/webp
- Max boyut: 5MB
- Dosya adı: UUID + orijinal extension
- Kayıt yeri: /uploads/{businessSlug}/ (Coolify volume)

### Public (Auth gerektirmez)
```
GET    /public/:slug    — Tüm menü verisi (tema + info + kategoriler + ürünler)
```
- Redis'te cache (5dk TTL)
- Tek endpoint'te tüm veri — frontend tek request ile çeker
- Response yapısı:
```json
{
  "business": { "name", "slug", "template" },
  "theme": { "primaryColor", "accentColor", ... },
  "info": { "tagline", "location", "hours", ... },
  "categories": [
    {
      "id", "nameTr", "nameEn", "banner", "layout",
      "items": [
        { "nameTr", "nameEn", "descriptionTr", "descriptionEn", "price", "image", "badges" }
      ]
    }
  ]
}
```

## Auth & Yetkilendirme

### Roller
- **ADMIN:** Tüm işletmelere erişim, kullanıcı yönetimi, işletme oluşturma/silme. Sadece sen (Vexloft).
- **OWNER:** Sadece kendi işletmesine erişim. Menü, tema, bilgi yönetimi.

### JWT Token Yapısı
- **Access token:** 15 dakika ömür, payload: {userId, role, businessSlug}
- **Refresh token:** 7 gün ömür, Redis'te saklanır, logout'ta silinir

### Middleware Zinciri
1. `authenticate` — JWT verify, user'ı request'e ekle
2. `authorize(roles)` — Role kontrolü (admin only endpoint'ler)
3. `checkOwnership` — Business endpoint'lerinde: admin her yere, owner sadece kendi slug'ına

## Dosya Yapısı

```
vexloftpanel/
├── src/
│   ├── app.ts                  # Fastify instance, plugin registration
│   ├── server.ts               # Start server, graceful shutdown
│   ├── routes/
│   │   ├── auth.ts             # Register, login, refresh, me, change-password
│   │   ├── businesses.ts       # CRUD
│   │   ├── themes.ts           # GET/PUT theme
│   │   ├── categories.ts       # CRUD + reorder
│   │   ├── menu-items.ts       # CRUD + reorder
│   │   ├── business-info.ts    # GET/PUT info
│   │   ├── upload.ts           # File upload
│   │   └── public.ts           # Public menu endpoint
│   ├── middleware/
│   │   ├── auth.ts             # JWT verify middleware
│   │   └── rbac.ts             # Role + ownership check
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── redis.ts            # Redis client
│   │   ├── jwt.ts              # Token generate/verify helpers
│   │   ├── upload.ts           # File handling utilities
│   │   └── cache.ts            # Redis cache helpers (get/set/invalidate)
│   ├── schemas/
│   │   ├── auth.ts             # Zod schemas for auth endpoints
│   │   ├── business.ts         # Zod schemas for business endpoints
│   │   ├── category.ts         # Zod schemas
│   │   ├── menu-item.ts        # Zod schemas
│   │   └── theme.ts            # Zod schemas
│   └── types/
│       └── index.ts            # Shared TypeScript types
├── prisma/
│   ├── schema.prisma           # Veritabanı şeması
│   ├── migrations/             # Migration dosyaları
│   └── seed.ts                 # Admin user + örnek işletme data
├── uploads/                    # Yüklenen dosyalar (volume mount)
├── Dockerfile
├── docker-compose.yml          # API + PG + Redis
├── .env.example
├── package.json
└── tsconfig.json
```

## Docker & Deploy

### Dockerfile
- Node.js 20 Alpine
- Multi-stage build (build → production)
- Prisma generate + migrate deploy
- uploads/ klasörü volume olarak mount

### docker-compose.yml (development)
```yaml
services:
  api:
    build: .
    ports: ["3001:3001"]
    env_file: .env
    volumes:
      - ./uploads:/app/uploads
    depends_on: [postgres, redis]
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vexloftpanel
      POSTGRES_USER: vexloft
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
volumes:
  pgdata:
  redisdata:
```

### Coolify Deploy
- Git push → Coolify auto-deploy (Dockerfile build)
- PostgreSQL servisi ayrı oluştur
- Redis servisi ayrı oluştur
- Environment variables Coolify'da set et
- uploads/ volume Coolify'da persistent volume olarak ekle

## Seed Data

Seed script (prisma/seed.ts) şunları oluşturur:
- 1 admin user (sen — email: admin@vexloft.com)
- 3 örnek işletme (The Cozy Bean, Maison Élégante, The Black Sheep)
- Her işletme için tema, kategoriler, ürünler (mevcut qr-menu statik verisinden)
- Bu sayede API hazır olduğunda mevcut menüler hemen çalışır

## Cache Stratejisi

- `GET /public/:slug` → Redis cache, 5dk TTL
- Menü/tema/info güncelleme → ilgili business cache'i invalidate
- Cache key pattern: `public:menu:{slug}`

## Environment Variables

```
DATABASE_URL=postgresql://vexloft:password@postgres:5432/vexloftpanel
REDIS_URL=redis://redis:6379
JWT_SECRET=random-secret-key
JWT_REFRESH_SECRET=another-random-secret
PORT=3001
UPLOAD_DIR=/app/uploads
UPLOAD_MAX_SIZE=5242880
CORS_ORIGIN=https://panel.vexloft.com
```
