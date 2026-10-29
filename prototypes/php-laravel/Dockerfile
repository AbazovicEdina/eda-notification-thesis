# One image for all four php-laravel-* processes (fpm, reverb, listener,
# queue-worker). They share the same application code, only the start
# command differs (see docker-compose.yml, command override per service).
FROM php:8.5.11-fpm-alpine@sha256:fa01fb1645cd0fc566a5f146b099adace33b906571f972f71f2182a7c12d1cd7
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis-6.3.0 \
    && docker-php-ext-enable redis \
    && docker-php-ext-install pcntl \
    && apk del .build-deps
# Production configuration according to the documentation of the official
# image (DECISIONS.md 5.5). Without a php.ini the built-in development defaults would apply.
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY --from=composer:2.10.3@sha256:b6dcd72ca98fa19d0e5b8476de179859704891fad06dd9e0b96833d4c430a5fc /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY composer.json composer.lock ./
# --no-scripts: artisan hooks (key:generate, migrate) need a real runtime
# environment (Redis, .env) and run at start instead (see
# docker-compose.yml command:), not during the image build.
RUN composer install --no-dev --no-interaction --no-scripts --prefer-dist --optimize-autoloader
COPY . .
# Regenerate package:discover. The cache generated locally (with
# require-dev, e.g. laravel/pail) is excluded via .dockerignore, because it
# would point to provider classes missing in the --no-dev vendor state of the image.
RUN php artisan package:discover --no-interaction
# storage/ and bootstrap/cache/ must be writable for the php-fpm worker
# (www-data) for logs and file cache. COPY creates everything owned by root.
RUN chown -R www-data:www-data storage bootstrap/cache

COPY fpm-pool.conf /usr/local/etc/php-fpm.d/zz-pool.conf
# Start script that builds the caches for production mode and then starts
# the actual process (see docker/start.sh).
COPY docker/start.sh /usr/local/bin/laravel-start
RUN chmod +x /usr/local/bin/laravel-start

EXPOSE 9000 8080
CMD ["php-fpm"]
