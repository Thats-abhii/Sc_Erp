# SmartCovering ERP

Production-oriented ERP starter for a window blinds and mosquito mesh manufacturer. It includes the completed React single-page ERP UI, an Express API, PostgreSQL schema, role-based auth, optional webhook lead import, shared PostgreSQL app-state sync, and PDF invoice/quotation generation.

## Stack

- Frontend: React + Vite. The current UI is a single React app with responsive inline styling and the requested deep blue, white, and orange visual language.
- Backend: Node.js + Express.
- Database: PostgreSQL.
- Auth: JWT with `operator` and `manager` roles. Mutating API routes require `operator`.
- PDFs: Backend-generated invoice and quotation PDFs with `pdfkit`.

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create environment file:

   ```bash
   cp .env.example .env
   ```

3. Create a PostgreSQL database and load schema:

   ```bash
   createdb smartcovering_erp
   npm run db:schema
   ```

4. Add users. Password hashes are bcrypt hashes.

   ```sql
   insert into users (name, email, password_hash, role)
   values
     ('Operator User', 'operator@smartcovering.in', '<bcrypt-hash>', 'operator'),
     ('Manager User', 'manager@smartcovering.in', '<bcrypt-hash>', 'manager');
   ```

5. Start frontend and backend:

   ```bash
   npm run dev
   ```

Frontend: `http://localhost:5173`  
API: `http://localhost:4000/api/health`

## API Summary

- `POST /api/auth/login`
- `GET /api/leads`
- `POST /api/leads`
- `PATCH /api/leads/:id`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:id/invoice.pdf`
- `GET /api/orders/:id/quotation.pdf`
- `POST /api/webhooks/google-ads`
- `POST /api/webhooks/justdial`
- `GET /api/inventory`
- `GET /api/stock`
- `POST /api/stock`
- `GET /api/finished`
- `GET /api/followups`
- `GET /api/salesmen`
- `GET /api/workorders`
- `GET /api/payments`
- `GET /api/expenses`
- `GET /api/app-state`
- `PUT /api/app-state`

## Webhook Format

Webhooks are only for incoming leads from sources like Google Ads or JustDial. Payment collection is not integrated with a payment gateway, so the ERP does not need a payment webhook; paid/left amounts are saved by the normal app/database sync.

Set `WEBHOOK_SHARED_SECRET` in `.env`, then send it as `x-smartcovering-secret`.

```json
{
  "name": "Customer Name",
  "mobile": "9876543210",
  "email": "customer@example.com",
  "product": "Roller Blind",
  "location": "Bengaluru",
  "budget": 15000,
  "notes": "Imported from campaign"
}
```

Google Ads uses:

```bash
POST /api/webhooks/google-ads
```

JustDial uses:

```bash
POST /api/webhooks/justdial
```

Duplicate mobile numbers are detected and merged into the existing lead.

## Manager Read-Only Model

The frontend hides mutation buttons for Manager login. The backend also protects mutating routes with `requireOperator`, so a Manager token can view dashboards and reports but cannot create, update, or delete operational data.

## Production Notes

- Replace demo frontend login with `POST /api/auth/login` before deployment.
- Seed salesmen, inventory, BOM, and product catalog from the existing UI constants or through admin SQL/import scripts.
- Add audit logging for every operator mutation before live use.
- Add deeper table-specific validation and approval workflows where your live business rules require them.
- Host behind HTTPS; never expose webhook endpoints without the shared secret.

## Deployment

This repo supports two deployment modes:

1. Full-stack Render service: Render runs the Express API and serves the Vite production build from `dist`.
2. Split hosting: Vercel serves the frontend from `dist`, and Render serves the Express API.

Recommended first production-like setup:

- Database: Neon PostgreSQL.
- Backend/API: Render Web Service.
- Frontend: either the same Render service or Vercel.

Required production environment values:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
PGSSLMODE=require
JWT_SECRET=<long random secret>
WEBHOOK_SHARED_SECRET=<long random secret>
APP_STATE_SHARED_SECRET=
CLIENT_ORIGIN=https://your-frontend-domain.vercel.app,https://your-render-service.onrender.com
```

Deploy steps:

1. Create a Neon database and copy the pooled or direct `DATABASE_URL`.
2. In Render, create a Web Service from this repo. Use `render.yaml` or set:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Health check path: `/api/health`
3. Add the production environment values in Render.
4. Load the database schema:

   ```bash
   npm run db:schema
   ```

5. Create your first login user:

   ```bash
   npm run db:create-user -- "Operator User" operator@smartcovering.in "StrongPasswordHere" operator
   npm run db:create-user -- "Manager User" manager@smartcovering.in "StrongPasswordHere" manager
   ```

6. If deploying the frontend separately to Vercel or as standalone HTML, set `window.SMARTCOVERING_API_URL` to your Render backend URL. If you set `APP_STATE_SHARED_SECRET` on the backend, also provide the same value as `window.SMARTCOVERING_STATE_SECRET` in the frontend shell.

The main ERP state now syncs to PostgreSQL through `/api/app-state` when the backend is available. Browser `localStorage` remains as an offline/local fallback.
