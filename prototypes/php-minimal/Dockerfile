# PHP-FPM: jede offene SSE-Verbindung blockiert einen Worker-Prozess — das
# ist das Laufzeitmodell, das gemessen werden soll (DECISIONS.md 5.5), keine
# Einschränkung dieses Prototyps. pm.max_children siehe fpm-pool.conf.
FROM php:8.4-fpm-alpine
RUN apk add --no-cache --virtual .build-deps $PHPIZE_DEPS \
    && pecl install redis-6.3.0 \
    && docker-php-ext-enable redis \
    && apk del .build-deps
WORKDIR /var/www
COPY sse.php .
COPY fpm-pool.conf /usr/local/etc/php-fpm.d/zz-pool.conf
EXPOSE 9000
