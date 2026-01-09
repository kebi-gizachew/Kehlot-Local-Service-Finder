# Kehlot – Service Provider Platform

Kehlot is a web-based platform that connects service seekers with local service providers. It includes authentication, real-time chat, admin management, and provider listings.

## 🚀 Getting Started
Prerequisites

Make sure you have the following installed:

Node.js (required for backend and frontend server)

npm

Python 3 (optional alternative for serving frontend)

## 📦 Installation

Clone or download the repository

Open the project in your IDE

Open a terminal in the project root

## ▶️ Running the Application
### 🔹 Backend (API Server)
cd Backend
npm install
npx prisma generate
npm run dev


Starts the backend server with auto-reload

Handles authentication, chat, providers, and admin APIs

### 🔹 Frontend (Static Files)

⚠️ Important:
The frontend MUST be served via an HTTP server (not file://) for full functionality (especially clipboard & image features).

Option 1: Node.js (Recommended)
cd Frontend
npm install
npm run serve


Runs at:

http://localhost:5500

Option 2: Python (Alternative)
python -m http.server 5500


Access at:

http://localhost:5500


⚠️ If the browser opens:

http://127.0.0.1:5500


➡️ Change it manually to:

http://localhost:5500

❌ Do NOT Use

Opening HTML files directly (file://)

Any setup that results in file:// URLs

Misconfigured Live Server that serves files without HTTP context

## ✨ Features

User registration and authentication

Service provider directory

Real-time chat (with image sharing)

Admin dashboard for provider management

Image copy/paste support

Secure cookie-based authentication

## 🌐 Browser Support

Chrome

Edge

Firefox

Notes:

Clipboard API requires localhost or HTTPS

Image clipboard features will NOT work without a proper HTTP server

## 🛠 Development Notes

All asset paths are relative and work from project root

Cookies require proper CORS + credentials setup

Clipboard API requires a secure context (localhost is allowed)

## 🔐 Test Credentials
### Admin

Email: admin@kehlot.com

Password: kehlot2025

### User

Email: user@gmail.com

Password: 12345678

### Provider

Email: kasish@kehlot.com

Password: 12345678

# 📌 Quick Summary (TL;DR)
## Backend
cd Backend
npm install
npx prisma generate
npm run dev

## Frontend
cd Frontend
npm install
npm run serve


## Open in browser:

http://localhost:5500
