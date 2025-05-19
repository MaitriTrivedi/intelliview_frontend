FROM node:18-alpine as build

WORKDIR /app

# First copy package.json
COPY intelliview-frontend/package.json package.json

# Install dependencies with specific flags to handle React and Jest
RUN npm install \
    --legacy-peer-deps \
    --no-audit \
    --no-optional \
    --production=false

# Copy source code
COPY intelliview-frontend/src/ ./src/
COPY intelliview-frontend/public/ ./public/

# Copy config files if they exist
RUN mkdir -p /app/config
COPY intelliview-frontend/.env* intelliview-frontend/*.config.js /app/config/
RUN cp -n /app/config/* /app/ 2>/dev/null || true

# Build the app with environment variables
ENV CI=true
ENV DISABLE_ESLINT_PLUGIN=true
RUN npm run build

# Use nginx to serve the built app
FROM nginx:alpine

# Copy the build output to nginx
COPY --from=build /app/build /usr/share/nginx/html

# Copy nginx configuration if needed
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 