# Use Alpine-based Node.js for minimal image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies for native modules (sqlite3 requires build tools)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application files
COPY . .

# Create database directory
RUN mkdir -p /app/database

# Set environment to production
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3001

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Start the application
CMD ["node", "index.js"]
