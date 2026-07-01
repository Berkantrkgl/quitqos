#!/usr/bin/env bash
#
# setup-android-sdk.sh — Install the Android command-line SDK + emulator on Linux
# WITHOUT Android Studio (lighter, no IDE). Result: a working AVD + adb for Expo.
#
# Run from another terminal:   bash mobile/scripts/setup-android-sdk.sh
# Re-running is safe (idempotent): it skips parts already installed.
#
# After it finishes, follow the printed instructions to add env vars to ~/.zshrc,
# then:   cd mobile && npx expo start --android
#
set -euo pipefail

# ---- config -------------------------------------------------------------
SDK_ROOT="${ANDROID_HOME:-$HOME/Android/Sdk}"
CMDLINE_VERSION="13114758"   # cmdline-tools 19.0 (latest stable as of 2026)
PLATFORM="android-35"        # API 35 (Android 15)
BUILD_TOOLS="35.0.0"
SYSIMG="system-images;android-35;google_apis;x86_64"
AVD_NAME="quitqos_pixel"
DEVICE="pixel_7"
# ------------------------------------------------------------------------

log()  { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

# ---- 0. sanity checks ---------------------------------------------------
[ "$(uname -s)" = "Linux" ] || die "This script targets Linux only."
command -v unzip >/dev/null || die "unzip not found. Install it: sudo apt install -y unzip"
command -v curl  >/dev/null || die "curl not found. Install it: sudo apt install -y curl"

if ! egrep -qc '(vmx|svm)' /proc/cpuinfo; then
  warn "CPU virtualization (vmx/svm) not detected — emulator will be slow."
else
  log "CPU virtualization available (KVM) — emulator will be hardware-accelerated."
fi

# ---- 1. JDK 21 (matches backend pom target) -----------------------------
if command -v javac >/dev/null && javac -version 2>&1 | grep -q ' 2[1-9]'; then
  log "JDK $(javac -version 2>&1 | awk '{print $2}') already present."
else
  log "Installing OpenJDK 21 (requires sudo)..."
  sudo apt update && sudo apt install -y openjdk-21-jdk
fi

# ---- 2. KVM access (emulator acceleration) ------------------------------
if [ -e /dev/kvm ]; then
  if [ ! -r /dev/kvm ] || [ ! -w /dev/kvm ]; then
    log "Adding $USER to the 'kvm' group for emulator acceleration (requires sudo)..."
    sudo usermod -aG kvm "$USER" || warn "Could not add to kvm group; emulator may need sudo."
    warn "Log out/in (or reboot) once for kvm group membership to take effect."
  fi
fi

# ---- 3. command-line tools ----------------------------------------------
CMDLINE_DIR="$SDK_ROOT/cmdline-tools/latest"
if [ -x "$CMDLINE_DIR/bin/sdkmanager" ]; then
  log "cmdline-tools already installed at $CMDLINE_DIR"
else
  log "Downloading Android command-line tools..."
  mkdir -p "$SDK_ROOT/cmdline-tools"
  TMP_ZIP="$(mktemp --suffix=.zip)"
  curl -fL -o "$TMP_ZIP" \
    "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_VERSION}_latest.zip"
  rm -rf "$SDK_ROOT/cmdline-tools/cmdline-tools" "$CMDLINE_DIR"
  unzip -q "$TMP_ZIP" -d "$SDK_ROOT/cmdline-tools"
  # the zip unpacks to .../cmdline-tools/cmdline-tools — move it to .../latest
  mv "$SDK_ROOT/cmdline-tools/cmdline-tools" "$CMDLINE_DIR"
  rm -f "$TMP_ZIP"
  log "cmdline-tools installed."
fi

export ANDROID_HOME="$SDK_ROOT"
export PATH="$CMDLINE_DIR/bin:$SDK_ROOT/platform-tools:$SDK_ROOT/emulator:$PATH"
SDKMANAGER="$CMDLINE_DIR/bin/sdkmanager"
AVDMANAGER="$CMDLINE_DIR/bin/avdmanager"

# ---- 4. accept licenses + install packages ------------------------------
log "Accepting SDK licenses..."
yes | "$SDKMANAGER" --licenses >/dev/null || true

log "Installing platform-tools, emulator, platform ($PLATFORM), build-tools, system image..."
"$SDKMANAGER" \
  "platform-tools" \
  "emulator" \
  "platforms;$PLATFORM" \
  "build-tools;$BUILD_TOOLS" \
  "$SYSIMG"

# ---- 5. create the AVD ---------------------------------------------------
if "$AVDMANAGER" list avd 2>/dev/null | grep -q "Name: $AVD_NAME"; then
  log "AVD '$AVD_NAME' already exists — skipping."
else
  log "Creating AVD '$AVD_NAME' ($DEVICE, $PLATFORM)..."
  echo "no" | "$AVDMANAGER" create avd \
    --name "$AVD_NAME" \
    --package "$SYSIMG" \
    --device "$DEVICE" || warn "AVD create failed; check 'avdmanager list device' for a valid --device."
fi

# ---- 6. done — print next steps -----------------------------------------
cat <<EOF

\033[1;32m============================================================\033[0m
 Android SDK installed (no Android Studio).  SDK root: $SDK_ROOT
\033[1;32m============================================================\033[0m

1) Add these to your ~/.zshrc (once), then 'source ~/.zshrc' or open a new terminal:

   export ANDROID_HOME="$SDK_ROOT"
   export PATH="\$ANDROID_HOME/cmdline-tools/latest/bin:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/emulator:\$PATH"

2) If this script added you to the 'kvm' group, log out/in (or reboot) once.

3) Start the emulator (keep it running in its own terminal):

   emulator -avd $AVD_NAME

   Wait for the Android home screen to appear.

4) In the mobile project, start Expo and press 'a':

   cd $(cd "$(dirname "$0")/.." && pwd) && npx expo start
   # then press  a  to open on the running emulator

   NOTE: Expo Go on SDK 56 may be incompatible. If 'a' fails to load,
   you need a development build:  npx expo run:android
   (that compiles a custom dev client with your native modules).

EOF
log "Setup complete."
