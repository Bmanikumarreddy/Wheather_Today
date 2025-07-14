from flask import Flask, request, jsonify
import requests
import numpy as np
import pandas as pd
import datetime
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
from sklearn.preprocessing import MinMaxScaler
from flask_cors import CORS

app = Flask(__name__)  # Initialize Flask app
CORS(app)  # Enable CORS

API_KEY = "e26b22aca359183e9666ee3e386b6b36"

# Global cache for models
model_cache = {}

def fetch_weather_data(city=None, lat=None, lon=None):
    """Fetch weather data from OpenWeather API."""
    try:
        if city:
            url = f"http://api.openweathermap.org/data/2.5/forecast?q={city}&appid={API_KEY}&units=metric"
        elif lat and lon:
            url = f"http://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
        else:
            return None

        response = requests.get(url).json()
        if response.get("cod") != "200":
            return None

        df = pd.DataFrame({
            "Date": [entry['dt_txt'] for entry in response['list']],
            "Temperature": [entry['main']['temp'] for entry in response['list']]
        })
        df["Date"] = pd.to_datetime(df["Date"])
        df.set_index("Date", inplace=True)
        return df
    except Exception as e:
        app.logger.error(f"Error fetching weather data: {e}")
        return None

def train_lstm(df):
    """Train LSTM model on weather data."""
    try:
        scaler = MinMaxScaler(feature_range=(-1, 1))
        df_scaled = scaler.fit_transform(df)

        def create_sequences(data, seq_length):
            X, y = [], []
            for i in range(len(data) - seq_length):
                X.append(data[i:i + seq_length])
                y.append(data[i + seq_length])
            return np.array(X), np.array(y)

        seq_length = 10
        X, y = create_sequences(df_scaled, seq_length)

        model = Sequential([
            Input(shape=(seq_length, 1)),  # Proper input definition
            LSTM(128, return_sequences=True),
            Dropout(0.2),
            LSTM(64, return_sequences=True),
            Dropout(0.2),
            LSTM(32, return_sequences=False),
            Dense(64, activation='relu'),
            Dense(32, activation='relu'),
            Dense(1)
        ])

        model.compile(optimizer='adam', loss='mae')
        model.fit(X, y, epochs=50, batch_size=8, verbose=0)

        return model, scaler
    except Exception as e:
        app.logger.error(f"Error training LSTM model: {e}")
        return None, None

@app.route("/predict", methods=["POST"])
def predict():
    """Predict future temperatures using LSTM model."""
    try:
        data = request.json
        city, lat, lon = data.get("city"), data.get("lat"), data.get("lon")

        if not city and (not lat or not lon):
            return jsonify({"error": "Please provide city name or latitude/longitude"}), 400

        df = fetch_weather_data(city, lat, lon)
        if df is None:
            return jsonify({"error": "Location not found!"}), 404

        location_key = city or f"{lat},{lon}"
        if location_key in model_cache:
            model, scaler = model_cache[location_key]
        else:
            model, scaler = train_lstm(df)
            if model is None:
                return jsonify({"error": "Model training failed!"}), 500
            model_cache[location_key] = (model, scaler)

        # Ensure prediction starts from the next day
        today = datetime.datetime.today().date()
        tomorrow = today + datetime.timedelta(days=1)
        start_date = pd.Timestamp(tomorrow)

        # Prepare input for prediction
        X_input = scaler.transform(df)[-10:].reshape(1, 10, 1)

        # Predict for the next 16 time steps (2 days)
        future_predictions = []
        future_dates = [start_date + pd.Timedelta(hours=i * 3) for i in range(16)]

        for _ in range(16):
            pred_temp = model.predict(X_input)[0][0]  # Get prediction
            future_predictions.append(pred_temp)

            # Update input sequence (shift left and append new value)
            X_input = np.roll(X_input, shift=-1, axis=1)
            X_input[0, -1, 0] = pred_temp  # Add new prediction

        # Convert predictions back to original scale
        future_predictions = scaler.inverse_transform(np.array(future_predictions).reshape(-1, 1))

        # Prepare response
        results = [{"date": str(future_dates[i]), "temp": float(future_predictions[i][0])} for i in range(16)]

        return jsonify({"predictions": results})
    except Exception as e:
        app.logger.error(f"Error during prediction: {e}")
        return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(debug=True) 