#!/bin/sh
# Start script of all php-laravel containers. In production mode the
# configuration, routes and events are cached in advance, as the Laravel
# deployment documentation recommends (DECISIONS.md 5.5). This happens at
# start instead of during the image build, because the environment
# variables (prototypes/php-laravel/.env via env_file) are only available at
# runtime. There is no view cache, because the prototype has no views.
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
