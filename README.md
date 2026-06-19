# 🏥 SPSS Smart Pharmacy & Medical Assist System

Welcome to the **Smart Pharmacy Support System (SPSS)**, a modern, full-stack web application designed for pharmacists and healthcare facilities. It integrates OCR-based prescription scanning, drug-to-drug interaction analysis, inventory tracking, analytics, and shift auditing.

---

## 📂 Project Structure

The project is structured into three main directories:

*   **`backend/`**: FastAPI application (Python) handling database operations (SQLite), business logic, drug-to-drug interactions, and in-process **PaddleOCR** extraction.
*   **`frontend/`**: Vite + React + TypeScript + Tailwind CSS (utilizing Shadcn UI) responsive dashboard.
*   **`ocr updated/`**: A standalone microservice version of the OCR API (FastAPI + PaddleOCR) which can be run independently if decoupled OCR scaling is required.

---

## ⚙️ System Requirements & Prerequisites

To successfully install and run all components of the system, ensure your machine meets the following requirements:

### 1. General Requirements
*   **Node.js**: `v18.x` or higher (with `npm` or `bun` package manager).
*   **Python**: `3.8` to `3.11` (highly recommended; newer versions like `3.12` or `3.13` may have installation conflicts with older PaddlePaddle/PaddleOCR dependencies).

### 2. OCR & Machine Learning Prerequisites (Crucial)
PaddleOCR relies on Native C++ extensions and machine learning libraries. You must set up these dependencies before installing Python packages:

#### **For Windows Users (Recommended Stack)**
*   **Microsoft C++ Build Tools**:
    1. Download and run the [Visual Studio Installer](https://visualstudio.microsoft.com/visual-cpp-build-tools/).
    2. Under the Workloads tab, select **Desktop development with C++**.
    3. Ensure the installation includes the MSVC build tools and Windows SDK.
    *This is required for compiling Python dependencies such as `lanms-neo` and `pyclipper`.*

#### **For Linux / macOS Users**
*   Ensure OpenGL and OpenMP libraries are installed on your system.
    *   **Ubuntu/Debian**:
        ```bash
        sudo apt-get update
        sudo apt-get install -y libgl1-mesa-glx libgomp1
        ```
    *   **macOS (Intel/Apple Silicon)**:
        ```bash
        brew install libomp
        ```

---

## 🚀 Installation Guide

Follow these steps to set up both backend and frontend environments from scratch:

### Step 1: Backend Setup (FastAPI & OCR)

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Create a virtual environment (if not already present):
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    *   **Windows (Command Prompt)**:
        ```cmd
        venv\Scripts\activate
        ```
    *   **Windows (PowerShell)**:
        ```powershell
        .\venv\Scripts\Activate.ps1
        ```
    *   **macOS / Linux**:
        ```bash
        source venv/bin/activate
        ```
4.  **Install PaddlePaddle (Machine Learning Core) First**:
    To avoid issues, install the stable CPU version of PaddlePaddle before installing other dependencies:
    ```bash
    pip install paddlepaddle
    ```
5.  Install the remaining Python dependencies:
    ```bash
    pip install -r requirements.txt
    ```

---

### Step 2: Frontend Setup (React & Vite)

1.  Open a new terminal and navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install the dependencies using `npm` (or `bun`):
    ```bash
    npm install
    ```
    *(Alternatively, if you use Bun: `bun install`)*

---

### Step 3: Database Seeding

The application uses an SQLite database (`spss.db`). 

1.  **Initial Schema Creation**: The database tables and default administrator account are automatically created and initialized upon the first boot of the backend.
2.  **Seeding Demo Data (Highly Recommended)**:
    To populate the database with realistic inventory items, sample patients, test prescriptions, and alert logs, you can trigger the seed endpoint once the backend is running.
    *   **Using cURL / HTTP client**:
        ```bash
        curl -X POST http://localhost:8000/system/seed
        ```
    *   You can also navigate to this endpoint in your browser, or trigger it via the admin panel of the frontend app.

---

## 🏃 Running the Application

You can start the backend and frontend servers together using the startup scripts or run them manually in separate terminal windows.

### Method A: Automated Scripts (Windows Only)

*   **Option 1: Batch Script (`start_servers.bat`)**
    *   Double-click the `start_servers.bat` file in the root workspace folder.
*   **Option 2: PowerShell Script (`start.ps1`)**
    *   Right-click `start.ps1` and select **Run with PowerShell**.

These scripts will spin up the backend on port `8000` and the frontend development server on port `8080` (or the next available port) in separate terminal sessions.

---

### Method B: Manual Startup

#### 1. Run the Backend API:
```bash
cd backend
# Make sure your venv is activated!
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*   **Backend Base URL**: `http://localhost:8000`
*   **Interactive API Docs**: `http://localhost:8000/docs` (Swagger UI)

#### 2. Run the Frontend Dev Server:
```bash
cd frontend
npm run dev
```
*   **Frontend Base URL**: `http://localhost:8080`

---

## 🔑 Default Login Credentials

Once the frontend application opens in your browser, use the following credentials to access the system:

| Field | Default Value |
| :--- | :--- |
| **Staff ID / Email** | `PHARM-001` |
| **Password** | `1234` |

*(This profile is created with the `Admin` role by default. You can create other staff profiles with different roles under the user management screen).*

---

## 🧪 Standalone OCR Service (Optional Setup)

If you prefer to run the OCR engine as a standalone microservice (isolated from the main backend api), follow these commands:

1.  Navigate to the `ocr updated/` directory:
    ```bash
    cd "ocr updated"
    ```
2.  Set up the environment and install requirements:
    ```bash
    python -m venv venv
    # Activate environment (e.g. Windows Command Prompt)
    venv\Scripts\activate
    pip install paddlepaddle
    pip install -r requirements.txt
    ```
3.  Start the OCR microservice on a custom port (e.g. `8001`):
    ```bash
    uvicorn main:app --reload --host 0.0.0.0 --port 8001
    ```
*   **OCR API Docs**: `http://localhost:8001/docs`
*   **Endpoint**: Send a `POST` request to `http://localhost:8001/ocr` containing an image file under the parameter `file`.

---

## 🛠️ Troubleshooting & Common Issues

### 1. `ImportError: DLL load failed` on Windows
This typically happens if the Microsoft Visual C++ Redistributable is missing or if your Python version is incompatible.
*   **Fix**: Install the latest [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe) and reboot. Verify that you are running Python `3.8 - 3.11`.

### 2. `lanms` or `pyclipper` fail to compile during `pip install`
*   **Fix**: This indicates Microsoft C++ Build Tools are missing. Follow the steps under **OCR & Machine Learning Prerequisites** above to install the Visual Studio C++ Compiler.

### 3. Port Conflicts
*   If port `8000` (Backend) or `8080` (Frontend) is already in use by another application:
    *   **Backend**: Edit `start_servers.bat` or run manually with a different `--port` flag (e.g. `8002`).
    *   **Frontend**: Vite will automatically offer to run on the next available port (e.g. `8081`). Ensure you update the API base URL if the backend port changes.
