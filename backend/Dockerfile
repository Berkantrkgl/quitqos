FROM eclipse-temurin:21-jdk-alpine AS build

WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -q dependency:go-offline

COPY src/ src/
RUN ./mvnw -q package -DskipTests

FROM eclipse-temurin:21-jre-alpine

RUN apk add --no-cache curl

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://localhost:8080/api/v1/leaderboard/summary || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
