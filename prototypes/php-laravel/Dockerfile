# Ein Image für alle vier php-laravel-*-Prozesse (fpm, reverb, listener,
# queue-worker) — sie teilen sich denselben Anwendungscode, nur der Startbefehl
# unterscheidet sich (siehe docker-compose.yml, command:-Override je Service).
FROM php:8.4-fpm-alpine
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis-6.3.0 \
    && docker-php-ext-enable redis \
    && docker-php-ext-install pcntl \
    && apk del .build-deps

COPY --from=composer:2.8 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY composer.json composer.lock ./
# --no-scripts: artisan-Hooks (key:generate, migrate) brauchen eine echte
# Laufzeitumgebung (Redis, .env) und laufen stattdessen beim Start (siehe
# docker-compose.yml command:), nicht beim Image-Build.
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist --optimize-autoloader
COPY . .
# package:discover neu erzeugen: der lokal (mit require-dev, z.B. laravel/pail)
# generierte Cache wurde per .dockerignore ausgeschlossen, weil er sonst auf
# Provider-Klassen verweist, die im --no-dev-Vendor-Stand des Images fehlen.
RUN php artisan package:discover --no-interaction
# storage/ und bootstrap/cache/ müssen für den php-fpm-Worker (www-data)
# beschreibbar sein (Logs, File-Cache) — COPY legt alles root-owned an.
RUN chown -R www-data:www-data storage bootstrap/cache

COPY fpm-pool.conf /usr/local/etc/php-fpm.d/zz-pool.conf

EXPOSE 9000 8080
CMD ["php-fpm"]
