#!/bin/sh
# Télécharge les données Google libphonenumber (fuseaux + lieux) dans data-src/.
# À relancer de temps en temps, puis : npm run data && npm run build
set -e
cd "$(dirname "$0")/.."
BASE=https://raw.githubusercontent.com/google/libphonenumber/master/resources
mkdir -p data-src/timezones data-src/geo/en data-src/geo/fr
curl -fsS "$BASE/timezones/map_data.txt" -o data-src/timezones/map_data.txt
for lang in en fr; do
  curl -fsS "https://api.github.com/repos/google/libphonenumber/contents/resources/geocoding/$lang" \
    | python3 -c "import sys,json; [print(x['name']) for x in json.load(sys.stdin) if x['name'].endswith('.txt')]" \
    | (cd "data-src/geo/$lang" && xargs -I{} -P8 curl -fsSO "$BASE/geocoding/$lang/{}")
done
echo "OK : données dans data-src/"
