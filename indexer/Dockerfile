FROM python:3.11-slim

WORKDIR /app

# System deps for librosa + audio processing
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    libffi-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download sentence-transformers model
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Pre-download fasttext language detection model
RUN python -c '\
import urllib.request, os; \
os.makedirs("/models", exist_ok=True); \
urllib.request.urlretrieve("https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin", "/models/lid.176.bin"); \
print("FastText model downloaded")'

COPY . .

ENV MODELS_DIR=/models
ENV PYTHONUNBUFFERED=1

CMD ["python", "main.py", "scan"]
