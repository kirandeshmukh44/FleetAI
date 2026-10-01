# 🚀 AI-Based Smart Transportation & Fleet Management Platform

> **Complete user guide** — how to set up, run, and use every feature of the platform.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Quick Start (Setup)](#quick-start-setup)
4. [Default Credentials](#default-credentials)
5. [Website Sections Guide](#website-sections-guide)
6. [ML & AI Features](#ml--ai-features)
7. [Importing Data (CSV)](#importing-data-csv)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Project Overview

The **AI-Based Smart Transportation Platform** is a full-stack intelligent fleet management system that combines:

- **Real-time GPS vehicle tracking** via Leaflet maps
- **AI/ML-powered driver risk prediction** using machine learning models
- **Fuel analytics** with consumption forecasting
- **Driver behavior analysis** (speed, braking, acceleration)
- **Comprehensive reporting** with interactive charts (Recharts)
- **SQLite database** for lightweight, file-based storage

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, React Router v7, Recharts, Leaflet |
| **Styling** | Tailwind CSS v4 + DaisyUI v5, Vanilla CSS |
| **Backend** | Python Flask, Flask-JWT-Extended, SQLAlchemy |
| **Database** | SQLite (file-based, no setup needed) |
| **ML/AI** | scikit-learn (Random Forest), pandas, numpy |
| **Auth** | JWT Bearer tokens |

---

## Quick Start (Setup)

### Prerequisites
- **Node.js** >= 18 and npm
- **Python** >= 3.9 and pip

### 1. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
pip install -r requirements.txt
```

### 2. Initialize the Database

```bash
cd backend
python init_db.py
```

Creates `instance/transportation.db` with tables and default admin user.

### 3. Start the Backend

```bash
cd backend
python run.py
# Runs on http://localhost:5000
```

### 4. Start the Frontend

```bash
cd frontend
npm run dev
# Runs on http://localhost:5174
```

### 5. Open the App

Navigate to **http://localhost:5174**

---

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Administrator | admin | admin123 |

> On the login page, click "Fill Demo Admin" to auto-fill credentials.

---

## Website Sections Guide

### Landing Page (/)
Public homepage with animated hero, feature highlights, and CTA buttons.

### Login Page (/login)
- Enter username and password
- Use "Fill Demo Admin" button for instant demo access
- Redirects to Dashboard on success

### Register Page (/register)
Create a new user account with username, email, and password.

### Dashboard (/dashboard)
Main operations overview:
- Fleet Vehicles, Active Vehicles, Registered Drivers, High Risk Drivers
- Avg. Fuel Efficiency, Risk Alerts, Recorded Journeys
- Recent activity feed and fleet snapshot
- Import fleet data via CSV

### Live Tracking (/tracking)
Interactive Leaflet map with real-time vehicle positions.
- Color-coded markers: Green=Active, Yellow=Idle, Red=Stopped
- Click markers for details

### Vehicles (/vehicles)
Full CRUD management for fleet vehicles. Add, edit, delete vehicles.

### Drivers (/drivers)
Manage driver profiles, license info, contact details, and risk scores.

### Driver Behavior (/driver-behavior)
Charts showing speed violations, hard braking, rapid acceleration, and smooth driving scores.

### Risk Analysis (/risk-prediction)
ML-powered risk scoring:
1. Select driver and vehicle
2. Enter journey metrics
3. Click Predict Risk
4. Get Low/Medium/High risk result with confidence score

### Fuel Analytics (/fuel-analytics)
Fuel consumption trends, efficiency by vehicle, top consumers, cost analysis.

### Reports (/reports)
Journey summaries, driver performance reports, fuel cost reports.

### Settings (/settings)
Profile settings, password change, system info.

---

## ML and AI Features

### Risk Prediction Model

Location: backend/trained_models/risk_model.pkl

Input features:
- avg_speed: Average speed (km/h)
- max_speed: Maximum speed recorded
- hard_braking_count: Sudden braking events
- rapid_acceleration_count: Aggressive acceleration events
- journey_distance: Total distance (km)
- journey_duration: Total time (minutes)

Risk levels: Low, Medium, High

### Retrain the Model

```bash
cd backend
python -c "from app.ml.train import train_model; train_model()"
```

---

## Importing Data (CSV)

From Dashboard, click "Import fleet data".

### Vehicles CSV
```
vehicle_id,registration_number,make,model,year,fuel_type,status
V001,MH12AB1234,Toyota,Innova,2022,diesel,active
```

### Drivers CSV
```
first_name,last_name,license_number,phone,email,status
John,Doe,DL123456,9876543210,john@example.com,active
```

### GPS Records CSV
```
vehicle_id,latitude,longitude,speed,timestamp
V001,18.5204,73.8567,45.5,2024-01-15T10:30:00
```

### Journeys CSV
```
vehicle_id,driver_id,start_time,end_time,distance,start_location,end_location
1,1,2024-01-15T08:00:00,2024-01-15T10:00:00,120.5,Pune,Mumbai
```

### Fuel Records CSV
```
vehicle_id,fuel_amount,fuel_cost,odometer_reading,date
1,45.5,3500,15000,2024-01-15
```

---

## API Reference

Base URL: http://localhost:5000/api

| Endpoint | Method | Description |
|----------|--------|-------------|
| /auth/login | POST | Login and get JWT token |
| /auth/register | POST | Create new user account |
| /auth/me | GET | Get current user info |
| /health | GET | Check database connection |
| /dashboard/summary | GET | Fleet statistics |
| /vehicles | GET/POST | List/add vehicles |
| /drivers | GET/POST | List/add drivers |
| /tracking | GET | Live GPS data |
| /risk/predict | POST | Run ML risk prediction |
| /risk/history | GET | Past risk predictions |
| /fuel | GET | Fuel analytics data |
| /import/csv | POST | Bulk CSV import |

Authentication header: Authorization: Bearer <jwt_token>

---

## Troubleshooting

### Login shows loading or redirects back to login
1. Make sure backend is running: cd backend && python run.py
2. Check backend is on port 5000
3. Clear browser local storage (DevTools > Application > Local Storage)

### Database unavailable in topbar
cd backend
python init_db.py
python run.py

### Map not loading on Tracking page
Import GPS data via Dashboard > Import fleet data

### Risk prediction returns error
cd backend
python -c "from app.ml.train import train_model; train_model()"

### UI overlapping on mobile
Use the menu button (top-left) to toggle the sidebar overlay.

### Reset admin password
cd backend
python -c "
from app import create_app
from app.models import User
from app.database.db import db
app = create_app()
with app.app_context():
    user = User.query.filter_by(username='admin').first()
    user.set_password('newpassword123')
    db.session.commit()
    print('Password reset done')
"

---

## Project Structure

AI-Based Smart Transportation/
├── frontend/
│   ├── src/
│   │   ├── pages/          # Route pages (Dashboard, Tracking, etc.)
│   │   ├── layouts/        # MainLayout (sidebar + topbar)
│   │   ├── context/        # AuthContext (JWT auth state)
│   │   ├── services/       # api.js (Axios instance)
│   │   ├── styles/         # CSS files
│   │   └── App.jsx         # Router + ProtectedRoute
│   └── vite.config.js      # Dev server + API proxy
├── backend/
│   ├── app/
│   │   ├── routes/         # Flask blueprints
│   │   ├── models/         # SQLAlchemy models
│   │   ├── ml/             # Machine learning code
│   │   └── database/       # DB init and connection
│   ├── trained_models/     # Saved ML model files (.pkl)
│   ├── init_db.py          # Database initialization script
│   └── run.py              # Flask app entry point
└── GUIDE.md                # This file

---

Built with React, Flask, and scikit-learn - FleetAI Smart Transportation Platform
