#!/usr/bin/env bash

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@admin.local}"
php /rnadetector/ws/artisan auth:token "$ADMIN_EMAIL" "$@"
