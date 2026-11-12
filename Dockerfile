FROM eclipse-temurin:21-jdk AS backend-build
WORKDIR /build
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
COPY src/main/ src/main/
RUN sh ./mvnw -B -DskipTests package

FROM eclipse-temurin:21-jre AS backend
WORKDIR /app
COPY --from=backend-build /build/target/plantplan-*.jar ./plantplan.jar
ENTRYPOINT ["java", "-jar", "/app/plantplan.jar"]

FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/index.html frontend/vite.config.js ./
COPY frontend/public/ public/
COPY frontend/src/ src/
RUN npm run build

FROM nginx:stable-alpine AS frontend
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build /build/dist/ /usr/share/nginx/html/
