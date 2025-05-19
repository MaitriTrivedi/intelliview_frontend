FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY intelliview-frontend/package*.json ./

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps --no-audit

# Copy project files
COPY intelliview-frontend/ ./

# Build the app
RUN npm run build

# Use nginx to serve the built app
FROM nginx:alpine

# Copy the build output to nginx
COPY --from=0 /app/build /usr/share/nginx/html

# Copy nginx configuration if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 