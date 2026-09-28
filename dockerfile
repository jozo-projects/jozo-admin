# Build stage
FROM node:20 AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --include=dev --legacy-peer-deps

COPY . .

ARG ENV_FILE=.env.develop
COPY ${ENV_FILE} .env

RUN npm run build -- --mode $(echo ${ENV_FILE} | cut -d. -f3)

# Production stage - serve bằng vite preview
FROM node:20

WORKDIR /app

# Gán biến để Vite whitelist host header
ENV __VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=admin.jozo.com.vn

# Copy dist và cài vite
COPY --from=build /app/dist ./dist
RUN npm install -g vite

EXPOSE 3002

# Khởi chạy Vite Preview với host và port rõ ràng
CMD ["vite", "preview", "--host", "0.0.0.0", "--port", "3002"]
