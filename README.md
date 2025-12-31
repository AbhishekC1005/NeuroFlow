# 🧠 FlowML - Visual Machine Learning Pipeline Builder

<div align="center">

![FlowML Logo](frontend/src/assets/image.png)

**Build machine learning pipelines visually with drag & drop. No coding required.**

[Demo](https://neuroflow-sigma.vercel.app) · [Report Bug](mailto:abhishekchaudhari336@gmail.com) · [Request Feature](mailto:abhishekchaudhari336@gmail.com)

</div>

---

## ✨ Features

- 🎨 **Visual Pipeline Builder** - Drag & drop nodes to create ML workflows
- 📊 **Data Import** - Upload CSV/Excel files with instant preview
- 🔧 **Preprocessing** - Handle missing values, encode categories, scale features
- 🤖 **ML Models** - Train classification & regression models
- 📈 **Evaluation** - View accuracy metrics, confusion matrices, and more
- 💬 **AI Assistant** - Get help from GPT-powered chatbot
- 🔐 **User Authentication** - Secure login/signup with JWT tokens
- 💾 **PostgreSQL Storage** - Save datasets and workflows per user

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **React Flow** for node-based interface
- **TailwindCSS** for styling
- **Vite** for fast development

### Backend
- **FastAPI** (Python)
- **SQLAlchemy** + PostgreSQL
- **Scikit-learn** for ML
- **OpenAI API** for chat assistant

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL database (local or cloud like [Neon](https://neon.tech))

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/flowml.git
cd flowml
```

### 2. Backend Setup
```bash
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

# Run the backend
python app.py
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### 4. Open the app
Navigate to `http://localhost:5173` in your browser.

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)
```env
# OpenAI API key for chat assistant
OPENAI_API_KEY=sk-your-openai-api-key

# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require

# JWT secret key (generate with: python -c "import secrets; print(secrets.token_hex(32))")
SECRET_KEY=your-secret-key-here
```

### Frontend (`frontend/.env.development`)
```env
# Backend API URL (for local development)
VITE_API_URL=http://localhost:8000
```

### Frontend (`frontend/.env.production`)
```env
# Backend API URL (for production)
VITE_API_URL=https://your-backend-url.com
```

---

## 📁 Project Structure

```
flowml/
├── backend/
│   ├── app.py              # FastAPI application & routes
│   ├── auth.py             # JWT authentication utilities
│   ├── database.py         # SQLAlchemy database config
│   ├── models.py           # Database models (User, Dataset, Workflow)
│   ├── ml_service.py       # Machine learning pipeline logic
│   ├── chat_service.py     # OpenAI chat integration
│   └── requirements.txt    # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── nodes/      # React Flow node components
│   │   │   ├── AuthContext.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── LandingPage.tsx
│   │   ├── App.tsx         # Main application
│   │   └── main.tsx        # Entry point
│   └── package.json
│
└── README.md
```

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create new user |
| POST | `/auth/login` | Login & get JWT token |
| GET | `/auth/me` | Get current user info |

### Datasets (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload CSV/Excel file |
| GET | `/datasets` | List user's datasets |
| DELETE | `/datasets/{id}` | Delete a dataset |

### Workflows (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workflows` | List user's workflows |
| POST | `/workflows` | Save a workflow |
| DELETE | `/workflows/{id}` | Delete a workflow |

### ML Pipeline (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/run_pipeline` | Run single pipeline |
| POST | `/run_pipeline_batch` | Run multiple pipelines |
| POST | `/chat` | Chat with AI assistant |

---

## 🎯 How to Use

1. **Upload Data** - Drag a Dataset node and upload your CSV/Excel file
2. **Add Preprocessing** - Connect imputation, encoding, or scaling nodes
3. **Configure Split** - Set train/test split ratio
4. **Select Model** - Choose classification or regression algorithm
5. **View Results** - Add a Result node and click "Run Pipeline"
6. **Get Help** - Use the AI chat to ask questions about your workflow

---

## 🚀 Deployment

### Backend (Render)
1. Create a new Web Service on [Render](https://render.com)
2. Connect your GitHub repository
3. Set environment variables
4. Deploy!

### Frontend (Vercel)
## 🏗️ System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLOWML ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────┐         ┌─────────────────┐         ┌───────────────┐ │
│   │                 │   API   │                 │   SQL   │               │ │
│   │    FRONTEND     │◄───────►│     BACKEND     │◄───────►│  POSTGRESQL   │ │
│   │   (React/Vite)  │  REST   │    (FastAPI)    │         │   DATABASE    │ │
│   │                 │  +JWT   │                 │         │               │ │
│   └─────────────────┘         └────────┬────────┘         └───────────────┘ │
│                                        │                                     │
│                                        │ API                                 │
│                                        ▼                                     │
│                               ┌─────────────────┐                           │
│                               │                 │                           │
│                               │   OPENAI API    │                           │
│                               │   (GPT-4/3.5)   │                           │
│                               │                 │                           │
│                               └─────────────────┘                           │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Authentication Architecture

FlowML uses **JWT (JSON Web Tokens)** for stateless authentication.

### Auth Flow Diagram

```
┌──────────┐      ┌──────────────┐      ┌──────────────┐      ┌────────────┐
│  CLIENT  │      │   FRONTEND   │      │   BACKEND    │      │  DATABASE  │
└────┬─────┘      └──────┬───────┘      └──────┬───────┘      └─────┬──────┘
     │                   │                     │                    │
     │  1. Login Form    │                     │                    │
     │──────────────────►│                     │                    │
     │                   │                     │                    │
     │                   │  2. POST /auth/login│                    │
     │                   │────────────────────►│                    │
     │                   │                     │                    │
     │                   │                     │  3. Query User     │
     │                   │                     │───────────────────►│
     │                   │                     │                    │
     │                   │                     │  4. User + Hash    │
     │                   │                     │◄───────────────────│
     │                   │                     │                    │
     │                   │                     │  5. Verify Password│
     │                   │                     │  6. Generate JWT   │
     │                   │                     │                    │
     │                   │  7. JWT Token       │                    │
     │                   │◄────────────────────│                    │
     │                   │                     │                    │
     │                   │  8. Store in        │                    │
     │                   │     localStorage    │                    │
     │                   │                     │                    │
     │  9. Redirect to   │                     │                    │
     │     Workspace     │                     │                    │
     │◄──────────────────│                     │                    │
     │                   │                     │                    │
```

### JWT Token Structure

```json
{
  "sub": "user@email.com",    // Subject (user identifier)
  "exp": 1735689600,          // Expiration timestamp
  "iat": 1735603200           // Issued at timestamp
}
```

### Password Security

- Passwords are hashed using **bcrypt** (via `passlib`)
- Plaintext passwords are never stored
- Salt is automatically generated per password

### Protected Routes

All API endpoints except `/`, `/auth/login`, and `/auth/register` require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

---

## 🤖 AI Chat Architecture

The AI assistant uses **OpenAI's GPT API** to provide context-aware help.

### Chat Flow Diagram

```
┌──────────┐      ┌──────────────┐      ┌──────────────┐      ┌────────────┐
│   USER   │      │   FRONTEND   │      │   BACKEND    │      │  OPENAI    │
└────┬─────┘      └──────┬───────┘      └──────┬───────┘      └─────┬──────┘
     │                   │                     │                    │
     │  1. Ask Question  │                     │                    │
     │──────────────────►│                     │                    │
     │                   │                     │                    │
     │                   │  2. Extract Context │                    │
     │                   │  - Current nodes    │                    │
     │                   │  - Edges/connections│                    │
     │                   │  - Sample data      │                    │
     │                   │                     │                    │
     │                   │  3. POST /chat      │                    │
     │                   │  {workflow, question│                    │
     │                   │   sample_data}      │                    │
     │                   │────────────────────►│                    │
     │                   │                     │                    │
     │                   │                     │  4. Build Prompt   │
     │                   │                     │  - System context  │
     │                   │                     │  - Workflow JSON   │
     │                   │                     │  - User question   │
     │                   │                     │                    │
     │                   │                     │  5. API Request    │
     │                   │                     │───────────────────►│
     │                   │                     │                    │
     │                   │                     │  6. GPT Response   │
     │                   │                     │◄───────────────────│
     │                   │                     │                    │
     │                   │  7. AI Response     │                    │
     │                   │◄────────────────────│                    │
     │                   │                     │                    │
     │  8. Display       │                     │                    │
     │     Markdown      │                     │                    │
     │◄──────────────────│                     │                    │
```

### Context Injection

The AI receives:
- **Workflow Structure**: All nodes and their configurations
- **Data Preview**: First 5 rows of uploaded dataset
- **Connection Graph**: How nodes are connected

This enables context-aware responses like:
- "Your dataset has 150 rows and 4 columns"
- "You're using LogisticRegression but haven't set a target column"

---

## ⚙️ ML Pipeline Architecture

### Pipeline Execution Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ML PIPELINE EXECUTION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌───────┐│
│   │ DATASET  │───►│IMPUTATION│───►│ ENCODING │───►│  SPLIT   │───►│ MODEL ││
│   │  NODE    │    │   NODE   │    │   NODE   │    │   NODE   │    │ NODE  ││
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘    └───┬───┘│
│        │                                                              │     │
│        │                                                              ▼     │
│        │         ┌──────────────────────────────────────────────────────┐  │
│        │         │                    RESULT NODE                        │  │
│        │         │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │  │
│        │         │  │  Accuracy   │  │  Precision  │  │   Recall    │   │  │
│        │         │  │   0.95      │  │    0.94     │  │    0.96     │   │  │
│        │         │  └─────────────┘  └─────────────┘  └─────────────┘   │  │
│        │         │  ┌─────────────────────────────────────────────────┐ │  │
│        │         │  │           Confusion Matrix                       │ │  │
│        │         │  │    [[45, 2], [1, 47]]                           │ │  │
│        │         │  └─────────────────────────────────────────────────┘ │  │
│        │         └──────────────────────────────────────────────────────┘  │
│        │                                                                    │
│        ▼                                                                    │
│   ┌──────────────────────────────────────────────────────────────────────┐ │
│   │                     BACKEND PROCESSING                                │ │
│   │                                                                        │ │
│   │  1. Load Data        →  pandas.read_csv()                             │ │
│   │  2. Train/Test Split →  sklearn.model_selection.train_test_split()   │ │
│   │  3. Imputation       →  sklearn.impute.SimpleImputer()               │ │
│   │  4. Encoding         →  sklearn.preprocessing.OneHotEncoder()        │ │
│   │  5. Scaling          →  sklearn.preprocessing.StandardScaler()       │ │
│   │  6. Model Training   →  sklearn.linear_model / ensemble / etc.       │ │
│   │  7. Evaluation       →  sklearn.metrics                               │ │
│   │                                                                        │ │
│   └──────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Supported ML Models

| Type | Models |
|------|--------|
| **Classification** | Logistic Regression, Random Forest, Decision Tree, SVM, KNN, Naive Bayes |
| **Regression** | Linear Regression, Ridge, Lasso, Random Forest Regressor, SVR |

### Preprocessing Options

| Step | Options |
|------|---------|
| **Imputation** | Mean, Median, Most Frequent, Drop |
| **Encoding** | One-Hot, Label, Ordinal |
| **Scaling** | StandardScaler, MinMaxScaler, None |

---

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE SCHEMA (PostgreSQL)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌───────────────────┐                                                      │
│   │       USERS       │                                                      │
│   ├───────────────────┤                                                      │
│   │ id (PK)           │──────────────────┐                                   │
│   │ email             │                  │                                   │
│   │ hashed_password   │                  │                                   │
│   │ created_at        │                  │                                   │
│   └───────────────────┘                  │                                   │
│                                          │                                   │
│              ┌───────────────────────────┼───────────────────────┐           │
│              │                           │                       │           │
│              ▼                           ▼                       ▼           │
│   ┌───────────────────┐    ┌───────────────────┐    ┌───────────────────┐   │
│   │     DATASETS      │    │     WORKFLOWS     │    │  PIPELINE_RESULTS │   │
│   ├───────────────────┤    ├───────────────────┤    ├───────────────────┤   │
│   │ id (PK)           │    │ id (PK)           │    │ id (PK)           │   │
│   │ user_id (FK)      │    │ user_id (FK)      │    │ user_id (FK)      │   │
│   │ filename          │    │ name              │    │ workflow_id (FK)  │   │
│   │ file_data (BYTEA) │    │ nodes_json        │    │ results_json      │   │
│   │ columns (JSON)    │    │ edges_json        │    │ created_at        │   │
│   │ shape (JSON)      │    │ created_at        │    └───────────────────┘   │
│   │ created_at        │    │ updated_at        │                             │
│   └───────────────────┘    └───────────────────┘                             │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Table Descriptions

| Table | Purpose |
|-------|---------|
| `users` | User accounts with bcrypt-hashed passwords |
| `datasets` | Uploaded CSV/Excel files stored as binary (BYTEA) |
| `workflows` | Saved node configurations and edge connections |
| `pipeline_results` | Historical ML run results for analytics |

---

## 🔄 Data Flow Summary

```
User Action              Frontend                    Backend                  Database
───────────────────────────────────────────────────────────────────────────────────────

Register            ──►  POST /auth/register    ──►  Hash password      ──►  Insert user
                                                     Create user

Login               ──►  POST /auth/login       ──►  Verify password    ◄──  Query user
                    ◄──  JWT Token              ◄──  Generate JWT

Upload File         ──►  POST /upload           ──►  Parse CSV/Excel    ──►  Store binary
                    ◄──  Preview + columns      ◄──  Extract metadata

Save Workflow       ──►  POST /workflows        ──►  Serialize nodes    ──►  Store JSON
                    ◄──  Workflow ID            ◄──  Return ID

Run Pipeline        ──►  POST /run_pipeline     ──►  Load data
                                                     Preprocess
                                                     Train model
                                                     Evaluate            ──►  Store results
                    ◄──  Metrics + confusion    ◄──  Return JSON

Ask AI              ──►  POST /chat             ──►  Build context      ──►  OpenAI API
                    ◄──  Markdown response      ◄──  GPT response
```

---
