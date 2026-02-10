# Build
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json /app/package.json
RUN npm install
COPY public /app/public
COPY src /app/src
COPY tsconfig.json /app/tsconfig.json
COPY webpack.config.js /app/webpack.config.js
RUN npm run build

# Serve
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
