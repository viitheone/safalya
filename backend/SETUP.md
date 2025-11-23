# Quick Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

## Step-by-Step Setup

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create Environment File
Copy `.env.example` to `.env` and update with your database credentials:
```bash
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - A strong random secret for JWT tokens

### 3. Setup Database
```bash
# Generate Prisma Client
npm run prisma:generate

# Create and run migrations
npm run prisma:migrate

# (Optional) View database in Prisma Studio
npm run prisma:studio
```

### 4. Create Uploads Directory
```bash
mkdir uploads
```

### 5. Start the Server
```bash
# Development mode (auto-reload)
npm run dev

# Production mode
npm start
```

Server will start on `http://localhost:3000`

## Testing the API

### Health Check
```bash
curl http://localhost:3000/health
```

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Vivek Kumar",
    "email": "vivek@example.com",
    "phone": "9876543210",
    "password": "SecurePass@123",
    "role": "farmer"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "vivek@example.com",
    "password": "SecurePass@123"
  }'
```

Use the returned `token` in subsequent requests:
```bash
curl -X GET http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Database Migrations

After making changes to `prisma/schema.prisma`:
```bash
npm run prisma:migrate
```

This will:
1. Create a new migration file
2. Apply the migration to your database
3. Regenerate Prisma Client

## Important Notes

1. **OTP Functionality**: Currently uses in-memory storage. For production, integrate with SMS gateway (Twilio, AWS SNS, etc.)

2. **File Uploads**: Files are stored locally in `uploads/` directory. For production, use cloud storage (AWS S3, Cloudinary, etc.)

3. **Password Reset**: Tokens are generated but not stored in database. For production, implement token storage with expiry.

4. **Bank Details**: Account numbers are stored as-is. For production, implement proper encryption.

5. **CORS**: Currently allows all origins. Update `CORS_ORIGIN` in `.env` for production.

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Ensure database exists

### Prisma Client Not Generated
```bash
npm run prisma:generate
```

### Migration Issues
```bash
# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# Or create a fresh migration
npm run prisma:migrate
```


