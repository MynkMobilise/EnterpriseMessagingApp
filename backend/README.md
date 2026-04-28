# WhatsApp Business API Platform - Backend

Complete Node.js + Express + MySQL backend for WhatsApp Business API Platform.

## Technology Stack

- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js 4.18.2
- **Database**: MySQL 8.0+ (Sequelize ORM)
- **Message Queue**: Database-based polling worker
- **Rate Limiting**: In-memory (per server instance)
- **Authentication**: JWT
- **Testing**: Jest + Supertest

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database, JWT, Email configs
│   ├── models/           # Sequelize models
│   ├── services/         # Business logic
│   ├── controllers/     # Request handlers
│   ├── routes/           # API routes
│   ├── middleware/       # Auth, validation, error handling
│   ├── utils/            # Helper functions, cache, logger
│   ├── jobs/             # Queue jobs
│   └── validations/      # Joi validation schemas
├── tests/                # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── security/         # Security tests
│   └── e2e/              # End-to-end tests
├── server.js             # Application entry point
└── package.json
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env`
   - Update MySQL credentials
   - Set JWT secrets

3. **Start development server**
   ```bash
   npm run dev
   ```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run all tests with coverage
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests only
- `npm run test:security` - Run security tests only
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh access token
- `POST /auth/verify-email` - Verify email address
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password
- `POST /auth/logout` - Logout user
- `GET /auth/me` - Get current user (protected)

## Database

MySQL server configuration:
- Host: `172.16.17.68`
- Database: `whatsapp_business_platform`
- User: `sdx_ind_uat_dbadmin`

## Testing

Tests are written using Jest and follow TDD approach. Each functionality has:
- Unit tests (>80% coverage)
- Security tests
- Integration tests (where applicable)

Run tests:
```bash
npm test
```

## Development Guidelines

1. Write tests immediately after completing functionality
2. Maintain >80% test coverage
3. Follow bottom-up development approach
4. Use Redis for caching and queue
5. Implement proper error handling
6. Follow security best practices

