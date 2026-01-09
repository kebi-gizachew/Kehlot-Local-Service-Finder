# Kehlot - Service Provider Platform

A web-based platform connecting service seekers with local service providers.

## 🚀 Getting Started

### Prerequisites
- Node.js (for backend and serving frontend)
- Python 3 (alternative for serving frontend)

### Installation
1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

#### Frontend (Static Files)
The frontend is a collection of static HTML/CSS/JS files. To enable full functionality including image clipboard operations, you MUST serve it via a proper local HTTP server (not file:// URLs).

**Option 1: Node.js (Recommended)**
```bash
npm run serve
```
This starts a server at http://localhost:3000

**Option 2: Python (if available)**
```bash
python -m http.server 8000
```
Access at http://127.0.0.1:8000

**❌ DO NOT use:**
- VS Code Live Server in `/file/` mode
- Opening HTML files directly in browser (file://)
- Any setup that results in file:// URLs

#### Backend (API Server)
```bash
npm run dev
```
Starts the backend server with auto-reload.

### Features
- User registration and authentication
- Service provider directory
- Real-time chat with image sharing
- Admin dashboard for provider management
- Image copy/paste functionality (requires proper server setup)

### Browser Support
- Modern browsers (Chrome, Edge, Firefox)
- Requires HTTPS or localhost for clipboard API
- Image clipboard operations need proper HTTP server

### Development Notes
- All asset paths are relative and work from project root
- Chat images are stored as data URLs in localStorage
- Clipboard API requires secure context (localhost HTTP)</content>
<parameter name="filePath">c:\Users\zbook\Desktop\file\file\README.md