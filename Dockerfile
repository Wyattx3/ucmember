# Production Dockerfile for React App
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build production app
RUN npm run build:prod

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add security headers
RUN echo 'server { \
  listen 80; \
  server_name _; \
  root /usr/share/nginx/html; \
  index index.html; \
  \
  # Security headers \
  add_header X-Frame-Options DENY; \
  add_header X-Content-Type-Options nosniff; \
  add_header X-XSS-Protection "1; mode=block"; \
  add_header Referrer-Policy "strict-origin-when-cross-origin"; \
  \
  # Caching \
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ { \
    expires 1y; \
    add_header Cache-Control "public, immutable"; \
  } \
  \
  # SPA routing \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"] 