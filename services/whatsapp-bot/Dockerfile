# Multi-Architecture Dockerfile for Mai WhatsApp Microservice
# Optimized for Oracle Cloud Always Free Ampere A1 (ARM64) and standard x86_64 (AMD64).

FROM node:20-bookworm-slim

# Install system dependencies, Chromium, and rendering fonts for headless browser
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    ca-certificates \
    dumb-init \
    && rm -rf /var/lib/apt/lists/*

# Explicitly configure Puppeteer to use the verified system Chromium binary
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

# VERIFICATION GATE: Fail build immediately if Chromium is missing or not executable
RUN test -x /usr/bin/chromium || (echo "ERROR: /usr/bin/chromium is not executable!" && exit 1)

WORKDIR /app

# Copy dependency manifests first for build cache optimization
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Prepare persistent LocalAuth data directory and set secure ownership
RUN mkdir -p /app/.wwebjs_auth && chown -R node:node /app

# Switch to unprivileged node user
USER node

# Expose microservice HTTP port
EXPOSE 3001

# Use dumb-init as PID 1 to properly handle signals and reap zombie browser processes
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "src/index.js"]
