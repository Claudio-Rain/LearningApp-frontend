# Plan: multi-user, own backend, and global deployment

> Summary of the 2026-10-10 conversation. None of this is legal advice. Provider details (free tiers, regions, supported countries) change often, so **verify before deciding**.

## Goal

- Own login: each user has their own collections, progress and API key.
- **Detach from US services** (Firebase/Google included), so I'm not dependent on one provider and a friend in Iran can use the app without getting me into trouble.
- Be able to deploy in several regions (Japan, Europe, Turkey) and learn what hosting data across countries is like.
- The Chrome extension stays as it is (don't delete anything for now).

## Approach: backend first, frontend frozen

This is a **migration**: the frontend already works on Firebase, so it stays untouched until the backend is fully done.

- Build and test the whole backend first (Postgres, Identity, email, ownership, all tables), using `API.http` only.
- **No frontend changes** in the meantime, including the sync fixes in section 1. The app keeps running on Firebase the whole time.
- Only when the backend is complete do I start on the frontend (pages, guard, `src/database/remote/*`), then migrate the data.

---

## 1. Current problem: sync is slow

> Frontend work: **on hold until the backend is done.**

It's not the distance to the server. The app downloads everything every time:

- [ ] `StudyView.vue` (~line 1340) **waits for the server before showing anything**. It re-downloads every learning item in each collection plus **all** `card_progress`, and only then reads local data.
- [ ] `syncAll()` in `src/database/sync/syncEngine.ts` downloads whole collections on every sync, including **the entire `attempt_log`**. That grows with every card answered, so the app gets slower the more I study.
- [ ] Everything is sequential: 14 steps one after another, one request per collection, and pending changes pushed one document at a time.

**Fixes, in order:**

1. [ ] **Don't block the screen:** show local data immediately, sync in the background, then refresh. (< 1 hour)
2. [ ] **Incremental sync:** download only what changed since the last sync (`updated_at` / `created_at`, plus a stored `lastSyncAt`). This is the big one.
3. [ ] **Parallelize and batch:** `Promise.all` for pulls, push pending changes in batches.

The backend has no sync layer (see section 3). If incremental sync needs a "changed since" filter, add it to the API when this step comes.

---

## 2. Why "my own login" on top of Firestore isn't enough

- Firestore rules only recognize **Firebase Auth** users (`request.auth`).
- My own login with the browser still talking directly to Firestore **protects nothing**: anyone could read everyone's data.
- Conclusion: **dropping Firebase for login means dropping it for data too.** The frontend talks to my own API, and the API decides who sees what.

---

## 3. Own backend (already exists: `../LearningApp-backend`)

Current state: .NET, SQL Server (docker-compose), a `User` entity on **ASP.NET Identity** (setup commented out in `Program.cs`), `AccountController`, and `Collections` / `LearningItems` controllers.

**Goal: Firebase parity.** The backend mirrors `src/database/types.ts` and the functions in `src/database/remote/*`, so the frontend can swap Firestore for REST with minimal changes.

- **The only frontend files that change** are `src/database/remote/*`: same function names, parameters and return shapes, with HTTP calls inside. `operations/*`, the sync engine, IndexedDB and views stay as they are.
- Responses leave out unset fields (`undefined`, not `null`), like Firestore.
- Known difference: Firestore is schemaless, Postgres isn't. A new field in `types.ts` needs a backend column + migration, or it's silently dropped.
- New behavior: requests need a login session (401 when signed out). Covered by the login pages + router guard.

**Backend steps:**

1. [x] **Run it.** Postgres (`postgres:17` in docker-compose), fresh `InitialCreate` migration, applied on startup. Targets **.NET 10** (LTS), EF Core 10, Npgsql 10.
2. [x] **Match the models to the frontend:**
   - IDs are **strings** (keeps Firestore ids for the migration).
   - JSON names match `types.ts` exactly, including the snake_case ones (`learning_item_id`, `strength_score`…).
   - `content` / `titleContent` stored as Postgres `jsonb` (Tiptap JSON, as today). The old `ContentJson`/`Type`/`SchemaVersion` format and `learning-item-content.md` are dropped.
   - Client fields (`dateCreated`, `lastModified`…) round-trip unchanged.
   - **No sync layer on the server.** Like Firestore, the backend only stores and returns data; sync stays the frontend's job. Deletes are hard deletes, like `deleteDoc`.
   - No foreign keys between tables (like Firestore), just indexes on the ids the frontend queries by.
3. [x] **Add the missing tables:** `Category`, `CardProgress`, `AttemptLog`, `ExcludedItem`, and app settings (`content_widget`).
4. [x] **One explicit controller per remote file** (no generic base class), exposing only what that file uses:
   | Firestore | REST |
   |---|---|
   | `getX()` / `where(...)` | `GET /api/x` (`?collectionId=` / `?learningItemId=`) |
   | `addX()` (auto id) | `POST /api/x` → returns id |
   | `setX()` and `updateX()` (both send the whole object) | `PUT /api/x/{id}` (upsert) |
   | `updateLearningItemTitle` | `PATCH /api/learningitems/{id}/title` |
   | `updateLearningItemLabels` | `PATCH /api/learningitems/{id}/labels` (omitted key = untouched, `null` = clear) |
   | `deleteX()` | `DELETE /api/x/{id}` |
   | `deleteAttemptLogsByItemId` | `DELETE /api/attemptlogs?learningItemId=` |
   | `writeBatch` (`setExcludedItems`) | `PUT /api/excludeditems` with an array |
   | `app_settings/content_widget` | `GET`/`PUT /api/settings/content_widget` |
5. [ ] **Turn on Identity** (`MapIdentityApi`): register, login (cookies), logout, forgot/reset password.
6. [ ] **Ownership:** `UserId` on every row; every query filtered to the signed-in user.
7. [ ] **Test everything with `API.http`** → backend "done."
8. [ ] Package as a **Docker** image so it can run on any provider.

**Frontend steps:**

- [ ] Pages: login, "forgot password", "reset password".
- [ ] Router guard (redirect to login when signed out) + sign-out button.
- [ ] Rewrite `src/database/remote/*` (~8 files) from Firestore to REST calls (axios is already installed). IndexedDB and the sync engine stay.
- [ ] Local database per user (`collections-db-{userId}`), and never push one user's pending changes while another user is signed in.
- [ ] Claude API key: stays stored locally, tied to the user.

**Migration:**

- [ ] One-off script copying my Firestore data into Postgres (keep the same IDs so references don't break).

---

## 4. Password recovery by email

**Flow:**

1. User clicks "Forgot password?" and types their email.
2. Frontend → `POST /forgotPassword { email }`.
3. Backend creates a **one-time code that expires** (~1 hour) and emails a link: `https://myapp.com/#/reset-password?email=...&code=...`
4. User opens the link and types a new password.
5. Frontend → `POST /resetPassword { email, resetCode, newPassword }`.
6. Always reply "if that email exists, we sent a link" (don't reveal which emails have accounts).

**What I need to write:**

- [ ] A class implementing `IEmailSender<User>` with **MailKit** (open source) over **SMTP** (~30 lines). Changing provider = changing settings, not code.
- [ ] The two frontend pages.
- [ ] **Admin manual reset** as a backup, in case the email never arrives (e.g. for the friend in Iran).

**Email provider (non-US):**

| Option | Notes |
|---|---|
| **Brevo** (France) | Free tier (~300 emails/day). Easiest to start with |
| **Scaleway Transactional Email** (France) | Very cheap, EU-based |
| Hosting provider's SMTP | Many European/Turkish hosts include one; check limits |
| Running my own mail server | ❌ No: emails from new servers land in spam |

Avoid: SendGrid, Mailgun, Amazon SES, Gmail SMTP (all US).

- [ ] I need **my own domain**, plus the **SPF/DKIM** DNS records the provider gives me (~15 min), so emails don't land in spam.
- [ ] Check the provider's terms on recipients in sanctioned countries.
- [ ] Ask my friend to test that the email arrives (Iranian email providers sometimes filter foreign mail; Gmail usually works).

---

## 5. Global deployment

### "Home region" design

- Each region runs **the same Docker container with its own Postgres** (e.g. Tokyo, Frankfurt, Turkey).
- Each user's data lives in **one region only**, chosen at sign-up.
- A small **global directory** maps email → region, so login knows where to send the user. Store a **hash of the email**, not the email.
- **Don't replicate data between regions.** It's much simpler and avoids cross-border transfers (see the legal section).

### Recommended order

1. Now: frontend on a CDN/static host, plus one API and one Postgres in **one** region. With a local-first app this is enough for a long time.
2. With users on several continents: more regions (same container).
3. Only if really needed: a distributed database (hard; almost nobody needs it).

### Turkey

- The big clouds (AWS, Azure, Google) have little or no presence there → use a **local Turkish provider** (check the options).
- Frankfurt is ~30–50 ms from Istanbul, so Europe can cover Turkey.
- The strong reason for a server in Turkey would be the **KVKK** law on transferring data abroad, not speed.

### Rough costs

- About **$10–50/month per region** at small scale (VPS + Postgres). Three regions ≈ $30–150/month. Varies a lot by provider.

### Free options to experiment with (verify current terms)

| Service | Free | Regions | Catch | Country |
|---|---|---|---|---|
| Supabase | Postgres, 2 projects | Tokyo, Frankfurt… | Pauses after ~1 week idle | 🇺🇸 |
| Neon | Serverless Postgres | Frankfurt, Singapore… (probably not Tokyo) | Small limits | 🇺🇸 |
| Oracle Always Free | Generous ARM VMs (API + Postgres in Docker) | Tokyo, Osaka, Frankfurt… | Free only in the account's home region | 🇺🇸 |
| Google Cloud Run | Monthly container quota | Most regions | Credit card; still need a database | 🇺🇸 |
| Azure | App Service F1, free Azure SQL | Most regions | F1 is very limited | 🇺🇸 |
| Render | Free web service | Frankfurt, Singapore, US | Sleeps when idle | 🇺🇸 |

⚠️ **All of these are US companies.** They're fine for learning and experimenting, **not** for what my friend in Iran uses. For that: a Turkish or European provider whose terms don't exclude Iran.

---

## 6. Legal: moving data between countries

General rule: **moving personal data from one country to another is a regulated "transfer."** None of these regions forbids it (unlike Russia or China), but all regulate it:

- **EU (GDPR):** data can leave freely only to countries with an "adequacy decision." **Japan has one**; the US only for companies under the Data Privacy Framework. **Turkey doesn't** → needs Standard Contractual Clauses (SCCs).
- **Japan (APPI):** user consent, or a destination with equivalent protection (the EU counts).
- **Turkey (KVKK, amended 2024):** allowed with safeguards, such as standard contracts notified to the Turkish data protection authority. Check carefully if going this way.

**Impact on the design:**

- Home region = almost no transfers.
- Don't sync everything to everywhere.
- The global directory is personal data too → hash the email.
- Claude calls go to Anthropic (US) → mention it in the privacy policy.

**Basics to do even for a small project:**

- [ ] Privacy policy: what I store (email, password hash, study data) and in which country.
- [ ] Collect the minimum.
- [ ] Account export and delete.
- [ ] Accept the host's Data Processing Agreement (usually part of the terms).

---

## 7. Iran and sanctions

### Who could get me into trouble?

1. **US sanctions (OFAC):** bind **US persons** (citizens, green-card holders, US residents) and **US companies**. If I'm not a US person they don't apply to me directly, but they do apply to my providers. (General license **GL D-2** covers free personal communication software to Iran; a US person should confirm with a lawyer.)
2. **Providers' terms of service** (the practical risk): Google/Firebase, AWS, Azure, Cloudflare, Supabase, Neon and Oracle are US companies, prohibit serving sanctioned countries, and many block Iranian IPs. Likely consequence: **my account gets shut down with all the data.**
3. **My own country's law:** EU and most other countries' sanctions target specific people, entities and sectors, not a free app for a private individual. Check anyway.
4. **My friend's side:** Iran filters the internet heavily; for a study app the risk is low. Ask only for email and password (no real name).

### Conditions for staying on the safe side

- [ ] I'm not a US person (if I am → sanctions-lawyer consult before launch).
- [ ] Everything my friend touches is **non-US**: server, database, frontend files, recovery email.
- [ ] The app is **free** for users in Iran, with no payments of any kind.
- [ ] **No Claude features** for users in Iran (Anthropic doesn't support Iran).
- [ ] Don't build anything meant to get around Iranian filtering.
- [ ] Minimal data.

✅ Checked: the frontend loads nothing external (no Google Fonts, no CDNs); icons are bundled. It only needs to move off Firebase Hosting.

### Payments

- What matters is **where the user is and who processes the payment**, not where the server is.
- Paying from Iran through normal channels is impossible anyway: Stripe blocks Iran, and Iranian cards don't work internationally.
- Stripe (as far as I know) **doesn't** support Turkey-based merchants → in Turkey use local providers (iyzico, PayTR), which also screen for sanctions.
- ❌ Never: crypto as a workaround, or "a friend abroad pays for the Iranian user's account." That looks like sanctions evasion.

| User in | Server (home region) | Payments |
|---|---|---|
| US / EU / Japan | Nearest region | ✅ Stripe |
| Turkey | Turkey or Frankfurt | ✅ local provider, or Stripe via a non-Turkish entity |
| Iran | Turkey or EU (non-US host) | ❌ always off, free only |

### "Every other country is unrestricted" → not quite

Broad restrictions also apply to:

- **Cuba, North Korea**
- **Russian-occupied regions of Ukraine** (Crimea, Donetsk, Luhansk)
- **Syria** (US eased sanctions in 2025; check current status)
- **Russia and Belarus** (payments heavily restricted; Stripe doesn't operate)
- **People on sanctions lists (SDN etc.)** in any country; payment providers screen for these automatically

Each provider also has its own list: **Anthropic supported regions** (Claude) and **Stripe supported countries** (payments).

- [ ] **One per-country settings table** (Claude on/off, payments on/off, home region). When a list changes, edit the table, not the code.

---

## 8. Checklist: replace US services

| # | Today (US) | Replacement | Notes |
|---|---|---|---|
| 1 | [ ] **Firestore** (data) | .NET backend + **Postgres** on a Turkish/EU host | The main work |
| 2 | [ ] **SQL Server** (backend) | **Postgres** | Open source |
| 3 | [ ] **Firebase Hosting** (frontend) | Same non-US host, or an EU static host | Static files, easy |
| 4 | [ ] Auth (none yet) | **ASP.NET Identity** | No Firebase Auth, no Google login |
| 5 | [ ] Recovery email | **Brevo** / **Scaleway** (France) via SMTP | + admin manual reset |
| 6 | [ ] **Domain + DNS** | EU registrar: **Gandi**, **OVH** (France), **INWX** (Germany) | Avoid Cloudflare, GoDaddy, Namecheap |
| 7 | [ ] **Claude API** | Keep, **off in sanctioned countries** | Per-country table |
| 8 | [ ] Payments (future) | Per-country switch; never in Iran | Per-country table |
| 9 | [ ] `firebase` npm package | Remove once 1 and 3 are done | Last step |

**These can stay:** .NET, Vue, Vuetify, Postgres, Docker, MailKit (open source; licenses don't restrict users). **GitHub** too: it holds the code, not user data, and my friend never touches it.

---

## 9. Work order

Backend first; the frontend isn't touched until steps 1–2 are fully done (see "Approach" at the top).

1. [ ] **Backend:** Postgres + Identity (register, login, forgot/reset password) + MailKit email.
2. [ ] **Backend:** ownership on data + missing tables. Backend is "done" when everything works through `API.http`.
3. [ ] **Frontend:** fix sync (non-blocking → incremental → parallel).
4. [ ] **Frontend:** login/recovery pages, guard, sign-out.
5. [ ] **Frontend:** `src/database/remote/*` → own API; local database per user.
6. [ ] **Migrate** my Firestore data to Postgres.
7. [ ] **Deploy** to one non-US region (Docker), frontend off Firebase Hosting.
8. [ ] EU domain + DNS (SPF/DKIM) + email provider.
9. [ ] Per-country table (Claude / payments / home region).
10. [ ] Legal: privacy policy, account export/delete.
11. [ ] Remove `firebase` from the frontend.
12. [ ] More regions (Tokyo, Turkey) once there are users there.

## Open questions

- [ ] Am I a "US person" for sanctions purposes? (decides whether I need a lawyer)
- [ ] Which specific Turkish or European provider? (check their terms on Iran)
- [ ] Open sign-up form, or accounts I create myself (friends only)?
