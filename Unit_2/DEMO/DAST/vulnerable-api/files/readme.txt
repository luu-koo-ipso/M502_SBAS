VulnerableApp File Server
=========================
This directory serves static text files via /api/files?name=

Available files:
  - readme.txt    (this file)
  - users.csv     (user export)
  - api-keys.txt  (API key list)

Try path traversal: /api/files?name=../server.js
