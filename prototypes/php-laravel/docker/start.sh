#!/bin/sh
# Startskript aller php-laravel-Container. Im Produktionsbetrieb werden
# Konfiguration, Routen und Events vorab gecacht, wie es die
# Deployment-Dokumentation von Laravel vorsieht (DECISIONS.md 5.5). Das
# geschieht beim Start statt beim Image-Build, weil die Umgebungsvariablen
# (prototypes/php-laravel/.env per env_file) erst zur Laufzeit vorliegen.
# Ein View-Cache entfällt: Der Prototyp hat keine Views.
set -e
if [ "${APP_ENV}" = "production" ]; then
  php artisan config:cache --no-interaction
  php artisan route:cache --no-interaction
  php artisan event:cache --no-interaction
else
  php artisan config:clear --no-interaction
  php artisan route:clear --no-interaction
  php artisan event:clear --no-interaction
fi
exec "$@"
