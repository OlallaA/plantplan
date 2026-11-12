# PlantPlan

PlantPlan is a web app for managing seeds, seedlings, and crops in a home garden. It is **in active development** and the setup below is intended for local use. The interface is available in Galician and Spanish.

## What works today

- Browse a crop catalog with a seasonal calendar for Galicia.
- Keep a seed bank and crop records. Sow seeds, track seedling batches, transplant to a garden, and adjust quantities to account for losses.
- View today’s weather on the dashboard and a seven-day Open-Meteo forecast for gardens with coordinates. Garden illustrations reflect the current weather and daylight.
- Sign in to access your own inventory and gardens.

Dashboard reminders currently use sample data. The Spring Boot API already supports generating, listing, and completing actual reminders.

PlantPlan uses React, Vite, and Tailwind CSS on the frontend, with Java 21, Spring Boot, and MySQL on the backend.

## Get the project

Use a GitHub account with access to the repository to clone it.

```sh
git clone https://github.com/OlallaA/plantplan.git
cd plantplan
```

## Run with Docker Compose

Install [Docker Desktop](https://docs.docker.com/desktop/) on Windows or macOS, or [Docker Engine with the Compose plugin](https://docs.docker.com/compose/install/linux/) on Linux. Start Docker and run `docker version` to check that the client can reach the server.

### 1. Set up local credentials

Copy `.env.example` to `.env` in the repository root. Use `Copy-Item .env.example .env` in PowerShell or `cp .env.example .env` in Bash. Open `.env` and set the following values.

- Use separate passwords for `MYSQL_ROOT_PASSWORD` and `MYSQL_PASSWORD`.
- Generate a Base64-encoded 32-byte signing key with the command below and use its output as `PLANTPLAN_JWT_SECRET`.
- Leave `PLANTPLAN_PORT` at `5173` or choose a free port, such as `5174` if Vite is already running.

```sh
docker run --rm mysql:8.4 sh -c 'head -c 32 /dev/urandom | base64'
```

### 2. Start PlantPlan

```sh
docker compose up -d --build --wait
docker compose ps
```

On the first run, Docker downloads images and dependencies. MySQL initializes the database, Spring Boot creates the tables and loads the crop catalog, and Nginx serves the frontend and forwards `/api` requests.

Open [PlantPlan](http://127.0.0.1:5173/) and check that the [health endpoint](http://127.0.0.1:5173/api/health) returns JSON containing `"status":"OK"`. If you set another port in `.env`, use it in both URLs.

### 3. Load demo data

Install [PowerShell 7](https://learn.microsoft.com/powershell/scripting/install/installing-powershell) to run the demo script on Windows, macOS, or Linux. From the repository root, run the following command, using the port you selected.

```sh
pwsh -NoProfile -File ./scripts/seed-demo.ps1 -BaseUrl http://127.0.0.1:5173
```

The script prints the demo credentials. In the web app, choose **O meu espazo → Iniciar sesión** and sign in as `demo.horta@example.test`. Try the seed bank, open the garden to see its forecast, and browse the public catalog under **Que plantar**.

### Stop, restart, or troubleshoot

```sh
docker compose down
docker compose up -d --build --wait
docker compose logs --tail=80 db backend frontend
```

The `mysql-data` volume stores data between runs. MySQL creates the database user when the volume is first initialized. If you later change `MYSQL_PASSWORD`, update the database user’s password in MySQL as well. The web app is published on the local address `127.0.0.1`.

## Manual setup for development

Use a **JDK 21** with `JAVA_HOME` configured, **Node.js 22.12 or later** with npm, and **MySQL 8**. An internet connection is needed to download dependencies and get live forecasts. PowerShell 7 is optional for loading demo data.

### 1. Prepare MySQL

Connect with a MySQL administrator account using `mysql -u root -p` or MySQL Workbench. Replace `YOUR_MYSQL_PASSWORD` with a password of your choice. If you already have a user with access to this database, use that user’s credentials in the next step.

```sql
CREATE DATABASE IF NOT EXISTS plantplan CHARACTER SET utf8mb4;
CREATE USER 'huerto_user'@'localhost' IDENTIFIED BY 'YOUR_MYSQL_PASSWORD';
GRANT ALL PRIVILEGES ON plantplan.* TO 'huerto_user'@'localhost';
```

### 2. Start the API

From the repository root, set the MySQL credentials and a JWT signing key. Adjust `SPRING_DATASOURCE_URL` if MySQL is listening on a different host or port.

**Windows with PowerShell 7.4 or later**

```powershell
$env:SPRING_DATASOURCE_URL = 'jdbc:mysql://localhost:3306/plantplan'
$env:SPRING_DATASOURCE_USERNAME = 'huerto_user'
$env:SPRING_DATASOURCE_PASSWORD = Read-Host 'MySQL password' -MaskInput
$env:PLANTPLAN_JWT_SECRET = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:SERVER_ADDRESS = '127.0.0.1'
.\mvnw.cmd spring-boot:run
```

**macOS or Linux with Bash and OpenSSL**

```bash
export SPRING_DATASOURCE_URL='jdbc:mysql://localhost:3306/plantplan'
export SPRING_DATASOURCE_USERNAME='huerto_user'
read -r -s -p 'MySQL password: ' SPRING_DATASOURCE_PASSWORD
export SPRING_DATASOURCE_PASSWORD
export PLANTPLAN_JWT_SECRET="$(openssl rand -base64 32)"
export SERVER_ADDRESS='127.0.0.1'
sh ./mvnw spring-boot:run
```

Keep this terminal open. Spring Boot creates the tables and loads the catalog. The [API health endpoint](http://127.0.0.1:8080/api/health) should return JSON containing `"status":"OK"`. If you generate a new signing key when restarting, sign in again.

### 3. Start the frontend

In a second terminal, from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open [PlantPlan](http://127.0.0.1:5173/). Vite serves the frontend on port 5173 and forwards API requests to Spring Boot on port 8080.

### 4. Load demo data

With the API running, open a third terminal in the repository root and run:

```sh
pwsh -NoProfile -File ./scripts/seed-demo.ps1
```

Sign in using the credentials printed by the script. On a fresh installation, the demo gardens have coordinates so you can try the live forecast.

### Troubleshoot the manual setup

| Symptom | What to check |
| --- | --- |
| Spring Boot fails to start | Check that MySQL is running and that the password matches the database user. |
| The page loads, but the catalog or inventory does not | Check that [the API through Vite](http://127.0.0.1:5173/api/health) returns JSON. If it returns HTML, restart Vite from the `frontend` directory. |
| The dashboard shows sample data | Sign in with one of the demo accounts. The session is stored in the browser tab. |
| The forecast is unavailable | Check that the garden has coordinates and that Spring can reach Open-Meteo. |

## Tests

From the repository root, run `.\mvnw.cmd test` on Windows or `sh ./mvnw test` on macOS and Linux. Backend integration tests use an in-memory H2 database.

```sh
cd frontend
npm run lint
npm test
npm run build
```

See the [frontend notes in Spanish](frontend/README.md) for more detail on the interface and API routes.

## Author

Olalla Álvarez Troncoso. [GitHub](https://github.com/OlallaA) · [LinkedIn](https://linkedin.com/in/olalla-alvarez-troncoso)
