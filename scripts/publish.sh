#!/bin/bash

# Exit on error
set -e

# Ensure we're on main branch
if [[ $(git branch --show-current) != "main" ]]; then
  echo "Must be on main branch to publish"
  exit 1
fi

# Ensure working directory is clean
if [[ -n $(git status -s) ]]; then
  echo "Working directory must be clean"
  exit 1
fi

# Pull latest changes
git pull origin main

# Run tests
pnpm test

# Get version type from argument
VERSION_TYPE=${1:-patch}

# Update version and create tag
pnpm version $VERSION_TYPE

# Build
pnpm build

# Publish
pnpm publish

# Push changes and tags
git push origin main --tags

echo "Published successfully!"