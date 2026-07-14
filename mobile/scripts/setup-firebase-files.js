#!/usr/bin/env node
// Copies Firebase credential files from EAS secret env vars (file paths) to expected locations.
// Runs as postinstall so it executes before expo prebuild on EAS Build servers.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

if (process.env.GOOGLE_SERVICES_PLIST) {
  const src = process.env.GOOGLE_SERVICES_PLIST;
  const dest = path.join(root, 'GoogleService-Info.plist');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied GoogleService-Info.plist from ${src}`);
  } else {
    console.warn(`GOOGLE_SERVICES_PLIST set but file not found at: ${src}`);
  }
}

if (process.env.GOOGLE_SERVICES_JSON) {
  const src = process.env.GOOGLE_SERVICES_JSON;
  const dest = path.join(root, 'google-services.json');
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied google-services.json from ${src}`);
  } else {
    console.warn(`GOOGLE_SERVICES_JSON set but file not found at: ${src}`);
  }
}
