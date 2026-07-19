# Auth Testing Playbook (see integration playbook)
Use mongosh to insert test user + user_session, then set cookie on browser context and access /admin.
Backend endpoints: POST /api/auth/session, GET /api/auth/me, POST /api/auth/logout.
