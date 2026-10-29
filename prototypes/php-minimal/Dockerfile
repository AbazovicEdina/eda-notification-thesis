# One image for both php-minimal processes (SSE via FPM, WS via Ratchet),
# see docker-compose.yml, command override per service. sse.php runs under
# PHP-FPM, where each open SSE connection blocks one worker process. This
# is the runtime model to be measured (DECISIONS.md 5.5), not a limitation
# of this prototype. For pm.max_children see fpm-pool.conf.
# ws.php runs as a separate long-running process (Ratchet/ReactPHP, no FPM,
# see DECISIONS.md 5.5) and therefore also needs Composer dependencies.
FROM php:8.5.11-fpm-alpine@sha256:fa01fb1645cd0fc566a5f146b099adace33b906571f972f71f2182a7c12d1cd7
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis-6.3.0 \
    && docker-php-ext-enable redis \
    && apk del .build-deps
# Production configuration according to the documentation of the official
# image (DECISIONS.md 5.5). Without a php.ini the built-in development defaults would apply.
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY --from=composer:2.10.3@sha256:b6dcd72ca98fa19d0e5b8476de179859704891fad06dd9e0b96833d4c430a5fc /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
COPY sse.php ws.php ./
COPY fpm-pool.conf /usr/local/etc/php-fpm.d/zz-pool.conf
EXPOSE 9000 8080
CMD ["php-fpm"]
