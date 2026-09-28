#!/bin/sh
set -eu
if ! git ls-files '*.swift' | grep -q .; then
  exit 0
fi
if [ "${1:-}" = "--check" ]; then
  git ls-files -z '*.swift' | xargs -0 xcrun swift-format lint --strict
else
  git ls-files -z '*.swift' | xargs -0 xcrun swift-format format --in-place
fi
