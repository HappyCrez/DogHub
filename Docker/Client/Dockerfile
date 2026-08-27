# --- build frontend ---
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom

COPY . .
RUN npm run build   # Vite билдит в /app/dist

# --- runtime + nginx ---
FROM nginx:alpine

# статика фронта
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]
