# 🚀 Production Deployment Guide

This guide details how to deploy FlowML to production using **Render** (Backend) and **Vercel** (Frontend).

---

## 🏗️ Architecture
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Backend API**: Render (Web Service)
- **Frontend**: Vercel (Static Site)

---

## 1️⃣ Database & Storage Setup (Supabase)

1.  **Create Project**: Go to [Supabase](https://supabase.com) and create a new project.
2.  **Get Credentials**:
    - Go to **Project Settings** -> **API**.
    - Copy the `URL` and `service_role` (secret) Key.
3.  **Setup Database Connection (CRITICAL)**:
    - Go to **Project Settings** -> **Database**.
    - Scroll to **Connection parameters** / **Connection Pooling**.
    - **IMPORTANT**: Do NOT use the Mode: Direct (port 5432). Render has issues with Supabase IPv6 addresses.
    - Switch the toggle to **Mode: Session** (or Transaction) and copy the **Connection String** that uses port **6543**.
    - It looks like: `postgresql://postgres.[ref]:[password]@[host]:6543/postgres`.
    - Use THIS string as your `DATABASE_URL`.
4.  **Setup Storage**:
    - Go to **Storage** -> **New Bucket**.
    - Name it `datasets`.
    - Make it **Private**.

---

## 2️⃣ Backend Deployment (Render)

We use Render because it supports Python web services perfectly.

1.  **Push Code**: Ensure your code is pushed to GitHub.
2.  **Create Service**:
    - Go to [Render Dashboard](https://dashboard.render.com).
    - Click **New +** -> **Web Service**.
    - Connect your GitHub repository.
3.  **Configure**:
    - **Name**: `flowml-backend`
    - **Root Directory**: `backend`
    - **Runtime**: Python 3
    - **Build Command**: `pip install -r requirements.txt`
    - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
4.  **Environment Variables**:
    Add the following in the "Environment" tab:
    - `PYTHON_VERSION`: `3.10.0`
    - `DATABASE_URL`: *(Paste the Port 6543 Connection String)*
    - `SUPABASE_URL`: *(Paste Supabase URL)*
    - `SUPABASE_KEY`: *(Paste Supabase Service Role Key)*
    - `OPENAI_API_KEY`: *(Paste your OpenAI Key)*
    - `ALLOWED_ORIGINS`: `https://your-vercel-frontend.vercel.app` (Update this after deploying frontend)
5.  **Deploy**: Click "Create Web Service". Wait for it to go live.
    - **Copy the Backend URL**: e.g., `https://flowml-backend.onrender.com`.

---

## 3️⃣ Frontend Deployment (Vercel)

1.  **Create Project**:
    - Go to [Vercel](https://vercel.com).
    - Click **Add New** -> **Project**.
    - Import your GitHub repository.
2.  **Configure**:
    - **Framework Preset**: Vite
    - **Root Directory**: `frontend` (Click "Edit" next to Root Directory if needed).
3.  **Environment Variables**:
    - `VITE_API_URL`: *(Paste your Render Backend URL, e.g., https://flowml-backend.onrender.com)*
4.  **Deploy**: Click "Deploy".

---

## 4️⃣ Final Connection

1.  **Update CORS**:
    - Go back to your **Render Backend**.
    - Update `ALLOWED_ORIGINS` to include your new Vercel URL.
    - Render will auto-redeploy.
2.  **Verify**:
    - Open your Vercel App.
    - Try logging in or analyzing a dataset.

**🎉 Success! Your FlowML app is now production-ready.**
