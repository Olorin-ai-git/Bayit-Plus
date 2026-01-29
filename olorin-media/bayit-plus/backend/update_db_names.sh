#!/bin/bash
# Update database name secrets

# Station AI uses israeli_radio, not station_ai
echo -n "israeli_radio" | gcloud secrets versions add station-ai-mongodb-db-name --project=bayit-plus --data-file=- 2>&1 || \
echo -n "israeli_radio" | gcloud secrets create station-ai-mongodb-db-name --project=bayit-plus --replication-policy=automatic --data-file=- 2>&1

echo "✓ Updated Station AI database name to 'israeli_radio'"
