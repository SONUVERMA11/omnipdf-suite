# ─── OmniPDF Backend — Production Dockerfile ─────────────────────────────────
# Multi-stage build for minimal image size on Render.com free tier
#
# Stage 1: Install dependencies
# Stage 2: Production image with LibreOffice + Node.js

# ─── Stage 1: Dependencies ───────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-slim AS production

# Install LibreOffice Headless + required fonts
# This is the core dependency for Office → PDF conversion
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-writer \
    libreoffice-calc \
    libreoffice-impress \
    libreoffice-common \
    fonts-liberation \
    fonts-dejavu-core \
    fonts-noto-core \
    fontconfig \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Rebuild font cache
RUN fc-cache -f -v

# Set working directory
WORKDIR /app

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create temp directory for file processing
RUN mkdir -p /app/tmp && chmod 777 /app/tmp

# Non-root user for security
RUN groupadd -r omnipdf && useradd -r -g omnipdf omnipdf
RUN chown -R omnipdf:omnipdf /app
USER omnipdf

# Environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD node -e "const http=require('http');http.get('http://localhost:3001/api/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

# Start server
CMD ["node", "server.js"]
