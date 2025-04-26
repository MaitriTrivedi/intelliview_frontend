# Step 1: Build with Node.js
FROM node:18 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Step 2: Serve with nginx
FROM nginx:alpine

# Copy from the build stage, using the correct build output directory
# COPY --from=build /app/dist /usr/share/nginx/html
# If using Create React App (not Vite), use:
COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]