# AI-Based Smart Transportation and Fleet Management Platform

**Live Vehicle Tracking, Driver Behavior Analysis, Fuel Optimization and Accident Prediction**

A comprehensive AI-powered fleet management system that transforms raw transportation data into meaningful insights for fleet administrators.

---

## 🎯 Project Overview

This platform provides centralized fleet management capabilities including:

- **Live Vehicle Tracking**: Real-time GPS monitoring with interactive maps
- **Driver Behavior Analysis**: AI-powered analysis of driving patterns
- **Accident Risk Prediction**: Machine learning models for predictive safety
- **Fuel Optimization**: Consumption analysis and efficiency metrics
- **Fleet Analytics**: Comprehensive dashboards and performance metrics
- **Centralized Management**: Single platform for all fleet operations

---

## 🚀 Features

### Core Capabilities

- **Dashboard**: Real-time KPIs, fleet overview, and quick actions
- **Vehicle Management**: Complete vehicle lifecycle management
- **Driver Management**: Driver profiles, behavior tracking, and performance metrics
- **Live Tracking**: Interactive map with vehicle locations and status
- **Driver Behavior**: Speed, acceleration, braking analysis with charts
- **Risk Prediction**: ML-powered accident risk assessment
- **Fuel Analytics**: Consumption trends, efficiency analysis, cost tracking
- **Reports**: Generate comprehensive fleet performance reports
- **Settings**: System configuration, risk thresholds, notifications

### AI/ML Features

- **Random Forest Model**: Persisted route-anomaly classifier; current holdout accuracy is reported in the risk screen
- **Behavior Analysis**: Automatic classification of driving patterns
- **Risk Scoring**: Dynamic risk level calculation (LOW/MEDIUM/HIGH)
- **Contributing Factors**: AI-identified risk contributors
- **Fallback System**: Rule-based prediction when ML model unavailable

---

## 🛠 Technology Stack

### Frontend
- **React.js** - UI Framework
- **Vite** - Build Tool
- **JavaScript** - Language
- **DaisyUI** - UI Component Library
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Axios** - HTTP Client
- **Recharts** - Data Visualization
- **Leaflet** - Maps
- **React Leaflet** - React Map Components

### Backend
- **Python 3.12** - Language
- **Flask** - REST API Framework
- **Flask-CORS** - Cross-Origin Support
- **Flask-JWT-Extended** - Authentication
- **SQLAlchemy** - ORM
- **Flask-SQLAlchemy** - Flask Integration
- **Pandas** - Data Processing
- **Werkzeug** - WSGI Utilities

### AI/ML
- **Scikit-learn** - Machine Learning Library
- **Random Forest** - Classification Model
- **Logistic Regression** - Alternative Model
- **Joblib** - Model Serialization
- **NumPy** - Numerical Computing

### Database
- **SQLite** - Database
- **SQLAlchemy ORM** - Database Interface

### Maps
- **Leaflet** - Open-Source Maps
- **OpenStreetMap** - Map Tiles (Free, No API Key Required)

---

## 📁 Project Structure

```
AI-Based Smart Transportation/
├── backend/
│   ├── app/
│   │   ├── config/          # Configuration files
│   │   ├── database/        # Database setup
│   │   ├── ml/              # ML models and preprocessing
│   │   │   ├── models.py    # ML model classes
│   │   │   ├── preprocessing.py  # Data preprocessing
│   │   │   └── prediction.py    # Prediction service
│   │   ├── models/          # Database models
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   └── utils/           # Utility functions
│   ├── datasets/            # Sample CSV data
│   ├── trained_models/      # Saved ML models
│   ├── tests/               # Backend tests
│   ├── requirements.txt     # Python dependencies
│   ├── run.py              # Flask server entry point
│   ├── init_db.py          # Database initialization
│   ├── import_data.py      # CSV data import
│   ├── update_sample_data.py  # Update sample data
│   └── train_models.py     # ML model training
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── layouts/         # Layout components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   ├── utils/           # Utility functions
│   │   ├── context/         # React context
│   │   ├── assets/          # Static assets
│   │   ├── charts/          # Chart components
│   │   └── maps/            # Map components
│   ├── public/              # Public assets
│   ├── package.json         # Node dependencies
│   ├── vite.config.js       # Vite configuration
│   ├── tailwind.config.js   # Tailwind configuration
│   └── postcss.config.js    # PostCSS configuration
└── README.md                # This file
```

---

## 🎨 Color System

The application uses a professional dark technology theme:

- **Deep Navy**: `#07111F` - Background
- **Navy Blue**: `#0B1F33` - Cards and panels
- **Electric Blue**: `#1677FF` - Primary actions
- **Cyan**: `#00C2FF` - Secondary accents
- **Teal**: `#00D4A8` - Success states
- **White**: `#F8FAFC` - Text
- **Muted Gray**: `#94A3B8` - Secondary text
- **Warning Amber**: `#F59E0B` - Warnings
- **Danger Red**: `#EF4444` - Errors/High Risk
- **Success Green**: `#22C55E` - Success/Low Risk

---

## 📦 Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **Python 3.12**
- **npm** or **yarn**

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**
   
   **Windows:**
   ```bash
   venv\Scripts\activate
   ```
   
   **Linux/Mac:**
   ```bash
   source venv/bin/activate
   ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Create environment file**
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` if needed (default values work for development)

6. **Initialize database**
   ```bash
   python init_db.py
   ```

7. **Import sample data**
   ```bash
   python import_data.py
   ```

8. **Train ML model**
   ```bash
   python train_models.py
   ```

9. **Start Flask server**
   ```bash
   python run.py
   ```
   
   Server runs on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   
   Server runs on `http://localhost:5174`

---

## 🔐 Default Credentials

**Username:** `admin`  
**Password:** `admin123`

---

## 📊 Database Schema

### Tables

- **users** - System users and authentication
- **vehicles** - Fleet vehicle information
- **drivers** - Driver profiles and details
- **journeys** - Trip/journey records
- **gps_records** - GPS location data
- **fuel_records** - Fuel consumption data
- **driver_behavior** - Driving behavior events
- **risk_predictions** - ML risk predictions
- **csv_imports** - CSV import history

### Relationships

```
User
  ↓
Vehicle → Driver
  ↓       ↓
Journey → GPS Records
  ↓
Fuel Records
  ↓
Driver Behavior → Risk Prediction
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### Vehicles
- `GET /api/vehicles` - List all vehicles
- `GET /api/vehicles/:id` - Get vehicle details
- `POST /api/vehicles` - Create vehicle
- `PUT /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Drivers
- `GET /api/drivers` - List all drivers
- `GET /api/drivers/:id` - Get driver details
- `POST /api/drivers` - Create driver
- `PUT /api/drivers/:id` - Update driver
- `DELETE /api/drivers/:id` - Delete driver

### Tracking
- `GET /api/tracking` - Get all tracking data
- `GET /api/tracking/:vehicle_id` - Get vehicle tracking

### Dashboard
- `GET /api/dashboard/summary` - Dashboard KPIs

### Fuel
- `GET /api/fuel` - List fuel records
- `GET /api/fuel/analytics` - Fuel analytics

### Risk Prediction
- `POST /api/risk/predict` - Predict accident risk
- `GET /api/risk/history` - Risk prediction history

### CSV Import
- `POST /api/import/csv` - Import CSV data

---

## Machine Learning

The accident-risk screen loads a persisted Random Forest classifier and preprocessor from `backend/trained_models/`. Retrain them from the backend directory with `python train_models.py`, then restart the Flask server to load the new model.

Training uses the 120,000 labeled rows in `driver_behavior_route_anomaly_dataset_with_derived_features.csv`. The target is the observed `route_anomaly` label; the trainer holds out 20% of rows for evaluation and writes `training_metadata.pkl` with the source, row count, and metrics. Risk predictions use speed, acceleration, braking, harsh-event flags, and speeding. The UI shows the current holdout accuracy.

The supplied vehicles, drivers, GPS, journeys, and fuel CSVs do not contain accident or route-anomaly outcome labels. They support fleet operations and dashboards, but should not be presented as labeled accident-training examples. With the current supplied data, the trained model's holdout accuracy is about 68%; this is a route-anomaly signal, not a validated real-world accident forecast. Add reviewed incident outcomes before using it for safety decisions.

The model reports an anomaly probability and groups it into LOW (<35%), MEDIUM (35–64%), or HIGH (65%+). If the saved model is unavailable, the API uses a rule-based fallback.

---

## 📈 Screenshots

### Landing Page
- Modern hero section with animated elements
- Feature highlights
- Call-to-action buttons

### Dashboard
- Real-time KPI cards
- Quick actions
- Recent activity feed
- CSV import functionality

### Vehicle Tracking
- Interactive Leaflet map
- Vehicle markers with status
- Real-time location updates
- Vehicle information panels

### Driver Behavior
- Behavior analysis charts
- Risk score visualization
- Radar charts for patterns
- Performance metrics

### Risk Prediction
- ML-powered predictions
- Risk probability display
- Contributing factors
- Prediction history

### Fuel Analytics
- Consumption charts
- Efficiency trends
- Cost analysis
- Vehicle comparison

---

## 🚀 Running the Application

### Start Both Servers

From the project root, after installing the root npm dependencies, both servers can be started with one command:

```bash
npm install
npm run dev
```

This starts the frontend at `http://localhost:5174` and the backend at `http://localhost:5000`.

### Real-World Operating Model

This project is a fleet supervisor decision-support system. It uses imported vehicle, GPS, journey, driver-behavior, and fuel records to answer four operational questions:

1. Which vehicles have a current, stale, or historical location feed?
2. Which driver behaviors require coaching or a pre-dispatch review?
3. Which vehicles or journeys show poor fuel efficiency?
4. What action should a fleet manager take next?

The current ML model identifies behavior and route anomalies from available historical data. It should be presented as an early-warning signal, not as a guaranteed accident prediction. True live tracking requires an IoT/GPS ingestion service that continuously writes fresh records; the current CSV workflow is suitable for historical analysis and demonstration.

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate  # Windows
python run.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:5174
- **Backend API**: http://localhost:5000
- **Default Login**: admin / admin123

---

## 📝 Development Commands

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Initialize database
python init_db.py

# Import sample data
python import_data.py

# Update sample data
python update_sample_data.py

# Train ML model
python train_models.py

# Run server
python run.py
```

### Frontend
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🧪 Testing

### Backend Tests
```bash
cd backend
python -m pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
DATABASE_URL=sqlite:///fleet_management.db
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
FLASK_ENV=development
FRONTEND_URL=http://localhost:5174
```

### Risk Thresholds

Configurable in Settings page:
- High Risk Threshold: 70%
- Medium Risk Threshold: 50%
- Speed Limit: 80 km/h
- Harsh Braking Threshold: 3.0 m/s²

---

## 🎯 Future Scope

- [ ] Real-time WebSocket integration for live updates
- [ ] Mobile application (React Native)
- [ ] Advanced ML models (LSTM, Deep Learning)
- [ ] Predictive maintenance
- [ ] Route optimization
- [ ] Weather integration
- [ ] Traffic analysis
- [ ] Multi-tenant support
- [ ] Advanced reporting with PDF export
- [ ] Integration with external GPS providers
- [ ] IoT sensor integration
- [ ] Fleet scheduling automation

---

## 📄 License

This is a Final Year Engineering Project for academic purposes.

---

## 👥 Team

**Project Title:** AI-Based Smart Transportation and Fleet Management Platform

**Subtitle:** Live Vehicle Tracking, Driver Behavior Analysis, Fuel Optimization and Accident Prediction

---

## 🙏 Acknowledgments

- OpenStreetMap for free map tiles
- Leaflet for open-source mapping library
- DaisyUI for UI components
- Scikit-learn for ML algorithms
- React and Python communities

---

## 📞 Support

For issues or questions, please refer to the project documentation or contact the development team.

---

**Built with ❤️ for Final Year Engineering Project**
