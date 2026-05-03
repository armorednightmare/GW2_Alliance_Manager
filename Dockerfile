FROM node:22-alpine

WORKDIR /app

# Install basic dependencies (openssl for NextAuth/Prisma migration phase)
RUN apk add --no-cache openssl openjdk21-jre

# Pre-install firebase-tools globally inside this specific container
RUN npm install -g firebase-tools

EXPOSE 3001
EXPOSE 4000
EXPOSE 8080
EXPOSE 9099

# The command will install project-specific dependencies and start both the emulator and Next.js
CMD ["sh", "-c", "npm install && firebase emulators:exec --project gw2-alliance-manager 'npm run dev'"]
