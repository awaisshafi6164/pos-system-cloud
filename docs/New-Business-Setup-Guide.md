# New Business Setup Guide

A step-by-step reference for creating a new business and assigning an admin user via Supabase MCP.

---

## Prerequisites

- Access to the Supabase MCP (POS Cloud project)
- Project ID: `wwewioobplpwqojcvsab`
- The user must already have a Supabase Auth account (i.e. they must have signed up before being assigned)

---

## Required Information

Before running any SQL, collect the following:

| Field | Description | Example |
|-------|-------------|---------|
| `name` | Business display name | `Staging Restaurant` |
| `code` | Unique business code | `1001` |
| `email` | Admin user's email (must exist in auth.users) | `awaisshafi.pk@gmail.com` |
| `role` | Role to assign | `admin` |

---

## Step 1 — Create the Business

```sql
INSERT INTO public.businesses (name, code)
VALUES ('<BUSINESS_NAME>', '<BUSINESS_CODE>')
RETURNING id, name, code, created_at;
```

**Example:**
```sql
INSERT INTO public.businesses (name, code)
VALUES ('Staging Restaurant', '1001')
RETURNING id, name, code, created_at;
```

Note the returned `id` (UUID) — you'll need it in Step 3.

---

## Step 2 — Look Up the User

```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = '<USER_EMAIL>';
```

**Example:**
```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = 'awaisshafi.pk@gmail.com';
```

Note the returned `id` (UUID) — this is the `auth_uid` for the next step.

---

## Step 3 — Assign the User as Admin

```sql
INSERT INTO public.employees (auth_uid, business_id, name, email, role)
VALUES (
  '<AUTH_UID>',        -- from Step 2
  '<BUSINESS_ID>',     -- from Step 1
  '<DISPLAY_NAME>',
  '<USER_EMAIL>',
  'admin'
)
RETURNING id, name, email, role, business_id, created_at;
```

**Example:**
```sql
INSERT INTO public.employees (auth_uid, business_id, name, email, role)
VALUES (
  'aad416ba-c23d-4914-89ca-c77e604e96e5',
  '9831c592-b893-4ab6-b850-b59829dbed2d',
  'Awais Shafi',
  'awaisshafi.pk@gmail.com',
  'admin'
)
RETURNING id, name, email, role, business_id, created_at;
```

---

## Available Roles

| Role | Description |
|------|-------------|
| `admin` | Full access to the business |
| `cashier` | POS / invoicing access only |

> Add more roles here as the system evolves.

---

## Verification

After setup, confirm everything looks correct:

```sql
SELECT
  b.id AS business_id,
  b.name AS business_name,
  b.code AS business_code,
  e.name AS employee_name,
  e.email,
  e.role,
  e.created_at
FROM public.businesses b
JOIN public.employees e ON e.business_id = b.id
WHERE b.code = '<BUSINESS_CODE>';
```

---

## Businesses Created

| Business Name | Code | Business ID | Admin Email | Date Created |
|---------------|------|-------------|-------------|--------------|
| Staging Restaurant | 1001 | `9831c592-b893-4ab6-b850-b59829dbed2d` | awaisshafi.pk@gmail.com | 2026-08-15 |

> Keep this table updated each time a new business is added.

---

## Notes

- The `businesses` table currently has **RLS (Row Level Security) disabled**. This means any authenticated user can read/write all businesses. Consider enabling RLS with appropriate policies before going to production.
- The `id` column in `businesses` is auto-generated via `gen_random_uuid()` — never set it manually.
- If a user doesn't exist in `auth.users`, they need to sign up first (or be invited via Supabase Auth).
