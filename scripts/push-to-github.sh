#!/usr/bin/env bash
# =============================================================================
# Push Anamata Kāhui scaffold to GitHub
# =============================================================================
# Detects available credentials and chooses the best path automatically:
#   1. GITHUB_TOKEN in env           → uses HTTPS with token auth
#   2. SSH key in ~/.ssh/ + agent    → uses SSH
#   3. gh CLI installed + authed     → uses `gh repo create`
#   4. None of the above             → prints manual instructions
#
# Run from the project root:  ./scripts/push-to-github.sh
# =============================================================================

set -euo pipefail

REPO_NAME="anamata-kahui"
DEFAULT_ORG=""
BRANCH="main"

# ANSI
RED=$'\033[0;31m'
GRN=$'\033[0;32m'
YEL=$'\033[0;33m'
BLU=$'\033[0;34m'
DIM=$'\033[2m'
RST=$'\033[0m'

info()    { printf "${BLU}▸${RST} %s\n" "$*"; }
success() { printf "${GRN}✓${RST} %s\n" "$*"; }
warn()    { printf "${YEL}!${RST} %s\n" "$*"; }
err()     { printf "${RED}✗${RST} %s\n" "$*" >&2; }

# Pre-flight: must be inside a git repo with at least one commit.
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  err "Not inside a git repo. Run from the project root:  cd $(basename "$PWD")"
  exit 1
fi

if ! git rev-parse HEAD >/dev/null 2>&1; then
  err "Repo has no commits yet. Run:  git add . && git commit -m 'feat: initial scaffold'"
  exit 1
fi

# Detect credentials
USE_GH=false
USE_TOKEN=false
USE_SSH=false

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  USE_GH=true
elif [[ -n "${GITHUB_TOKEN:-}" ]]; then
  USE_TOKEN=true
elif [[ -n "${SSH_AUTH_SOCK:-}" ]] && ssh-add -l >/dev/null 2>&1; then
  USE_SSH=true
elif [[ -f "$HOME/.ssh/id_ed25519" || -f "$HOME/.ssh/id_rsa" ]]; then
  warn "SSH key found but not loaded into the agent. Attempting anyway…"
  USE_SSH=true
fi

# Ask for org/user if not provided
read -rp "$(info 'GitHub owner (user or org): ')" OWNER
OWNER="${OWNER:-$DEFAULT_ORG}"
if [[ -z "$OWNER" ]]; then
  err "Owner is required."
  exit 1
fi

REMOTE_URL_HTTPS="https://github.com/${OWNER}/${REPO_NAME}.git"
REMOTE_URL_SSH="git@github.com:${OWNER}/${REPO_NAME}.git"

# Path 1: gh CLI
if $USE_GH; then
  info "Using gh CLI (authenticated)."
  if gh repo view "${OWNER}/${REPO_NAME}" >/dev/null 2>&1; then
    warn "Repo ${OWNER}/${REPO_NAME} already exists. Adding as remote and pushing."
    git remote remove origin 2>/dev/null || true
    git remote add origin "$REMOTE_URL_SSH"
  else
    info "Creating repo ${OWNER}/${REPO_NAME} (private, with README/license skipped)…"
    gh repo create "${OWNER}/${REPO_NAME}" --private --source=. --remote=origin --push
    success "Pushed."
    exit 0
  fi

# Path 2: token
elif $USE_TOKEN; then
  info "Using GITHUB_TOKEN (HTTPS with token auth)."
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://x-access-token:${GITHUB_TOKEN}@github.com/${OWNER}/${REPO_NAME}.git"

# Path 3: SSH
elif $USE_SSH; then
  info "Using SSH."
  git remote remove origin 2>/dev/null || true
  git remote add origin "$REMOTE_URL_SSH"

# Path 4: nothing
else
  err "No GitHub credentials detected."
  cat <<EOF

${YEL}Pick one of the following and re-run:${RST}

  1. ${BLU}gh CLI${RST} (easiest)
       brew install gh            # macOS
       sudo apt install gh        # Debian/Ubuntu
       gh auth login
       ./scripts/push-to-github.sh

  2. ${BLU}Personal Access Token${RST}
       Create one at https://github.com/settings/tokens?type=beta
       Grant Contents: Read & write on the target repo.
       export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxx
       ./scripts/push-to-github.sh

  3. ${BLU}SSH key${RST}
       Add your public key at https://github.com/settings/keys
       eval "\$(ssh-agent -s)" && ssh-add ~/.ssh/id_ed25519
       ./scripts/push-to-github.sh

  4. ${BLU}Manual push${RST}
       Create the empty repo at https://github.com/new, then:

         git remote add origin ${REMOTE_URL_HTTPS}
         git push -u origin ${BRANCH}
EOF
  exit 1
fi

# Push
info "Pushing to ${REMOTE_URL_SSH:-$REMOTE_URL_HTTPS}…"
git push -u origin "$BRANCH"
success "Done. Repo: https://github.com/${OWNER}/${REPO_NAME}"
