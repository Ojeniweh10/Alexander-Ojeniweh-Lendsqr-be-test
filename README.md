# Demo-Credit Wallet Service

A robust and scalable wallet service built with Node.js, TypeScript, MySQL, and KnexJS for the Lendsqr backend engineering assessment.

# Table of Contents

Overview
Features
Tech Stack
Architecture
Database Design
API Documentation
Setup Instructions
Running Tests
Deployment
Design Decisions

## Overview
This is a production-ready wallet service that enables users to:

Create accounts with KYC verification via Lendsqr Adjutor API
Fund their wallets
Transfer money to other users
Withdraw funds
View transaction history

The service implements blacklist checking during registration to prevent onboarding of users in the Lendsqr Adjutor Karma blacklist.

# Features

User Registration with Adjutor KYC verification and blacklist checking
Authentication using JWT tokens

# Wallet Operations:

Fund wallet
Transfer to other users
Withdraw funds
Check balance

Transaction History with pagination
Concurrency Control using database transactions and row-level locking
Input Validation using Joi
Error Handling with custom error classes
Logging using Winston and Slack
Rate Limiting to prevent abuse
Security with Helmet middleware

## Tech Stack

Runtime: Node.js (LTS v18+)
Language: TypeScript
Framework: Express.js
Database: MySQL
ORM: KnexJS
Authentication: JWT (jsonwebtoken)
Validation: Joi
Testing: Jest + ts-jest
Logging: Winston, Slack
Security: Helmet, bcryptjs, CORS

# Architecture
The application follows a layered architecture with clear separation of concerns:

Controllers(HTTP Request/Response) -> Services(Business Logic) -> Repositories(Data Access Layer) -> Database(MYSQL)

# Design Patterns Used

Repository Pattern: Separates data access logic from business logic
Service Layer Pattern: Encapsulates business logic
Dependency Injection: Services depend on abstractions (repositories)
Factory Pattern: Used for creating transaction references
Middleware Pattern: Express middleware for authentication, validation, and error handling

# Database Design  

## ER Diagram
check demo-credit-db-design_1.png for actual image

## Database Tables

## USERS Table
Stores user account information and KYC data.

## Key Design Decisions:

email, phone_number, and account_number are UNIQUE.
is_blacklisted caches Adjutor response to avoid repeated API calls.
adjutor_customer_id stores the external ID for reference.
Indexes on frequently queried columns (email, phone, account_number).

## WALLETS Table
One wallet per user for managing balances.

## Key Design Decisions:

One-to-one relationship with users.
balance uses DECIMAL(15,2) to avoid floating-point precision issues.
Separate table allows for easy locking during transactions.
Currency field for future multi-currency support.

## TRANSACTIONS Table
Immutable audit log of all wallet operations.

## Key Design Decisions:

reference is UNIQUE for idempotency.
balance_before and balance_after create a complete audit trail.
related_wallet_id links transfer transactions.
metadata JSON field for extensibility.
Composite indexes on (wallet_id, created_at) for performance.

# API Documentation

## Base URL

http://localhost:3000/api

## Authentication

Protected endpoints require a Bearer token in the Authorization header:
Authorization: Bearer <jwt_token>

# Endpoints:

1. #  Register User
   POST /auth/register
   Content-Type: application/json

{
"email": "user@example.com",
"phone_number": "08012345678",
"first_name": "John",
"last_name": "Doe",
"password": "securePassword123",
"bvn": "22222222222",
"bvn_phone_number": "08012345678",
"dob": "1990-01-15",
"address": "123 Main Street, Lagos",
"city": "Lagos",
"state": "Lagos",
"account_number": "0123456789",
"bank_code": "058",
"photo_url": "https://example.com/photo.jpg",
"documents": [
{
"url": "https://example.com/id.jpg",
"type_id": 1,
"sub_type_id": 9
}
]
}

### Success Response (201):

json{
"success": true,
"message": "Registration successful",
"data": {
"user": {
"id": 1,
"email": "user@example.com",
"first_name": "John",
"last_name": "Doe",
"account_number": "0123456789"
},
"wallet": {
"id": 1,
"user_id": 1,
"balance": 0.00,
"currency": "NGN"
},
"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
}

### Error Response (403) - Blacklisted:
json{
"success": false,
"message": "Registration denied. Please contact support for more information."
}

2. # Login

POST /auth/login
Content-Type: application/json

{
"email": "user@example.com",
"password": "securePassword123"
}

### Success Response (200):
json{
"success": true,
"message": "Login successful",
"data": {
"user": { ... },
"wallet": { ... },
"token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
}

3. # Get Balance

GET /wallet/balance
Authorization: Bearer <token>

### Success Response (200):
json{
"success": true,
"message": "Balance retrieved successfully",
"data": {
"balance": 5000.50,
"currency": "NGN"
}
}

4. # Fund Wallet

POST /wallet/fund
Authorization: Bearer <token>
Content-Type: application/json

{
"amount": 10000
}

### Success Response (201):
json{
"success": true,
"message": "Wallet funded successfully",
"data": {
"transaction": {
"reference": "TXN-1699123456789-A1B2C3",
"amount": 10000,
"balance_before": 5000.50,
"balance_after": 15000.50,
"description": "Wallet funding",
"status": "success"
},
"newBalance": 15000.50
}
}

5. # Transfer Funds

POST /wallet/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
"recipient_account_number": "0987654321",
"amount": 2000,
"description": "Payment for services"
}

Success Response (201):
json{
"success": true,
"message": "Transfer successful",
"data": {
"transaction": {
"reference": "TXN-1699123456789-D4E5F6",
"amount": 2000,
"balance_before": 15000.50,
"balance_after": 13000.50,
"description": "Transfer to Jane Smith",
"status": "success"
},
"newBalance": 13000.50,
"recipient": {
"name": "Jane Smith",
"account_number": "0987654321"
}
}
}

6. # Withdraw Funds

POST /wallet/withdraw
Authorization: Bearer <token>
Content-Type: application/json

{
"amount": 5000,
"description": "Withdrawal to bank"
}

### Success Response (201):
json{
"success": true,
"message": "Withdrawal successful",
"data": {
"transaction": { ... },
"newBalance": 8000.50
}
}

7. # Get Transaction History

GET /wallet/transactions?page=1&limit=20
Authorization: Bearer <token>

### Success Response (200):
json{
"success": true,
"message": "Transactions retrieved successfully",
"data": [
{
"id": 1,
"reference": "TXN-1699123456789-A1B2C3",
"transaction_type": "credit",
"amount": 10000,
"balance_before": 0,
"balance_after": 10000,
"description": "Wallet funding",
"category": "funding",
"status": "success",
"created_at": "2024-11-05T10:30:00.000Z"
}
],
"pagination": {
"page": 1,
"limit": 20,
"total": 15,
"totalPages": 1
}
}

# Setup Instructions:
## Prerequisites

Node.js (v18 or higher)
MySQL (v8.0 or higher)
npm or yarn

1. Clone the Repository:

git clone <repository-url>
cd demo-credit-wallet-service

2. Install Dependencies:

npm install

3. Environment Configuration:

Create a .env file in the root directory:
cp .env.example .env

Update the .env file with your configuration:

NODE_ENV=development
PORT=3000

# Database

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=lendsqr_wallet

# JWT

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRY=24h

# Adjutor API

ADJUTOR_API_URL=https://adjutor.lendsqr.com/v2
ADJUTOR_API_KEY=your-adjutor-api-key

LOG_LEVEL=info

4. Database Setup

Create the MySQL database:

CREATE DATABASE demo-credit_wallet;

Run migrations:

npm run migrate:latest

5. Start the Server

Development mode with auto-reload:

npm run dev

Production mode:

npm run build
npm start

The server will start on http://localhost:3000

Running Tests:

# Run all tests

npm test

# Run tests in watch mode

npm run test:watch

# Run tests with coverage

npm test -- --coverage
Test Structure
tests/
├── unit/
│ ├── services/
│ │ └── wallet.service.test.ts

Sample Test Cases Covered

Get balance successfully
Get balance - wallet not found
Fund wallet successfully
Fund wallet - inactive wallet error
Transfer - insufficient balance
Transfer - prevent self-transfer
Transfer - recipient not found
Withdraw successfully
Withdraw - insufficient balance

# Sample Deployment if you wish to go live
Deploy to Heroku

Create a Heroku app:

heroku create demo-credit-be-test

Add MySQL addon:

heroku addons:create jawsdb:kitefin

Set environment variables:

heroku config:set JWT_SECRET=your-secret
heroku config:set ADJUTOR_API_KEY=your-key

Deploy:

git push heroku main

Run migrations:

heroku run npm run migrate:latest

Deploy to Railway/Render:

Similar process - set environment variables and connect to their MySQL service.

# My Design Decisions:

1. ## Why Repository Pattern?
   Decision: Implemented repository pattern for data access

### Reason why:

Testability: Easy to mock repositories in unit tests
Maintainability: Centralized data access logic
Flexibility: Easy to swap database implementations
Single Responsibility: Repositories only handle data access

2. ## Why Database Transactions?
   Decision: Used database transactions for all financial operations

### Reason why:

ACID Compliance: Ensures data consistency
Atomicity: All-or-nothing operations
Concurrency Control: Row-level locking prevents race conditions
Data Integrity: Prevents partial updates

Example - Transfer operation uses transaction:

const trx = await db.transaction();
try {
// Lock sender wallet
const senderBalance = await walletRepo.getBalanceWithLock(senderId, trx);

// Lock recipient wallet
const recipientBalance = await walletRepo.getBalanceWithLock(recipientId, trx);

// Perform updates...
await trx.commit();
} catch (error) {
await trx.rollback();
throw error;
}

3. ## Why Separate Transactions Table?
   Decision: Created separate table for transactions instead of storing in JSON

### Reason why:

Audit Trail: Immutable record of all operations
Query Performance: Can index and query efficiently
Compliance: Required for financial applications
Debugging: Easy to trace transaction flow
Balance Verification: balance_before and balance_after provide audit trail

4. ## Why DECIMAL for Money?
   Decision: Used DECIMAL(15,2) instead of FLOAT/INTEGER

### Reason why:

Precision: Avoids floating-point arithmetic errors
Standard: Industry standard for financial applications
Range: Supports up to 999,999,999,999.99
Accuracy: Exact decimal representation

5. ## Why Adjutor API Integration?
   Decision: Integrated Adjutor API during registration

### Reason why:

Requirement Compliance: Assessment requires blacklist checking
Proactive Prevention: Block blacklisted users before onboarding
Reduced Fraud: Verify user identity upfront
Cached Result: Store blacklist status to avoid repeated API calls

6. # Why JWT for Authentication?
   Decision: Used JWT tokens instead of sessions

## Reason why:

Stateless: No server-side session storage needed
Scalable: Easy to scale horizontally
Mobile-Friendly: Works well with mobile apps
Standard: Industry-standard authentication method

7. # Why Joi for Validation?
   Decision: Used Joi for request validation

## Reason why:

Declarative: Clear, readable validation schemas
Comprehensive: Supports complex validation rules
Error Messages: Provides detailed error messages
TypeScript Support: Good TypeScript integration

8. # Why Winston and slack for Logging?
   Decision: Used Winston and slack instead of console.log

## Reason why:

Production-Ready: Supports multiple transports
Log Levels: Different levels (info, warn, error)
Structured Logging: JSON format for easy parsing
Easy Notification: easily notify on call devs to issues directly on their phones

9. # Why Rate Limiting?
   Decision: Implemented rate limiting on API routes

## Reason why:

DDoS Protection: Prevents abuse
Fair Usage: Ensures fair resource allocation
Cost Control: Reduce infrastructure costs
Security: Slows down brute-force attacks

10. # Error Handling Strategy
    Decision: Custom AppError class with proper HTTP status codes

## Reason why:

Consistency: Uniform error responses
Client-Friendly: Clear error messages
Debugging: Maintains error stack traces
Operational vs Programming Errors: Distinguishes between types

## Key Metrics & Performance

Transaction Safety: ACID-compliant with database transactions
Concurrency: Row-level locking prevents race conditions
Idempotency: Transaction references prevent duplicate processing
Response Time: < 200ms for most operations (excluding external API calls)
Test Coverage: > 80% code coverage target

## Security Considerations

Password Security: Bcrypt hashing with salt
JWT: Secure token-based authentication
Input Validation: Joi schemas prevent injection attacks
Rate Limiting: Prevents
