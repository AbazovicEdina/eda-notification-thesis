# Figures for the written thesis (tools/figures/README.md).
# Python only in this container, the measurement tools stay Node.js.
FROM python:3.12-slim@sha256:a6e34c598f2467ed0e9a8d349809fcd8b5c603269512df273a0bb1784edc11b1
# Latin Modern, the font of the HagenbergThesis template (lmodern), in a fixed version.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fonts-lmodern=2.005-1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Latin Modern as TrueType, so that the PDFs contain correctly declared fonts.
COPY otf2ttf.py .
RUN python otf2ttf.py /usr/local/share/fonts/lm-ttf \
    /usr/share/texmf/fonts/opentype/public/lm/lmroman8-regular.otf \
    /usr/share/texmf/fonts/opentype/public/lm/lmroman9-regular.otf \
    /usr/share/texmf/fonts/opentype/public/lm/lmroman10-regular.otf
COPY figures.py .
ENTRYPOINT ["python", "figures.py"]
