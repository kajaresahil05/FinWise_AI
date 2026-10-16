FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5173

# Vite needs to run with the --host flag to receive requests from outside the container
CMD ["npm", "run", "dev", "--", "--host"]
