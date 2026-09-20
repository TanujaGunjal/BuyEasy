# ── Stage: production image ─────────────────────────────────────────────────
# Node 20 LTS alpine keeps the image small (~180 MB vs ~1 GB full image).
# We only copy backend/ — frontend is served by Vercel.
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy only the backend source tree
COPY backend/ ./backend/

# Cloud Run injects PORT at runtime. Default to 8080 (Cloud Run standard).
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["node", "backend/server.js"]
