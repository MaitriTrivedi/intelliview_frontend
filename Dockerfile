FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY intelliview-frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY intelliview-frontend/ ./

# Set environment variables
ENV REACT_APP_API_URL=http://localhost:8000/api
ENV REACT_APP_LLM_SERVICE_URL=http://localhost:8000/api/llm

# Expose port
EXPOSE 3000

# Start the React app
CMD ["npm", "start"] 