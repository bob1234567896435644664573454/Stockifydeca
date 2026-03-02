# OAuth Setup Guide

This document describes how to configure Google and GitHub OAuth providers in the Supabase dashboard for Stockify.

## Prerequisites

You need admin access to the Supabase project at [https://app.supabase.com/project/lbdmxtssrnflfawsccow](https://app.supabase.com/project/lbdmxtssrnflfawsccow).

## Google OAuth (Sign in with Google)

### Step 1: Create a Google Cloud Project

1. Go to [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services > OAuth consent screen**.
4. Choose **External** user type and fill in the required fields (App name, User support email, Developer contact).
5. Add the scope `openid`, `email`, and `profile`.
6. Add your domain to the **Authorized domains** list.

### Step 2: Create OAuth Credentials

1. Navigate to **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Choose **Web application**.
4. Add the following **Authorized redirect URIs**:
   - `https://lbdmxtssrnflfawsccow.supabase.co/auth/v1/callback`
   - Your deployed frontend URL (e.g., `https://your-app.vercel.app`)
5. Copy the **Client ID** and **Client Secret**.

### Step 3: Configure Supabase

1. Go to [https://app.supabase.com/project/lbdmxtssrnflfawsccow/auth/providers](https://app.supabase.com/project/lbdmxtssrnflfawsccow/auth/providers)
2. Find **Google** and toggle it on.
3. Paste the **Client ID** and **Client Secret** from Step 2.
4. Save.

## GitHub OAuth (Sign in with GitHub)

### Step 1: Create a GitHub OAuth App

1. Go to [https://github.com/settings/developers](https://github.com/settings/developers)
2. Click **New OAuth App**.
3. Fill in:
   - **Application name**: Stockify
   - **Homepage URL**: Your deployed frontend URL
   - **Authorization callback URL**: `https://lbdmxtssrnflfawsccow.supabase.co/auth/v1/callback`
4. Click **Register application**.
5. Copy the **Client ID** and generate a **Client Secret**.

### Step 2: Configure Supabase

1. Go to [https://app.supabase.com/project/lbdmxtssrnflfawsccow/auth/providers](https://app.supabase.com/project/lbdmxtssrnflfawsccow/auth/providers)
2. Find **GitHub** and toggle it on.
3. Paste the **Client ID** and **Client Secret** from Step 1.
4. Save.

## Redirect URL Configuration

After OAuth login, Supabase redirects the user back to the app. The `redirectTo` option in the code is set to `window.location.origin`, which means it will redirect to the root of the current domain. Ensure your deployed URL is added to the **Redirect URLs** list in the Supabase dashboard under **Authentication > URL Configuration**.

## Testing

Once configured, the "Continue with Google" and "Continue with GitHub" buttons on the `/auth` page will redirect users to the respective OAuth consent screens.
