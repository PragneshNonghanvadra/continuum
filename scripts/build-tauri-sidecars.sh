#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"
helper_package="$repo_root/apps/native-helper"
tauri_binaries_dir="$repo_root/apps/desktop/src-tauri/binaries"

arch_name="${TAURI_ENV_ARCH:-$(uname -m)}"
case "$arch_name" in
  aarch64 | arm64)
    target_triple="aarch64-apple-darwin"
    swift_arch="arm64-apple-macosx"
    ;;
  x86_64)
    target_triple="x86_64-apple-darwin"
    swift_arch="x86_64-apple-macosx"
    ;;
  *)
    echo "Unsupported native helper architecture: $arch_name" >&2
    exit 1
    ;;
esac

swift build --package-path "$helper_package" -c release

helper_binary="$helper_package/.build/$swift_arch/release/continuum-native-capture"
if [[ ! -x "$helper_binary" ]]; then
  helper_binary="$(find "$helper_package/.build" -path "*/release/continuum-native-capture" -type f -perm -111 | head -n 1)"
fi

if [[ -z "${helper_binary:-}" || ! -x "$helper_binary" ]]; then
  echo "Unable to find built continuum-native-capture helper" >&2
  exit 1
fi

mkdir -p "$tauri_binaries_dir"
cp "$helper_binary" "$tauri_binaries_dir/continuum-native-capture-$target_triple"
chmod 755 "$tauri_binaries_dir/continuum-native-capture-$target_triple"
