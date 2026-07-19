# KGBV Godda - Test Credentials

## Admin Auth
- **Auth Type**: Emergent Google Auth
- **Login URL**: /admin/login
- **First user to log in via Google auto-becomes admin**
- **ADMIN_ALLOWED_EMAILS env**: empty (all first-time users become admin; add emails to whitelist to restrict)

## Testing Sessions (created directly in DB for testing)
- Use MongoDB direct-insertion pattern from auth playbook to create test session cookies
- Session cookie: `session_token` (httpOnly, secure, samesite=none)
