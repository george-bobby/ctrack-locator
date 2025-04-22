# C-Track Locator API

This directory contains the backend API for the C-Track Locator application.

## Files

- `server.py` - Main Flask application
- `wsgi.py` - WSGI entry point for Gunicorn
- `convert_to_tflite.py` - Script to convert the H5 model to TensorFlow Lite format
- `prepare_model.py` - Script to prepare the model for deployment
- `model.h5` - Original TensorFlow model
- `requirements.txt` - Python dependencies
- `Procfile` - Procfile for deployment
- `render.yaml` - Configuration for Render deployment
- `runtime.txt` - Python version specification
- `build.sh` - Build script for deployment

## Deployment

To deploy this API:

1. Make sure you have the `model.h5` file in this directory
2. Run `python prepare_model.py` to convert the model to TensorFlow Lite format
3. Deploy to Render using the configuration in `render.yaml`

## Local Development

To run the API locally:

1. Install dependencies: `pip install -r requirements.txt`
2. Run the conversion script: `python prepare_model.py`
3. Start the server: `python server.py`

The API will be available at http://localhost:8080
