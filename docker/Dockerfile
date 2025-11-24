# Use Node.js LTS with Playwright dependencies (matching package.json version)
FROM mcr.microsoft.com/playwright:v1.56.1-jammy

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Expose port for API server
EXPOSE 3000

# Health check to ensure the container is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Run the API server
CMD ["node", "src/api/index.js"]
