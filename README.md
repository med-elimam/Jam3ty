# Jam3ty - Complete Student Web App & Admin Dashboard

A comprehensive production-ready platform for university students featuring a modern Student Web App and a full-featured Admin Dashboard, built with React, Vite, TypeScript, and Express.

## 📋 Project Overview

Jam3ty is a monorepo containing:

1. **Student Web App** (`/home/ubuntu/student-web`) - React + Vite + TypeScript
   - 17+ screens for student features
   - Full Arabic/French i18n support with RTL
   - Authentication, courses, timetable, assignments, exams, community, clubs, opportunities, events, files, announcements, AI assistant, subscriptions, and more

2. **Admin Dashboard** (`/home/ubuntu/admin-web`) - React + Vite + TypeScript
   - 18 management modules
   - Full Arabic/French i18n support with RTL
   - University management, user management, academic structure, file moderation, payment processing, agent management, and more

3. **API Backend** (`artifacts/api-server`) - Express + TypeScript
   - RESTful API with comprehensive routes
   - Database integration (PostgreSQL)
   - Authentication & authorization
   - Static file serving for both web apps

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- pnpm 10+
- PostgreSQL database

### Installation

```bash
cd /home/ubuntu/Jam3ty
pnpm install
```

### Development

**Start all services:**
```bash
# Terminal 1: API Server
cd artifacts/api-server
npm run dev

# Terminal 2: Student Web App
cd /home/ubuntu/student-web
npm run dev

# Terminal 3: Admin Dashboard
cd /home/ubuntu/admin-web
npm run dev
```

**Access:**
- Student Web: http://localhost:5173
- Admin Dashboard: http://localhost:5174
- API: http://localhost:3000/api

### Production Build

```bash
cd /home/ubuntu/Jam3ty
pnpm run build:all
```

This builds:
- API server → `artifacts/api-server/dist/index.mjs`
- Student web → `artifacts/api-server/public/student`
- Admin dashboard → `artifacts/api-server/public/admin`

### Production Start

```bash
cd /home/ubuntu/Jam3ty
pnpm run start:prod
```

Access:
- Student Web: http://localhost:3000/
- Admin Dashboard: http://localhost:3000/admin
- API: http://localhost:3000/api

## 📁 Project Structure

```
Jam3ty/
├── artifacts/
│   ├── api-server/              # Express API backend
│   │   ├── src/
│   │   │   ├── routes/          # API endpoints
│   │   │   ├── models/          # Database models
│   │   │   ├── middleware/      # Auth, logging, etc.
│   │   │   ├── app.ts           # Express app setup
│   │   │   └── index.ts         # Server entry point
│   │   ├── dist/                # Built API (production)
│   │   ├── public/              # Static files
│   │   │   ├── student/         # Student web app build
│   │   │   └── admin/           # Admin dashboard build
│   │   └── package.json
│   ├── mobile/                  # Expo mobile app
│   └── mockup-sandbox/
├── student-web/                 # Student web app
│   ├── client/
│   │   ├── src/
│   │   │   ├── pages/           # Page components
│   │   │   ├── components/      # Reusable components
│   │   │   ├── contexts/        # React contexts (I18n, Theme)
│   │   │   ├── hooks/           # Custom hooks (useApi)
│   │   │   ├── i18n/            # Translations
│   │   │   ├── App.tsx          # Routes
│   │   │   └── main.tsx         # Entry point
│   │   ├── index.html
│   │   └── public/
│   ├── server/                  # Express server (static serving)
│   ├── package.json
│   └── vite.config.ts
├── admin-web/                   # Admin dashboard
│   ├── client/
│   │   ├── src/
│   │   │   ├── pages/           # Admin pages
│   │   │   ├── components/      # Admin components (Layout, etc.)
│   │   │   ├── contexts/        # Admin i18n context
│   │   │   ├── hooks/           # Admin API hook
│   │   │   ├── i18n/            # Admin translations
│   │   │   ├── App.tsx          # Admin routes
│   │   │   └── main.tsx
│   │   └── public/
│   ├── server/
│   ├── package.json
│   └── vite.config.ts
├── lib/                         # Shared libraries
├── scripts/                     # Database scripts
├── package.json                 # Root monorepo package.json
├── DEPLOYMENT.md                # Deployment guide
└── README.md                    # This file
```

## 🎯 Key Features

### Student Web App
- **Authentication**: Login/Register with JWT
- **Dashboard**: Overview of courses, assignments, exams
- **Courses**: Browse and manage enrolled courses
- **Timetable**: View class schedule
- **Assignments**: Track and submit assignments
- **Exams**: View exam dates and locations
- **Community**: Connect with other students
- **Clubs & Events**: Discover and join clubs/events
- **Opportunities**: Browse internships and scholarships
- **Files**: Upload and download course materials
- **Announcements**: Stay updated with university news
- **AI Assistant**: Get help with studies
- **Subscriptions**: Manage premium features
- **Notifications**: Real-time updates
- **Multilingual**: Full Arabic/French support with RTL

### Admin Dashboard
- **Dashboard**: Overview statistics
- **Universities**: Manage university information
- **Academic Structure**: Manage faculties, departments, levels
- **Users**: Manage students, professors, admins
- **Courses**: Create and manage courses
- **Files**: Moderate uploaded files
- **Announcements**: Create and publish announcements
- **Timetable**: Manage class schedules
- **Assignments**: Create and manage assignments
- **Exams**: Schedule and manage exams
- **Community**: Moderate posts and reports
- **Opportunities**: Post internships and scholarships
- **Events**: Create and manage events
- **Clubs**: Manage student clubs
- **Subscriptions**: Manage subscription plans
- **Payments**: Review payment proofs
- **Agents**: Manage sales agents
- **Settings**: Configure application
- **Multilingual**: Full Arabic/French support with RTL

## 🔧 Build & Deployment Scripts

### Root Monorepo Commands

```bash
# Build everything
pnpm run build:all

# Build individual components
pnpm run build:api
pnpm run build:student-web
pnpm run build:admin-web
pnpm run build:web          # Both web apps

# Start production
pnpm run start:prod

# Database commands
pnpm run db:migrate
pnpm run db:seed
pnpm run db:seed:dev

# Type checking
pnpm run typecheck
```

## 🌐 URL Routing

| URL | Purpose |
|-----|---------|
| `/` | Student Web App |
| `/auth/login` | Student login |
| `/auth/register` | Student registration |
| `/courses` | Student courses |
| `/timetable` | Student timetable |
| `/admin` | Admin Dashboard |
| `/admin/login` | Admin login |
| `/admin/dashboard` | Admin overview |
| `/admin/users` | Manage users |
| `/admin/universities` | Manage universities |
| `/api/healthz` | API health check |
| `/api/*` | All API endpoints |

## 🔐 Environment Variables

### API Server (`.env`)
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

### Web Apps
```
VITE_API_BASE_URL=/api
```

## 📦 Dependencies

### Student Web App
- React 19
- Vite 7
- TypeScript 5.6
- Tailwind CSS 4
- shadcn/ui components
- Wouter (routing)
- Axios (HTTP client)
- Sonner (toasts)
- Framer Motion (animations)

### Admin Dashboard
- React 19
- Vite 7
- TypeScript 5.6
- Tailwind CSS 4
- shadcn/ui components
- Wouter (routing)
- Axios (HTTP client)
- React Query (data fetching)
- Recharts (charts)

### API Server
- Express 4
- TypeScript 5.9
- PostgreSQL
- Pino (logging)
- CORS
- JWT authentication

## 🧪 Testing URLs

After starting the API server:

```bash
# Health check
curl http://localhost:3000/api/healthz

# Student web
curl http://localhost:3000/

# Admin dashboard
curl http://localhost:3000/admin

# Admin dashboard route
curl http://localhost:3000/admin/dashboard
```

## 📝 API Documentation

See `artifacts/api-server/README.md` for complete API documentation.

## 🌍 Internationalization

Both apps support:
- **Arabic (ar)** - RTL, default
- **French (fr)** - LTR

Language can be switched in the UI. Preference is saved in localStorage.

### Student Web i18n
- File: `client/src/i18n/translations.ts`
- Context: `client/src/contexts/I18nContext.tsx`
- Hook: `useI18n()`

### Admin Dashboard i18n
- File: `client/src/i18n/admin-translations.ts`
- Context: `client/src/contexts/AdminI18nContext.tsx`
- Hook: `useAdminI18n()`

## 🎨 Design System

Both apps use:
- **shadcn/ui** components for consistency
- **Tailwind CSS 4** for styling
- **OKLCH color format** for theme colors
- **Responsive design** (mobile-first)
- **Dark/Light theme** support

## 🚀 Deployment

### Railway
1. Connect GitHub repository
2. Set environment variables
3. Build command: `pnpm run build:all`
4. Start command: `cd artifacts/api-server && NODE_ENV=production node dist/index.mjs`

### Docker
```bash
docker build -t jamiaati .
docker run -p 3000:3000 -e DATABASE_URL=... jamiaati
```

See `DEPLOYMENT.md` for detailed deployment instructions.

## 🐛 Troubleshooting

### SPA Routes Return 404
Ensure API server has SPA fallback configured. Check `artifacts/api-server/src/app.ts`.

### Static Files Not Found
Verify builds are copied to correct locations:
```bash
ls -la artifacts/api-server/public/student/
ls -la artifacts/api-server/public/admin/
```

### Port Already in Use
```bash
lsof -ti:3000 | xargs kill -9
```

### Database Connection Error
Check `DATABASE_URL` environment variable and ensure PostgreSQL is running.

## 📞 Support

For issues or questions:
1. Check `DEPLOYMENT.md` for deployment-specific help
2. Review API docs in `artifacts/api-server/README.md`
3. Check component documentation in `client/src/components/`

## 📄 License

MIT

## 🎓 About Jam3ty

Jam3ty is a comprehensive platform designed to enhance the student experience by providing:
- Easy access to academic resources
- Community engagement
- Career opportunities
- Administrative efficiency
- Multilingual support
- Modern, responsive design

Built with production-ready best practices and scalable architecture.
