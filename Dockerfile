FROM node:18-alpine as build

WORKDIR /app

# Copy package files from the correct location
COPY intelliview-frontend/package*.json ./

# Install dependencies with specific flags to handle React and Jest
RUN npm install \
    --legacy-peer-deps \
    --no-audit \
    --no-package-lock \
    --no-optional \
    --production=false

# Copy project files from the correct location
COPY intelliview-frontend/ ./

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