# Register, Login, and Admin Integration Path

## Goal

Document the smallest functional frontend flow now implemented for:

1. Registering an account.
2. Verifying its email address.
3. Logging in with the account.
4. Opening an admin-only page.
5. Logging out.

The current implementation uses plain HTML elements. Styling, reusable visual components, and final design-system integration remain out of scope.

## Existing backend contract

| Action               | Request                       | Successful result                             | Important alternatives                                                                                 |
| -------------------- | ----------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Register             | `POST /api/auth/register`     | `202` with a generic message                  | `400` validation error, `429` rate limit                                                               |
| Verify email         | `POST /api/auth/email/verify` | `200`                                         | Invalid or expired token response                                                                      |
| Login                | `POST /api/auth/login`        | `200` and a session cookie                    | `202` TOTP required, `401` invalid credentials, `403` unavailable/unverified account, `429` rate limit |
| Read current account | `GET /api/account/me`         | `200` with `user`, `roles`, and `permissions` | `401` unauthenticated                                                                                  |
| Test admin access    | `GET /api/admin/test`         | `200` for `users.manage`                      | `401` unauthenticated, `403` missing permission                                                        |
| Logout               | `POST /api/auth/logout`       | `200` and cleared session cookie              | Server error                                                                                           |

The frontend and API are served from the same origin. Requests should still use `credentials: 'include'` explicitly so session-cookie behavior remains clear and continues to work if development hosting changes later.

## Required account lifecycle

```text
/register
    |
    | POST /api/auth/register
    v
verification instructions
    |
    | token from the development server or future email delivery
    v
/verify-email?token=...
    |
    | POST /api/auth/email/verify
    v
/login
    |
    | POST /api/auth/login
    v
authenticated session
    |
    | GET /api/account/me
    | require permissions.includes('users.manage')
    v
/admin
```

Registration deliberately returns the same `202` response for new and existing email addresses. The UI must always show the server's generic message and must not claim that an account was definitely created.

## Admin provisioning prerequisite

New registrations receive the `subscriber` role. They cannot access `/api/admin/test` until an administrator role is assigned outside this initial frontend flow.

For development testing, assign the administrator role after email verification:

```sql
INSERT IGNORE INTO user_roles (user_id, role_id)
SELECT users.id, roles.id
FROM users
INNER JOIN roles ON roles.slug = 'administrator'
WHERE users.email = 'replace-with-test-email@example.com';
```

This is test setup, not part of the public registration endpoint. The frontend must never grant roles or infer admin access merely from a successful login.

## Current frontend routes

| Frontend route                 | Purpose                                                 | Access behavior                                                                                                                          |
| ------------------------------ | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/register`                    | Submit `displayName`, `email`, and `password`           | If already authenticated, offer navigation to `/admin` or logout                                                                         |
| `/verify-email`                | Submit the `token` query parameter                      | On success, link or navigate to `/login`                                                                                                 |
| `/login`                       | Submit `email` and `password`                           | On success, load `/api/account/me` and navigate according to permissions                                                                 |
| `/admin` and future `/admin/*` | Resolve the session principal in private server loaders | Redirect guests to `/login`; render a plain forbidden message without `users.manage`; never publicly cache document or `.data` responses |

The existing `/` and development-only routes remain unchanged. This document
originally preceded the Framework migration; the file layout below reflects the
completed integration today.

## Minimal file integration

The implementation should add only the files needed to keep network behavior out of page components:

```text
src/
  api/
    authApi.js
  pages/
    RegisterPage.jsx
    VerifyEmailPage.jsx
    LoginPage.jsx
    AdminPage.jsx
  framework/
    contexts.js
  routes.js                  # maps URLs to route modules
  routes/
    admin.jsx
    private-layout.jsx
    login.jsx
    register.jsx
    verify-email.jsx
```

`authApi.js` will contain one small request helper and these operations:

- `registerAccount(input)`
- `verifyEmail(token)`
- `login(input)`
- `getCurrentAccount()`
- `logout()`

No global state library is required for the first pass. The session cookie is authoritative. Login uses `/api/account/me` once for navigation, while protected document requests receive an immutable principal through the per-request Framework context.

## Page behavior

### Register page

- Render inputs for display name, email, and password.
- Disable submission only while a request is pending.
- Send the values without changing the backend field names.
- Display the generic `202` message.
- Display field errors from `body.errors` for a `400` response.
- Provide a link to `/login`.

### Email verification page

- Read `token` from `URLSearchParams`.
- If missing, render a plain invalid-link message without making a request.
- Submit the token once from an effect.
- On success, provide a link to `/login`.
- Do not print the token into logs or persistent browser storage.

### Login page

- Render email and password inputs.
- On `200`, request `/api/account/me`.
- If the returned permissions include `users.manage`, navigate to `/admin`.
- Otherwise render a successful-login message with a clear "not an administrator" result.
- On `202`, show that two-factor authentication is required. Completing the TOTP challenge is a later extension and should not be falsely reported as a successful login.
- Display server messages for `400`, `401`, `403`, and `429` without exposing internal errors.

### Admin page

- The private parent loader redirects guests to `/login` before rendering.
- The admin loader reads permissions from the immutable request principal.
- Render "Forbidden" when authenticated without `users.manage`.
- Never cache the document or its loader data publicly.
- Include a logout button. After successful logout, navigate to `/login`.

The server remains the final authorization boundary. The frontend permission check improves navigation but does not replace `requirePermission('users.manage')` on the API route.

## Error handling contract

The request helper should:

1. Parse JSON responses when present.
2. Return both HTTP status and response body.
3. Treat expected `4xx` responses as displayable results rather than JavaScript exceptions.
4. Throw only for network failures or unreadable/unexpected server responses.
5. Surface the generic server message and correlation ID for unexpected `5xx` responses when available.

## Completed implementation order

1. Add the API request helper and operation functions.
2. Add the registration page and route.
3. Add email verification and confirm that a newly registered account can become active.
4. Add login and confirm the session cookie authenticates `/api/account/me`.
5. Assign the development user the administrator role using the SQL above.
6. Add the admin page and server-loader permission handling; keep `/api/admin/test` as an independently protected API diagnostic.
7. Add logout.
8. Add focused component/route tests, then run the production build and the existing backend suite.

## Acceptance checks

- A valid registration displays the generic `202` message.
- An invalid registration displays backend validation errors.
- A verification token activates the new account.
- An unverified account cannot log in.
- Valid credentials establish a cookie-backed session.
- A subscriber cannot use the admin API or admin page.
- A user with `users.manage` can open `/admin` and see the server-rendered authorized state.
- Refreshing `/admin` preserves access through the server session.
- Future `/admin/*` documents and `.data` requests enter the same private session pipeline.
- Logging out removes access and returns the user to `/login`.
- No role, permission, password, or verification token is stored in `localStorage` or `sessionStorage`.

## Deferred work

- CSS and page layout.
- Design-system components.
- TOTP challenge UI after a `202` login response.
- Resend-verification UI.
- Password recovery UI.
- An administrative role-management interface.
- A shared authentication context if later pages need continuously synchronized session state.
