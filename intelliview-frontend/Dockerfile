# Step 1: Build with Node.js
FROM node:18-alpine AS build

# Set environment variables
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV CI=true
ENV DISABLE_ESLINT_PLUGIN=true
ENV NODE_ENV=production
# Add this to treat warnings as warnings, not errors
ENV ESLINT_NO_DEV_ERRORS=true

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-optional

# Copy source files
COPY . .

# Build the application with explicit memory allocation
RUN npm run build

# Step 2: Serve with nginx
FROM nginx:alpine

# Create nginx user
RUN adduser -D -H -u 1001 -s /sbin/nologin nginx-user

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Set proper permissions
RUN chown -R nginx-user:nginx-user /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    chown -R nginx-user:nginx-user /var/cache/nginx && \
    chown -R nginx-user:nginx-user /var/log/nginx && \
    chown -R nginx-user:nginx-user /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx-user:nginx-user /var/run/nginx.pid

USER nginx-user

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]