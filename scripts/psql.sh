PGPASSWORD=$TYPEORM_PASSWORD psql -h $TYPEORM_HOST -U $TYPEORM_USERNAME "$@"