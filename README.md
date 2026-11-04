# Courier Logistics Platform API

A role-based courier and parcel delivery management API built with Express, TypeScript, PostgreSQL, and Prisma. It provides customer shipment booking and tracking, courier workflows, hub operations, configurable delivery pricing, and administrative tools.

> This repository contains the backend API. A separate frontend application can connect to it through the `/api/v1` endpoints.

## Contents

- [Features](#features)
- [Technology stack](#technology-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database and seed data](#database-and-seed-data)
- [Running the application](#running-the-application)
- [API reference](#api-reference)
- [Authentication and roles](#authentication-and-roles)
- [Postman collection](#postman-collection)
- [Scripts](#scripts)
- [Security notes](#security-notes)

## Features

- Customer, courier, and administrator roles with role-aware authorization.
- Email/password registration and login, Google sign-in, refresh tokens, and logout.
- Shipment creation, listing, cancellation, courier assignment, status updates, hub transfers, and public tracking by tracking code.
- Shipment status history, notifications, and courier availability management.
- Hub and delivery-zone management with configurable, zone-based pricing.
- bKash checkout initiation and payment callback handling.
- Administrator dashboard, user management, courier creation, and audit-log access.
- Request validation, centralized error handling, security headers, CORS, and API rate limiting.

## Technology stack

| Area | Technology |
| --- | --- |
| Runtime and language | Node.js, TypeScript |
| HTTP API | Express 5 |
| Database and ORM | PostgreSQL, Prisma 7 |
| Cache and token storage | Redis |
| Validation | Zod |
| Authentication | JSON Web Tokens, Google Auth Library, bcrypt |
| Integrations | bKash, Cloudinary, SMTP email |
| Formatting and linting | Biome |

## Architecture

The API is organized into feature modules. Each module separates routes, controllers, services, validation, and interfaces. Shared configuration, middleware, integrations, and utilities live under `src/app`.

The Prisma schema is split into domain files in `prisma/schema`, with migration history in `prisma/migrations`.

Project diagrams:

- [System architecture](./courier-logistics-platform-system-architecture.drawio)
- [SDA workflow](./courier-logistics-platform-sda-workflow.drawio)

Open the `.drawio` files with [diagrams.net](https://app.diagrams.net/) to view or edit them.

## Prerequisites

- Node.js and npm
- PostgreSQL
- Redis
- Credentials for any integrations you plan to use (SMTP, Google sign-in, Cloudinary, or bKash)

## Getting started

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/tashrifmiyaji/courier-logistics-platform.git
   cd courier-logistics-platform
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the project root and configure the variables listed in [Environment variables](#environment-variables).

4. Generate the Prisma client and apply the committed database migrations:

   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

   On startup, the server connects to PostgreSQL and Redis and runs the seed routine. Once started, the API is available at `http://localhost:5000` when `PORT=5000`.

6. Check the root endpoint:

   ```bash
   curl http://localhost:5000/
   ```

   A successful response confirms that the HTTP server is listening. Database and Redis connections must also succeed for the server to start.

## Environment variables

The application reads configuration from `.env` in the project root. Do not commit this file or put real credentials in documentation.

| Variable | Required for | Description / example |
| --- | --- | --- |
| `NODE_ENV` | Recommended | Runtime mode, for example `development` or `production`. |
| `PORT` | Recommended | HTTP port. Set `5000` to match the Postman collection default. |
| `DATABASE_URL` | Required | PostgreSQL connection URL, for example `postgresql://USER:PASSWORD@localhost:5432/courier_logistics?schema=public`. |
| `FRONTEND_URL` | Frontend integration | Allowed frontend origin for credentialed CORS requests. |
| `JWT_ACCESS_SECRET` | Required | Secret used to sign access tokens. |
| `JWT_REFRESH_SECRET` | Required | Separate secret used to sign refresh tokens. |
| `JWT_ACCESS_EXPIRES_IN` | Required | Access-token lifetime, for example `15m`. |
| `JWT_REFRESH_EXPIRES_IN` | Required | Refresh-token lifetime, for example `7d`. |
| `BCRYPT_SALT_ROUNDS` | Required | bcrypt work factor; `10` is a common development value. |
| `ADMIN_NAME` | Required | Name for the initial administrator created by the seed routine. |
| `ADMIN_EMAIL` | Required | Email for the initial administrator. |
| `ADMIN_PASSWORD` | Required | Password for the initial administrator. Use a strong, unique value. |
| `REDIS_USER` | Required | Redis username (often `default` for a managed Redis instance). |
| `REDIS_PASSWORD` | Required | Redis password. |
| `REDIS_HOST` | Required | Redis hostname, such as `localhost`. |
| `REDIS_PORT` | Required | Redis port, commonly `6379`. |
| `SMTP_USER` | Email features | SMTP account username. |
| `SMTP_PASSWORD` | Email features | SMTP account password or provider app password. |
| `EMAIL_SENDER` | Email features | Sender address displayed on outgoing messages. |
| `GOOGLE_CLIENT_ID` | Google sign-in | OAuth client ID used to verify Google ID tokens. |
| `CLOUDINARY_CLOUD_NAME` | Image uploads | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | Image uploads | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | Image uploads | Cloudinary API secret. |
| `BKASH_BASE_URL` | bKash payments | bKash API base URL for the selected environment. |
| `BKASH_USERNAME` | bKash payments | bKash API username. |
| `BKASH_PASSWORD` | bKash payments | bKash API password. |
| `BKASH_APP_KEY` | bKash payments | bKash application key. |
| `BKASH_APP_SECRET` | bKash payments | bKash application secret. |
| `BKASH_CALLBACK_URL` | bKash payments | Callback endpoint, for example `https://your-api.example.com/api/v1/payments/bkash/callback`. |

The database, Redis, JWT, bcrypt, and administrator settings are needed for the normal server startup and initial seed. Configure integration-specific values before enabling the related feature. bKash must be configured with the publicly reachable callback URL for the deployed API.

## Database and seed data

Prisma is configured through `prisma.config.ts`, which points to `prisma/schema` and uses `DATABASE_URL`.

- Generate the client after installing dependencies or changing the Prisma schema:

  ```bash
  npx prisma generate
  ```

- Apply committed migrations to the configured database:

  ```bash
  npx prisma migrate deploy
  ```

- Create and apply a new migration during local development:

  ```bash
  npx prisma migrate dev --name describe_your_change
  ```

The server runs `seedingScript` during startup. The seed routine creates an administrator from `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`, plus initial zones, hubs, pricing rules, and sample courier/customer/shipment records when they are not already present. Sample accounts use credentials embedded in the seed code. Because seeding runs on server startup, review and remove or change the development seed behavior before deploying to a shared or production environment.

## Running the application

Start the watcher for local development:

```bash
npm run dev
```

Compile the TypeScript application and generate the Prisma client:

```bash
npm run build
```

Run the compiled application:

```bash
npm start
```

## API reference

All versioned endpoints use the `/api/v1` prefix. The Postman collection in this repository includes example requests.

### Health and service root

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Basic API response. |

### Authentication

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/auth/register` | Public | Register a customer. |
| `POST` | `/api/v1/auth/login` | Public | Log in with email and password. |
| `POST` | `/api/v1/auth/google` | Public | Sign in with a Google ID token. |
| `POST` | `/api/v1/auth/refresh-token` | Public | Refresh tokens using the refresh-token cookie or request body. |
| `POST` | `/api/v1/auth/logout` | Authenticated | Log out and invalidate the refresh token. |

### Users and notifications

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/users/me` | Authenticated | Get the current user's profile. |
| `PATCH` | `/api/v1/users/me` | Authenticated | Update the current user's profile. |
| `GET` | `/api/v1/users/notifications` | Authenticated | List the current user's notifications. |
| `PATCH` | `/api/v1/users/notifications/:id/read` | Authenticated | Mark a notification as read. |
| `PATCH` | `/api/v1/users/courier/availability` | Courier | Update courier availability. |

### Shipments

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/shipments` | Customer | Create a shipment. |
| `GET` | `/api/v1/shipments` | Authenticated | List shipments. |
| `GET` | `/api/v1/shipments/track/:trackingCode` | Public | Track a shipment using its tracking code. |
| `GET` | `/api/v1/shipments/:id` | Authenticated | Get shipment details. |
| `PATCH` | `/api/v1/shipments/:id/cancel` | Customer | Cancel a shipment. |
| `POST` | `/api/v1/shipments/:id/assign` | Admin | Assign a courier. |
| `PATCH` | `/api/v1/shipments/:id/status` | Admin or courier | Update shipment status. |
| `POST` | `/api/v1/shipments/:id/transfers` | Admin | Record a transfer between hubs. |

### Operations: zones, hubs, and pricing

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `GET` | `/api/v1/operations/zones` | Public | List delivery zones. |
| `POST` | `/api/v1/operations/zones` | Admin | Create a zone. |
| `GET` | `/api/v1/operations/hubs` | Public | List hubs. |
| `POST` | `/api/v1/operations/hubs` | Admin | Create a hub. |
| `PATCH` | `/api/v1/operations/hubs/:id` | Admin | Update a hub. |
| `DELETE` | `/api/v1/operations/hubs/:id` | Admin | Delete a hub. |
| `POST` | `/api/v1/operations/pricing/calculate` | Public | Calculate a delivery price. |
| `PUT` | `/api/v1/operations/pricing` | Admin | Save a pricing rule. |

### Payments

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| `POST` | `/api/v1/payments/initiate` | Customer | Initiate a payment for a shipment. |
| `ALL` | `/api/v1/payments/bkash/callback` | Payment provider | Handle the bKash checkout callback; the route accepts any HTTP method. |
| `GET` | `/api/v1/payments/:id` | Authenticated | Get payment details. |

### Administration

All `/api/v1/admin` endpoints require the admin role.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/v1/admin/dashboard` | Get dashboard data. |
| `GET` | `/api/v1/admin/users` | List users. |
| `POST` | `/api/v1/admin/couriers` | Create a courier. |
| `PATCH` | `/api/v1/admin/users/:id/role` | Update a user's role. |
| `DELETE` | `/api/v1/admin/users/:id` | Delete a user. |
| `GET` | `/api/v1/admin/audit-logs` | List audit logs. |

## Authentication and roles

Authenticated routes accept an access token from either the `accessToken` cookie or an authorization header:

```http
Authorization: Bearer <access-token>
```

Successful login and Google sign-in responses include access and refresh tokens and set authentication cookies. For cross-origin browser clients, configure `FRONTEND_URL` and send requests with credentials enabled. Refresh and logout requests can use the `refreshToken` cookie or include `refreshToken` in the JSON body.

The supported roles are `CUSTOMER`, `COURIER`, and `ADMIN`. Endpoints marked “Authenticated” require a valid account; role-restricted endpoints additionally require the listed role.

Successful responses follow this general shape:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Request completed successfully",
  "data": {}
}
```

Some list endpoints also include a `meta` object. Error responses include `success: false`, a status code, a message, and an `errors` array where applicable.

## Postman collection

Import [`postman_collection.json`](./postman_collection.json) into Postman. The collection defines a `baseUrl` variable, defaulting to `http://localhost:5000/api/v1`, and variables for tokens and common resource IDs. Set `PORT=5000` or update `baseUrl` to match your local server.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run the API with `tsx` watch mode. |
| `npm run build` | Generate the Prisma client and compile TypeScript. |
| `npm start` | Run the compiled server from `dist`. |
| `npm run formate:check` | Check formatting in `src` with Biome. |
| `npm run formate:fix` | Format `src` with Biome. |
| `npm run lint:check` | Check `src` with Biome. |
| `npm run lint:fix` | Apply Biome lint fixes in `src`. |

The `npm test` script is currently a placeholder and exits with an error; automated tests are not configured yet.

## Security notes

- Keep `.env` and all production credentials out of version control.
- Use unique, strong JWT secrets and administrator credentials in each environment.
- Do not use the seed script's sample courier/customer accounts in production.
- Use HTTPS and a publicly reachable bKash callback URL for production payment flows.
- Restrict `FRONTEND_URL` to the trusted frontend origin.
