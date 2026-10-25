#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$API_DIR"
./mvnw -q -DskipTests package
java -jar target/school-management-api-0.1.0-SNAPSHOT.jar \
  --spring.profiles.active=demo-seed \
  --spring.main.web-application-type=none \
  --app.demo-data.enabled=false \
  --app.demo-data.full-seed-enabled=true \
  --app.demo-data.target=demo
