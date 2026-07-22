#!/usr/bin/env bash
# Deploy the app: build the SPA, copy it into firebase/app, then deploy.
# This is the one true deploy path — see README.md "Deploy" section.
set -euo pipefail

cd "$(dirname "$0")/.."

# Fail fast if the real Firebase project id hasn't been set yet.
if grep -q "REPLACE_ME_FIREBASE_PROJECT_ID" .firebaserc; then
  echo "error: .firebaserc still has REPLACE_ME_FIREBASE_PROJECT_ID — set your real Firebase project id first." >&2
  exit 1
fi

echo "==> Building app/"
(cd app && npm run build)

echo "==> Copying app/dist -> firebase/app"
rm -rf firebase/app
cp -r app/dist firebase/app

echo "==> Deploying via firebase-tools"
(cd firebase && firebase deploy)

echo "==> Done."
