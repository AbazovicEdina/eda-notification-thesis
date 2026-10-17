# Abbildungen für die schriftliche Arbeit (tools/figures/README.md).
# Python nur in diesem Container; die Messwerkzeuge bleiben Node.js.
FROM python:3.12-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY figures.py .
ENTRYPOINT ["python", "figures.py"]
