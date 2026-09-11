## Courier Logistics Platform API

Base URL: `/api/v1`. All protected endpoints accept `Authorization: Bearer <accessToken>`.

### Main endpoints

| Area       | Endpoints                                                                                                                                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth       | `POST /auth/register`, `/login`, `/google`, `/refresh-token`, `/logout`                                                                                                                                        |
| Users      | `GET/PATCH /users/me`, `GET /users/notifications`, `PATCH /users/notifications/:id/read`, `PATCH /users/courier/availability`                                                                                  |
| Shipments  | `POST/GET /shipments`, `GET /shipments/track/:trackingCode`, `GET /shipments/:id`, `PATCH /shipments/:id/cancel`, `POST /shipments/:id/assign`, `PATCH /shipments/:id/status`, `POST /shipments/:id/transfers` |
| Operations | `GET/POST /operations/zones`, `GET/POST /operations/hubs`, `PATCH/DELETE /operations/hubs/:id`, `POST /operations/pricing/calculate`, `PUT /operations/pricing`                                                |
| Payments   | `POST /payments/initiate`, `GET/POST /payments/bkash/callback`, `GET /payments/:id`                                                                                                                            |
| Admin      | `GET /admin/dashboard`, `/admin/users`, `/admin/audit-logs`; `POST /admin/couriers`; `PATCH /admin/users/:id/role`; `DELETE /admin/users/:id`                                                                  |

### Required environment variables

`DATABASE_URL`, `PORT`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `BCRYPT_SALT_ROUNDS`, `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, Redis credentials, SMTP credentials, Google client ID, Cloudinary credentials, and bKash sandbox/live credentials plus `BKASH_CALLBACK_URL`.

The bKash callback URL must point to `https://your-api/api/v1/payments/bkash/callback`; bKash will append `paymentID` and `status`, and this API executes and verifies the payment server-side.
