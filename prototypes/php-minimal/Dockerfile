# Ein Image für beide php-minimal-Prozesse (SSE über FPM, WS über Ratchet) —
# siehe docker-compose.yml, command:-Override je Service. sse.php läuft unter
# PHP-FPM: jede offene SSE-Verbindung blockiert einen Worker-Prozess — das
# ist das Laufzeitmodell, das gemessen werden soll (DECISIONS.md 5.5), keine
# Einschränkung dieses Prototyps. pm.max_children siehe fpm-pool.conf.
# ws.php läuft als eigener Dauerprozess (Ratchet/ReactPHP, kein FPM, siehe
# DECISIONS.md 5.5) — braucht deshalb zusätzlich Composer-Abhängigkeiten.
FROM php:8.4-fpm-alpine@sha256:78cd8de9970a9cd6ff4d98860a94eb5bf37dd2d5776b4785562dbfad01c29d5a
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis-6.3.0 \
    && docker-php-ext-enable redis \
    && apk del .build-deps
# Produktionskonfiguration laut Dokumentation des offiziellen Images
# (DECISIONS.md 5.5): ohne php.ini liefen die eingebauten Entwicklungs-Defaults.
RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY --from=composer:2.8@sha256:5248900ab8b5f7f880c2d62180e40960cd87f60149ec9a1abfd62ac72a02577c /usr/bin/composer /usr/bin/composer

WORKDIR /var/www
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
COPY sse.php ws.php ./
COPY fpm-pool.conf /usr/local/etc/php-fpm.d/zz-pool.conf
EXPOSE 9000 8080
CMD ["php-fpm"]
