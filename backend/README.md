# Safalya Backend

Backend API for the E-Farming Contract Management application built with Node.js, Express, and Prisma.

## Features

- ✅ User Authentication (JWT-based)
- ✅ User Profile Management
- ✅ Contract Listings & Management
- ✅ Transaction Tracking
- ✅ File Upload Support
- ✅ OTP Verification
- ✅ Password Reset

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **Prisma** - ORM and database toolkit
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Multer** - File upload handling

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/safalya?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_ACCESS_EXPIRY="24h"
JWT_REFRESH_EXPIRY="30d"
PORT=3000
NODE_ENV=development
```

### 3. Setup Database

```bash
# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# (Optional) Open Prisma Studio to view data
npm run prisma:studio
```

### 4. Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/logout` - Logout user

### User/Profile
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update profile
- `PUT /api/user/profile-picture` - Upload profile picture
- `PUT /api/user/location` - Update location
- `PUT /api/user/bank-details` - Update bank details
- `DELETE /api/user/account` - Delete account

### Contracts
- `GET /api/contracts` - Get all contracts
- `GET /api/contracts/:id` - Get contract details
- `POST /api/contracts/listing` - Create listing (farmer)
- `GET /api/contracts/listings` - Get available listings
- `POST /api/contracts/:id/request` - Request contract (buyer)
- `PUT /api/contracts/:id/accept` - Accept contract
- `PUT /api/contracts/:id/reject` - Reject contract
- `PUT /api/contracts/:id/complete` - Mark complete
- `PUT /api/contracts/:id/cancel` - Cancel contract

### Transactions
- `GET /api/transactions` - Get transactions
- `GET /api/transactions/summary` - Monthly summary
- `POST /api/transactions` - Add manual transaction
- `GET /api/transactions/:id` - Get transaction detail

## API Response Format

All API responses follow a standard format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "error": null,
  "timestamp": "2025-11-11T10:30:00Z"
}
```

## Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## File Uploads

- Supported formats: JPG, PNG, WEBP
- Max file size: 5MB
- Max images per listing: 5

## Database Schema

The database includes the following main tables:
- `users` - User accounts
- `user_locations` - User location data
- `bank_details` - Bank account information
- `contract_listings` - Crop listings by farmers
- `contracts` - Contract agreements
- `transactions` - Financial transactions

## Development

### Project Structure

```
backend/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── config/             # Configuration files
│   ├── controllers/       # Route controllers
│   ├── middleware/         # Express middleware
│   └── routes/             # API routes
├── uploads/                # Uploaded files
├── index.js                # Main server file
└── package.json
```

## Notes

- OTP functionality currently uses in-memory storage (for development). In production, integrate with SMS gateway (Twilio, AWS SNS, etc.)
- File uploads are stored locally. In production, use cloud storage (AWS S3, Cloudinary, etc.)
- Bank account numbers should be encrypted in production
- Password reset tokens should be stored in database with expiry in production

## License

ISC



