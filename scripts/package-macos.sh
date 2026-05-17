#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"

if [[ -x "$HOME/.cargo/bin/cargo" ]]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi

bun run --cwd "$repo_root/apps/desktop" tauri build --bundles app

app_path="$repo_root/apps/desktop/src-tauri/target/release/bundle/macos/Continuum.app"
dmg_dir="$repo_root/apps/desktop/src-tauri/target/release/bundle/dmg"
dmg_path="$dmg_dir/Continuum_0.1.0_aarch64.dmg"
staging_dir="$(mktemp -d /private/tmp/continuum-dmg.XXXXXX)"

cleanup() {
  rm -rf "$staging_dir"
}
trap cleanup EXIT

mkdir -p "$dmg_dir"
cp -R "$app_path" "$staging_dir/Continuum.app"
ln -s /Applications "$staging_dir/Applications"
hdiutil create -volname "Continuum" -srcfolder "$staging_dir" -ov -format UDZO "$dmg_path"

echo "Created $dmg_path"
