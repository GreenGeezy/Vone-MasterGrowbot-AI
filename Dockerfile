# Step 1: Build the React application
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Serve the application
FROM node:20-slim
WORKDIR /app
# Install a simple HTTP server
RUN npm install -g serve
# Copy the built files from the previous step
COPY --from=builder /app/dist ./dist
# Expose the port Cloud Run expects
EXPOSE 8080
# Start the server on port 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
