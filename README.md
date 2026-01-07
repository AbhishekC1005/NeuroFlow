# FlowML - Visual Machine Learning Pipeline Builder

FlowML is an advanced visual platform for building, analyzing, and deploying Machine Learning pipelines. It combines a drag-and-drop interface with Agentic AI to accelerate the data science workflow.

![FlowML Logo](frontend/src/assets/image.png)

[Demo](https://neuroflow-sigma.vercel.app) | [Report Bug](mailto:abhishekchaudhari336@gmail.com) | [Request Feature](mailto:abhishekchaudhari336@gmail.com)

---

## Architecture Overview

FlowML follows a decoupled Client-Server architecture designed for scalability and separation of concerns.

```mermaid
graph TD
    User((User))
    subgraph Frontend [React Frontend]
        UI[React Flow Canvas]
        State[State Management]
        Vis[Recharts Visualization]
    end
    
    subgraph Backend [FastAPI Backend]
        API[API Gateway]
        ML[ML Service / Scikit-Learn]
        Chat[Agentic Chat Service]
    end
    
    subgraph Infrastructure
        DB[(PostgreSQL)]
        Storage[Supabase Storage]
        AI[OpenAI GPT-4o]
    end

    User --> UI
    UI <--> API
    API --> DB
    API --> Storage
    
    API --> ML
    API --> Chat
    Chat <--> AI
```

## Key Features

### 1. Agentic AI Assistant
FlowML moves beyond simple chatbots by implementing an Agentic AI that can directly manipulate the application state. Users can describe their intent in natural language, and the AI constructs the corresponding pipeline on the canvas.

**Workflow:**
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant GPT as OpenAI GPT-4o
    
    User->>Frontend: "Build a Random Forest pipeline"
    Frontend->>Backend: POST /chat (prompt)
    Backend->>GPT: Request structured Graph JSON
    GPT-->>Backend: Return Nodes & Edges JSON
    Backend-->>Frontend: Return Command Payload
    Frontend->>Frontend: Parse JSON & Render Nodes
```

### 2. Dataset X-Ray Vision
The platform provides immediate statistical insight into datasets without writing code. This includes automatic distribution analysis (histograms) and feature correlation detection.

**Analysis Pipeline:**
```mermaid
sequenceDiagram
    participant Frontend
    participant Backend
    participant Pandas as Pandas Engine
    
    Frontend->>Backend: POST /analyze {file_id}
    Backend->>Pandas: Load Data Frame
    Pandas->>Pandas: Compute Histograms (Numeric)
    Pandas->>Pandas: Compute Correlation Matrix
    Backend-->>Frontend: Return Analysis JSON
    Frontend->>Frontend: Render Recharts (Bar/Heatmap)
```

### 3. Intelligent Error Handling
FlowML wraps standard Python exceptions to provide actionable guidance. Instead of generic server errors, the system analyzes the traceback and suggests specific remediation steps (e.g., suggesting Encoders for string data).

### 4. Visual Pipeline Builder
- **Drag & Drop Interface**: Built on React Flow.
- **State Persistence**: Automatic local storage synchronization prevents data loss.
- **Result Dashboard**: Integrated visualization for Confusion Matrices, Feature Importance, and Metrics.

---

## Technical Stack

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **State/Graph**: React Flow
- **Visualization**: Recharts
- **Styling**: TailwindCSS

### Backend
- **API Framework**: FastAPI (Python 3.10+)
- **Machine Learning**: Scikit-Learn, Pandas, NumPy
- **Database**: PostgreSQL (via SQLAlchemy)
- **Object Storage**: Supabase
- **AI Model**: OpenAI GPT-4o

---

## Quick Start Guide

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL Database
- OpenAI API Key

### Backend Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Linux/Mac:
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables in a `.env` file:
   ```env
   OPENAI_API_KEY=your_key
   DATABASE_URL=postgresql://user:pass@localhost/dbname
   SUPABASE_URL=your_url
   SUPABASE_KEY=your_key
   ```

5. Start the server:
   ```bash
   python app.py
   ```

### Frontend Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Access the application at `http://localhost:5173`

---

## Contribution

We welcome contributions to FlowML. Please submit Pull Requests following the standard feature branch workflow.

## License

This project is open-source and licensed under the MIT License.
