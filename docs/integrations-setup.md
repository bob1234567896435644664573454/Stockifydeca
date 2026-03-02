# Integrations Setup Guide

This document covers all the third-party integrations added to Stockify and how to configure them.

## Table of Contents

1. [OAuth Login Providers (Google + GitHub)](#oauth-login-providers)
2. [Gmail Integration (Teacher Email)](#gmail-integration)
3. [GitHub Profile Integration (All Users)](#github-profile-integration)
4. [Vercel Deployment](#vercel-deployment)

---

## OAuth Login Providers

### Overview

The `/auth` page now includes **"Continue with Google"** and **"Continue with GitHub"** buttons in addition to email/password login. These use Supabase's built-in OAuth provider support.

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Enable the **Google+ API** or **People API**
4. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**
5. Select **Web application**
6. Add Authorized redirect URI: `https://lbdmxtssrnflfawsccow.supabase.co/auth/v1/callback`
7. Copy the **Client ID** and **Client Secret**
8. In [Supabase Auth Providers](https://app.supabase.com/project/lbdmxtssrnflfawsccow/auth/providers), enable Google and paste the credentials

### GitHub OAuth Setup

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set **Authorization callback URL** to: `https://lbdmxtssrnflfawsccow.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and generate a **Client Secret**
5. In [Supabase Auth Providers](https://app.supabase.com/project/lbdmxtssrnflfawsccow/auth/providers), enable GitHub and paste the credentials

### Redirect URL

After OAuth, Supabase redirects to the app root. Add your deployed URL to the **Redirect URLs** list in [Supabase URL Configuration](https://app.supabase.com/project/lbdmxtssrnflfawsccow/auth/url-configuration).

---

## Gmail Integration

### Overview

Teachers and admins can connect their Gmail account to send class invitations and announcements directly from Stockify. The integration uses Google OAuth with offline access to store a refresh token securely.

### Architecture

- **Edge Function**: `supabase/functions/gmail/index.ts`
- **Database Table**: `public.gmail_connections` (user_id, gmail_address, refresh_token_enc, scopes)
- **Encryption**: AES-256-GCM with a 32-byte key stored as a Supabase secret

### Setup

#### Step 1: Create a Google Cloud OAuth App (separate from login OAuth)

1. In [Google Cloud Console](https://console.cloud.google.com/), go to **APIs & Services > Credentials**
2. Create a new **OAuth 2.0 Client ID** (Web application)
3. Add Authorized redirect URI: `https://lbdmxtssrnflfawsccow.supabase.co/functions/v1/gmail/oauth/callback`
4. Enable the **Gmail API** in your project
5. Copy the **Client ID** and **Client Secret**

#### Step 2: Generate an Encryption Key

```bash
# Generate a 32-byte hex key
openssl rand -hex 32
```

#### Step 3: Set Supabase Secrets

In [Supabase Edge Functions Secrets](https://app.supabase.com/project/lbdmxtssrnflfawsccow/functions/secrets):

| Secret Name | Value |
|---|---|
| `GMAIL_CLIENT_ID` | Your Google OAuth Client ID |
| `GMAIL_CLIENT_SECRET` | Your Google OAuth Client Secret |
| `GMAIL_TOKEN_ENC_KEY` | 64-character hex string from Step 2 |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/functions/v1/gmail/status` | Check connection status |
| `GET` | `/functions/v1/gmail/oauth/start` | Get OAuth consent URL |
| `GET` | `/functions/v1/gmail/oauth/callback` | OAuth callback handler |
| `POST` | `/functions/v1/gmail/send-test` | Send a test email |
| `POST` | `/functions/v1/gmail/disconnect` | Remove connection |

### Usage

1. Log in as a teacher or admin
2. Go to **Settings** (sidebar)
3. Click **Connect Gmail**
4. A popup opens for Google OAuth consent
5. After approval, the connection is saved and the popup closes
6. Use **Send Test Email** to verify the connection works

---

## GitHub Profile Integration

### Overview

All users (students and teachers) can connect their GitHub account to showcase their profile and repositories on Stockify. This is useful for students to display their coding projects alongside their trading performance.

### Architecture

- **Edge Function**: `supabase/functions/github-connect/index.ts`
- **Database Table**: `public.github_connections` (user_id, github_username, access_token_enc, scopes)
- **Encryption**: AES-256-GCM with a 32-byte key stored as a Supabase secret

### Setup

#### Step 1: Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Set **Authorization callback URL** to: `https://lbdmxtssrnflfawsccow.supabase.co/functions/v1/github-connect/oauth/callback`
4. Copy the **Client ID** and generate a **Client Secret**

#### Step 2: Generate an Encryption Key

```bash
openssl rand -hex 32
```

#### Step 3: Set Supabase Secrets

In [Supabase Edge Functions Secrets](https://app.supabase.com/project/lbdmxtssrnflfawsccow/functions/secrets):

| Secret Name | Value |
|---|---|
| `GITHUB_CLIENT_ID` | Your GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Your GitHub OAuth App Client Secret |
| `GITHUB_TOKEN_ENC_KEY` | 64-character hex string from Step 2 |

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/functions/v1/github-connect/status` | Check connection status |
| `GET` | `/functions/v1/github-connect/oauth/start` | Get OAuth consent URL |
| `GET` | `/functions/v1/github-connect/oauth/callback` | OAuth callback handler |
| `GET` | `/functions/v1/github-connect/profile` | Get profile + repos |
| `POST` | `/functions/v1/github-connect/disconnect` | Remove connection |

### Usage

1. Log in as any user
2. Go to **Settings** (sidebar)
3. Click **Connect GitHub**
4. A popup opens for GitHub OAuth consent
5. After approval, your profile and recent repositories are displayed

---

## Vercel Deployment

### Setup

1. Create a Vercel account and link your GitHub repository
2. Set the following environment variables in Vercel:
   - `VITE_SB_URL` = `https://lbdmxtssrnflfawsccow.supabase.co`
   - `VITE_SB_ANON_KEY` = (your Supabase anon key)
3. Set the **Root Directory** to `web`
4. Set **Build Command** to `npm run build`
5. Set **Output Directory** to `dist`
6. Add your Vercel deployment URL to Supabase's **Redirect URLs** list

### GitHub Actions CI/CD

The `.github/workflows/vercel-deploy.yml` workflow automates deployment on push to `main`. Required GitHub repository secrets:

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Vercel personal access token |
| `VERCEL_ORG_ID` | Vercel organization/team ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |
| `VITE_SB_URL` | Supabase project URL |
| `VITE_SB_ANON_KEY` | Supabase anon key |
