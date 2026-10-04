# Retail Shop

React + Vite frontend, Supabase (Postgres + Auth) for data. No backend server.

## Setup

1. In Supabase, open **SQL Editor** and run [supabase/schema.sql](supabase/schema.sql).
2. In **Authentication -> Users**, add a user (email + password) for the shop.
3. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
   Never put the secret key in this project.

## Login

Log in with the email and password of the user created in step 2 of Setup
(Supabase -> Authentication -> Users). There are no built-in credentials.
To reset a password, edit the user in that same Supabase page.

## Login Credentials

Email=bhuramal@gmail.com
Password=Bhuramal_1234

## Run

```bash
npm install
npm run dev
```

## Deploy (GitHub Pages)

Run with `.env` present, since the values are baked in at build time:

```bash
npm run deploy
```
