# Jam3ty Production Deployment Guide

## Overview

This document describes the complete production setup for Jam3ty, including the Student Web App, Admin Dashboard, and API backend.

## Project Structure

```
Jam3ty/
├── artifacts/
│   ├── api-server/          # Express API backend
│   │   ├── src/
│   │   ├── dist/            # Built API (production)
│   │   ├── public/          # Static files (student & admin apps)
│   │   │   ├── student/     # Student web app build
│   │   │   └── admin/       # Admin dashboard build
│   │   └── package.json
│   ├── mobile/              # Expo mobile app
│   └── mockup-sandbox/
├── student-web/             # Student web app (React + Vite)
├── admin-web/               # Admin dashboard (React + Vite)
├── lib/                      # Shared libraries
├── scripts/                  # Database scripts
└── package.json             # Root monorepo package.json
```

## Build Commands

### Build Everything
```bash
cd /home/ubuntu/Jam3ty
pnpm run build:all
```

This command:
1. Builds the API server
2. Builds the Student Web App
3. Builds the Admin Dashboard
4. Copies builds to `artifacts/api-server/public/`

### Build Individual Components

**API Server:**
```bash
pnpm run build:api
```

**Student Web App:**
```bash
pnpm run build:student-web
```

**Admin Dashboard:**
```bash
pnpm run build:admin-web
```

**Both Web Apps:**
```bash
pnpm run build:web
```

## Start Commands

### Production Start
```bash
cd /home/ubuntu/Jam3ty/artifacts/api-server
NODE_ENV=production node dist/index.mjs
```

Or via npm script:
```bash
cd /home/ubuntu/Jam3ty
pnpm run start:prod
```

### Development Start

**API Server:**
```bash
cd artifacts/api-server
npm run dev
```

**Student Web App:**
```bash
cd /home/ubuntu/student-web
npm run dev
```

**Admin Dashboard:**
```bash
cd /home/ubuntu/admin-web
npm run dev
```

## Database Commands

### Migrate
```bash
cd /home/ubuntu/Jam3ty
pnpm run db:migrate
```

### Seed (Production)
```bash
cd /home/ubuntu/Jam3ty
pnpm run db:seed
```

### Seed (Development)
```bash
cd /home/ubuntu/Jam3ty
pnpm run db:seed:dev
```

## Environment Variables

### API Server (`artifacts/api-server/.env`)
```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/jamiaati_db
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
CORS_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
SUPER_ADMIN_EMAIL=admin@university.edu
SUPER_ADMIN_PASSWORD=secure-password
```

### Student Web App (`/home/ubuntu/student-web/.env`)
```
VITE_API_BASE_URL=/api
```

### Admin Dashboard (`/home/ubuntu/admin-web/.env`)
```
VITE_API_BASE_URL=/api
```

## URL Routing

The API server is configured to serve:

- **`/api/*`** → API routes (Express backend)
- **`/admin/*`** → Admin Dashboard (React SPA)
- **`/`** → Student Web App (React SPA)

### Specific URLs

| URL | Purpose |
|-----|---------|
| `GET /api/healthz` | Health check |
| `GET /admin/login` | Admin login page |
| `GET /admin/dashboard` | Admin dashboard |
| `GET /` | Student web home |
| `GET /courses` | Student courses page |

## Health Check

```bash
curl http://localhost:3000/api/healthz
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-07-03T08:00:00.000Z"
}
```

## Production Deployment

### Railway Deployment

1. **Root Directory:** `/home/ubuntu/Jam3ty`

2. **Build Command:**
   ```bash
   pnpm run build:all
   ```

3. **Start Command:**
   ```bash
   cd artifacts/api-server && NODE_ENV=production node dist/index.mjs
   ```

4. **Environment Variables:**
   - Set all variables from the API Server section above
   - Railway will auto-inject `PORT` and `DATABASE_URL` if using Railway Postgres

### Docker Deployment

Create `Dockerfile` in project root:

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build:all

EXPOSE 3000

CMD ["node", "artifacts/api-server/dist/index.mjs"]
```

Build and run:
```bash
docker build -t jamiaati .
docker run -p 3000:3000 -e DATABASE_URL=... jamiaati
```

## File Locations

| Component | Path | Build Output |
|-----------|------|--------------|
| API Server | `artifacts/api-server` | `artifacts/api-server/dist/index.mjs` |
| Student Web | `/home/ubuntu/student-web` | `artifacts/api-server/public/student` |
| Admin Dashboard | `/home/ubuntu/admin-web` | `artifacts/api-server/public/admin` |
| Mobile App | `artifacts/mobile` | Expo build |

## Testing URLs Locally

After starting the API server on `http://localhost:3000`:

1. **Health Check:**
   ```bash
   curl http://localhost:3000/api/healthz
   ```

2. **Student Web App:**
   ```
   http://localhost:3000/
   ```

3. **Admin Dashboard:**
   ```
   http://localhost:3000/admin
   ```

4. **Student Login:**
   ```
   http://localhost:3000/auth/login
   ```

5. **Admin Login:**
   ```
   http://localhost:3000/admin/login
   ```

## Troubleshooting

### SPA Routes Return 404

Ensure the API server has SPA fallback configured in `app.ts`:
- `/admin/*` routes should fallback to `/admin/index.html`
- Non-API routes should fallback to `/index.html`

### Static Files Not Served

Verify that builds are copied to the correct locations:
```bash
ls -la artifacts/api-server/public/student/
ls -la artifacts/api-server/public/admin/
```

### API Routes Not Working

Check that API routes are registered BEFORE static file serving in `app.ts`:
```typescript
app.use("/api", router);  // Must be before static serving
app.use("/", express.static(...));
```

## Production Checklist

- [ ] All environment variables set
- [ ] Database migrated
- [ ] Database seeded with admin user
- [ ] API server built
- [ ] Student web app built
- [ ] Admin dashboard built
- [ ] Builds copied to `public/` directories
- [ ] Health check passes
- [ ] Student web loads at `/`
- [ ] Admin dashboard loads at `/admin`
- [ ] Admin login works
- [ ] Student login works
- [ ] API endpoints respond correctly

## Support

For issues or questions, refer to:
- API Documentation: `artifacts/api-server/README.md`
- Student Web: `/home/ubuntu/student-web/README.md`
- Admin Web: `/home/ubuntu/admin-web/README.md`
