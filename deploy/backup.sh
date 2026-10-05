#!/bin/sh
# Quiesce both services to preserve session files and channel bindings together.
set -eu
umask 077
[ "$(id -u)" -eq 0 ] || { echo 'Run backup as root.' >&2; exit 1; }
mkdir -p /var/backups/gemini-chat
exec 9>/run/lock/gemini-chat-backup.lock
flock -n 9 || { echo 'Backup already running.' >&2; exit 1; }
server_active=0
bot_active=0
systemctl is-active --quiet gemini-server && server_active=1
systemctl is-active --quiet gemini-bot && bot_active=1
archive="/var/backups/gemini-chat/data-$(date -u +%Y%m%dT%H%M%SZ).tar.gz"
[ ! -e "$archive" ] || { echo 'Archive exists.' >&2; exit 1; }
restore_services() {
  result=$?
  trap - EXIT
  if [ "$server_active" -eq 1 ]; then systemctl start gemini-server || result=1; fi
  if [ "$bot_active" -eq 1 ]; then systemctl start gemini-bot || result=1; fi
  exit "$result"
}
trap restore_services EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
systemctl stop gemini-bot gemini-server
tar -C /var/lib -czf "$archive.tmp" gemini-chat
# Verify the archive before publishing it; secrets / environment files are excluded.
tar -tzf "$archive.tmp" >/dev/null
mv "$archive.tmp" "$archive"
sha256sum "$archive" > "$archive.sha256"
echo "$archive"
