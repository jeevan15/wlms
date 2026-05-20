# Stage 1: Build the React frontend
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:22-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev
COPY server/ ./

# Copy built frontend into position so Express can serve it
COPY --from=client-builder /app/client/dist ../client/dist

RUN mkdir -p /var/data

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

# Seed the database on first run, then start the server
CMD ["/bin/sh", "-c", "node seed.js && node index.js"]
