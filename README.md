# Allo Health - Inventory & Reservation System

A high-performance, concurrency-safe inventory reservation system built with Next.js, Prisma, and Tailwind CSS.

## Features

- **Race-Condition-Free Reservations**: Utilizes atomic database updates to guarantee exact stock counting.
- **Dual Expiry Mechanism**:
  1. **Lazy Cleanup on Read**: The `/api/products` endpoint dynamically clears expired reservations before serving data, ensuring users see 100% accurate, up-to-the-millisecond stock without relying exclusively on a delayed background job.
  2. **Cron Job Endpoint**: A `/api/cron/release-expired` endpoint designed to be hit by Vercel Cron or a background worker to ensure eventual consistency across the entire database.
- **Idempotent APIs**: Reservation requests enforce idempotency via the `Idempotency-Key` header, preventing duplicate deductions upon network retries.
- **Modern UI/UX**: Built with shadcn/ui and Tailwind v4, featuring a dynamic countdown timer during checkout.

## How to Run Locally

### Prerequisites
- Node.js (v18+)

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   This project uses SQLite for local development (which can be seamlessly swapped to PostgreSQL for production by changing the Prisma provider in `schema.prisma`).

   Generate the Prisma client and push the schema:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Seed the Database**
   Populate the database with initial products, warehouses, and stock levels:
   ```bash
   npx tsx prisma/seed.ts
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000` to interact with the application.

## Concurrency & Idempotency Implementation

### Correctness Under Concurrency
To ensure exactly one request succeeds when two requests simultaneously hit the last unit of a SKU, we utilize an **atomic UPDATE query** directly on the database within a Prisma transaction:

```sql
UPDATE "Stock"
SET "reservedUnits" = "reservedUnits" + quantity
WHERE "productId" = $1 AND "warehouseId" = $2 AND ("totalUnits" - "reservedUnits") >= quantity
```
If the database row cannot satisfy the `totalUnits - reservedUnits >= quantity` condition, 0 rows are updated, and our backend safely catches this and returns a `409 Conflict`. This completely eliminates race conditions at the database engine level without requiring distributed locks (like Redis).

### Idempotency
Clients send an `Idempotency-Key` header (e.g., a UUID) when initiating a reservation. This key is stored in the `Reservation` table with a unique constraint. If a client retries a request, the database securely returns the existing reservation state instead of duplicating the side effect.

## Trade-offs and Future Improvements
- **SQLite vs PostgreSQL**: SQLite was used to make local evaluation instant and frictionless. For production, simply change the `provider = "sqlite"` to `"postgresql"` in `schema.prisma` and provide a hosted database URL.
- **Cart Concept**: Currently, a reservation creates a direct checkout flow for a single item. In a full production app, multiple reservations could be grouped under a unified "Cart" ID.
- **Real-time Updates**: With more time, adding WebSockets or Server-Sent Events (SSE) to push stock updates to the frontend in real-time would prevent users from seeing "1 left" when another user has already reserved it.
