FROM node:20-alpine

WORKDIR /app

# Copy dependency files
COPY package*.json ./

# Install packages
RUN npm ci --only=production

# Copy source
COPY src/ ./src/
COPY database/ ./database/

# Expose port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

# Default start command
CMD ["node", "src/index.js"]
