# Docker Setup Guide

This guide explains how to run the Safalya backend using Docker.

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose)
- At least 2GB of free disk space

## Quick Start

### Production Mode

1. **Create a `.env` file** in the `backend` directory:

```env
POSTGRES_USER=safalya
POSTGRES_PASSWORD=your-secure-password-here
POSTGRES_DB=safalya
POSTGRES_PORT=5432

DATABASE_URL=postgresql://safalya:your-secure-password-here@postgres:5432/safalya?schema=public

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRY=24h
JWT_REFRESH_EXPIRY=30d

PORT=3000
NODE_ENV=production
CORS_ORIGIN=*
```

2. **Build and start the services**:

```bash
docker-compose up -d
```

3. **Check the logs**:

```bash
docker-compose logs -f backend
```

4. **Access the API**:

- API: http://localhost:3000
- Health Check: http://localhost:3000/health

### Development Mode

1. **Create a `.env` file** (same as above, but set `NODE_ENV=development`)

2. **Start services with development configuration**:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. **View logs** (with hot-reload):

```bash
docker-compose -f docker-compose.dev.yml logs -f backend
```

## Common Commands

### Stop services
```bash
# Production
docker-compose down

# Development
docker-compose -f docker-compose.dev.yml down
```

### Stop and remove volumes (⚠️ deletes database data)
```bash
docker-compose down -v
```

### Rebuild after code changes
```bash
# Production
docker-compose up -d --build

# Development
docker-compose -f docker-compose.dev.yml up -d --build
```

### Run database migrations manually
```bash
docker-compose exec backend npx prisma migrate deploy
```

### Open Prisma Studio
```bash
docker-compose exec backend npx prisma studio
```

### Access database directly
```bash
docker-compose exec postgres psql -U safalya -d safalya
```

## File Structure

- `Dockerfile` - Production Docker image
- `Dockerfile.dev` - Development Docker image (with nodemon)
- `docker-compose.yml` - Production orchestration
- `docker-compose.dev.yml` - Development orchestration
- `.dockerignore` - Files excluded from Docker build

## Volumes

- `postgres_data` - PostgreSQL database persistence
- `./uploads` - Uploaded files (mounted from host)

## Troubleshooting

### Port already in use
If port 3000 or 5432 is already in use, change them in your `.env` file:
```env
PORT=3001
POSTGRES_PORT=5433
```

### Database connection errors
1. Ensure PostgreSQL container is healthy:
   ```bash
   docker-compose ps
   ```
2. Check database logs:
   ```bash
   docker-compose logs postgres
   ```

### Permission issues with uploads
On Linux/Mac, ensure the uploads directory has correct permissions:
```bash
chmod -R 755 uploads
```

### Reset everything
```bash
docker-compose down -v
docker-compose up -d --build
```

## Production Deployment

For production deployment:

1. **Use strong passwords** in `.env`
2. **Set secure JWT_SECRET** (use a long random string)
3. **Configure CORS_ORIGIN** to your frontend domain
4. **Use environment-specific variables** (don't commit `.env`)
5. **Set up proper backup** for `postgres_data` volume
6. **Consider using managed database** (AWS RDS, etc.) instead of containerized PostgreSQL

## Notes

- Database migrations run automatically on container start
- Uploads directory is persisted on the host machine
- Development mode includes hot-reload with nodemon
- Production mode uses optimized Node.js image

