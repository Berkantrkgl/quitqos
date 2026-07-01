# QuitQOS

QuitQOS is a mobile app that helps users quit IQOS. It offers a quit counter (streak),
science-based motivation notifications, health stats, a badge collection, and a streak
leaderboard. Registration is optional — login exists only for data sync and the leaderboard.

## Repository layout

| Path | What |
|------|------|
| `backend/` | Spring Boot 4.1 · Java 21 · PostgreSQL · Spring Security (JWT) · Firebase Auth + FCM |
| `mobile/` | React Native + Expo (iOS & Android) |
| `docs/` | Source-of-truth design docs — API contract, ERD, user journeys, project brief |

See [`CLAUDE.md`](./CLAUDE.md) for the full domain model, architecture decisions, and build order.

## Getting started

### Backend

```bash
docker compose up -d                 # Postgres on localhost:5434
cd backend && ./mvnw spring-boot:run # app on http://localhost:8080
```

### Mobile

```bash
cd mobile
npm install
npx expo start
```

## Docs

- [`docs/quitqos_api_design.md`](./docs/quitqos_api_design.md) — full API contract (canonical)
- `docs/quitqos_ERD.pdf` — entity relationship diagram
- `docs/quitqos_user_journeys.pdf` — guest / registered / upgrade flows
- `docs/iqos_quit_brief.pdf` — project brief (features, user stories, milestones)
