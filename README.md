# Nostradamus.AI

**Nostradamus.AI** is a futuristic weather prediction application that leverages Machine Learning (Random Forest) to forecast weather conditions and compare them against official meteorological data.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Active-green.svg)

## 🚀 Features

- **AI-Powered Predictions**: Uses `scikit-learn` (Random Forest) to train on 2 years of historical data and predict future 7-day weather trends.
- **Data Visualizations**: Interactive, comparison-based charts showing Historical Data vs. Official Forecast vs. AI Model using `recharts`.
- **Modern UI**: Fully responsive, "glassmorphism" design with animated backgrounds built with **React** and **Tailwind CSS v4**.
- **Real-time Comparison**: Evalute the accuracy of AI predictions against traditional synoptic forecasts.
- **Open-Meteo Integration**: Reliable, free data source for historical and forecast weather data.

## 🛠️ Tech Stack

### Backend
- **Framework**: Python / FastAPI
- **ML Engine**: Scikit-learn, Pandas, NumPy
- **Data Source**: Open-Meteo API

### Frontend
- **Framework**: React / Vite
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animations**: CSS / Framer Motion

## 📦 Installation & Setup

The project is structured as a monorepo with `backend` and `frontend` directories. You need to run both terminals.

### 1. Backend Setup

cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
# Note: Run this from the /backend directory
python -m uvicorn main:app --reload
```
API will be available at `http://localhost:8000`.

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run the development server
npm run dev
```
Application will be available at `http://localhost:5173`.

## 🧠 How It Works

1. **Dashboard**: Shows current weather metrics (temperature, etc.).
2. **Prediction**: Click "Generate AI Prediction".
3. **Training**: The backend fetches ~730 days of historical data for the location.
4. **Modeling**: A Random Forest Regressor trains on features like `hour`, `day_of_year`, and `lagged_temperature`.
5. **Inference**: The model predicts the next 7 days recursively.
6. **Result**: The violet chart line appears, showing the AI's perspective on the future weather.

## 📄 License

This project is licensed under the MIT License.
