# Stage 1: Build React files
FROM node:20-alpine AS build

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install packages
RUN npm ci

# Copy code
COPY . .

# Set dev env args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build application
RUN npm run build

# Stage 2: Serve React via Nginx
FROM nginx:alpine

# Copy static resources
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx conf to handle SPA routing redirect to index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
