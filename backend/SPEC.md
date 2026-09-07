# Neoteric Excellence — build specification

Everything needed to build the app without a kickoff call.
Open `docs/app-prototype.html` in a browser alongside this file: **the prototype is the
reference for behaviour, this is the reference for structure.**

---

## 1. Scope and stack

Twelve trainees, five staff roles, one batch at a time, growing to three or four concurrent
batches within two years. This is a small-data application — the hard parts are offline
mobile capture and role permissions, not scale.

- **Backend** — Node/Express, Django or Laravel. Postgres. Nothing here needs anything exotic.
- **Web** — React or Vue SPA for the staff screens. Desktop-first; staff work from an office laptop.
- **Mobile** — a PWA, not a native app. Must install to the home screen and work offline.
  React Native only if push notifications later become essential.
- **Auth** — phone number + OTP for trainees (they will forget passwords and they all have
  phones); email + password for staff.
- **Files** — S3-compatible object storage for joining documents and photo evidence.

## 2. Data model

Fourteen tables. Everything else is a computed view.

```
batch           id, name, start_date, phase1_end, gateway_date, status

person          id, name, phone, email, role, active
                role: trainee | coordinator | supervisor | office | buddy | dept_head | exec

trainee         id, person_id, batch_id, pod_id, buddy_id, branch, base_location,
                joining_date, baseline_score, status
                status: active | exited | gateway_passed | confirmed

pod             id, batch_id, name, buddy_id

day             id, batch_id, date, day_code, phase, module_id, is_muster_day, is_off

attendance      id, trainee_id, day_id, status, marked_by, marked_at
                status: P | A | L | H

daily_log       id, trainee_id, day_id, body_json, submitted_at,
                score, reviewed_by, reviewed_at, review_note
                body_json holds the six prompts; score 1-5 set by the reviewer

module          id, code, title, department, handbook_section, sequence

video           id, module_id, youtube_id, title, channel, duration_s,
                status, added_by, approved_by
                status: suggested | linked | retired

video_progress  id, trainee_id, video_id, seconds_watched, completed_at

assessment      id, trainee_id, kind, written, practical, behavioural,
                total, assessed_by, assessed_at
                kind: baseline | checkpoint | drill | capstone | gateway

rotation        id, pod_id, block_code, department, starts_on, ends_on

checklist_item  id, trainee_id, item_index, done, signed_by, signed_at, evidence_url

document        id, trainee_id, kind, file_url, verified_by, verified_at
```

### Computed, never stored

Derived on read. Storing them creates two sources of truth and they will drift.

```
checkpoint = written + practical + behavioural
velocity   = (checkpoint − baseline) ÷ (100 − baseline) × 100
log_avg    = mean(daily_log.score) over submitted logs
att_pct    = (count(P) + 0.5 × count(H)) ÷ count(marked)
final      = weighted mean of available components, re-weighted over the
             components that actually have marks
band       = A if final ≥ 75 and velocity ≥ 55
             B if final ≥ 60
             C if final ≥ 45
             D otherwise
```

**Re-weighting matters.** In week two there are no drill or capstone marks. If you divide
by the full weight set, every trainee looks like a failure. Divide by the sum of the
weights that actually have data.

## 3. API

```
GET  /api/batches/:id/dashboard        tiles, alerts, band counts
GET  /api/batches/:id/days/:date       daily entry grid, 12 rows
PUT  /api/attendance/bulk              [{trainee_id, day_id, status}] — one call for the grid
PUT  /api/logs/:id/review              {score, note} — coordinator only
POST /api/logs                         trainee submits; idempotent on (trainee, day)
GET  /api/trainees?batch=&pod=         list with computed band and velocity
GET  /api/trainees/:id                 full profile for the detail drawer
PUT  /api/assessments/:id              marks; band recomputes on read
GET  /api/modules?with=videos
POST /api/videos                       {module_id, url} — server resolves via oEmbed
POST /api/videos/:id/progress          {seconds, completed}
PUT  /api/checklist/:id/sign           buddy or dept head only
GET  /api/batches/:id/report?month=    the monthly pack
```

**Bulk attendance is the one to get right.** Rajat marks twelve people in about forty
seconds. Twelve separate requests over site 4G will fail halfway and leave the grid
inconsistent. One call, one transaction.

## 4. Roles and permissions

| Capability | Trainee | Buddy | Rajat | Deepti | Bharti |
|---|:--:|:--:|:--:|:--:|:--:|
| Submit own daily log | ✓ | | | | |
| View own band and scores | ✓ | | | | |
| Watch module videos | ✓ | ✓ | ✓ | ✓ | |
| Mark attendance | | | ✓ | ✓ | |
| Score and sign a daily log | | | ✓ | ✓ | |
| Weekly buddy rating | | own pod | | ✓ | |
| Sign a checklist item | | own pod | ✓ | ✓ | |
| Enter assessment marks | | | | ✓ | |
| Set or override a band | | | | ✓ | |
| Allot department / rotation | | | draft | approve | |
| Add a video to the library | | | ✓ | ✓ | |
| Approve a video for release | | | | ✓ | |
| Upload and verify documents | | | | | ✓ |
| Export the monthly pack | | | ✓ | ✓ | ✓ |

The distinction that matters: **Rajat records, Deepti decides.** Rajat cannot set a band
and cannot approve an allotment. If the app lets him, the ownership split designed on paper
stops existing within a fortnight.

## 5. YouTube integration

- Admin pastes a full YouTube URL. Server extracts the ID and calls the `oEmbed` endpoint
  for title, channel and thumbnail; Data API v3 gives duration. **Store the ID, never the
  full URL.**
- Player is the **YouTube IFrame Player API**. Bind `onStateChange`, post progress every 15
  seconds and on pause.
- Mark **completed at 90%** of duration, not 100% — nobody watches the end card.
- A video goes `suggested → linked` only when Deepti approves it. A video that contradicts
  the project specification is worse than no video, and the person curating is not always
  the person who knows the specification.
- Videos are pre-reading, not a substitute for the module. Do not build anything that lets
  a trainer skip a session because a video exists.
- Handle the dead-link case: check linked videos weekly and flag any that 404. Public
  videos get taken down.

## 6. Offline behaviour — the part that decides adoption

The trainee writes their log standing on a slab at Zen Garden with one bar of signal. Get
this wrong and they stop using the app in week two, permanently.

- Service worker caches the shell, today's module, and the log form.
- Log submissions write to IndexedDB first, then sync. Show a clear queued state — never a
  spinner that fails silently.
- Idempotency key on `(trainee_id, day_id)` so a retry does not create a duplicate log.
- Videos are the one thing that needs connectivity. Say so, and default the player to 480p
  — twelve trainees on ₹20,000 CTC are paying for that data themselves. Site wifi in the
  training room is the better answer.

## 7. What to build first

Batch 2026-01 is already running. A tool that arrives in December is a tool for Batch 02.

### v1 — before 30 September · replaces the spreadsheet
- Staff login, trainee master, the day calendar
- Bulk attendance and log scoring — the daily entry grid
- Trainee list with computed band and velocity, and the detail drawer
- Assessment entry for the checkpoint
- The monthly pack as a generated PDF

### v2 — October · the trainee PWA
- OTP login, offline log submission, own band and checklist
- Module library with video playback and progress
- Buddy weekly rating on mobile

### v3 — before the Gateway, December
- Checklist sign-off with photo evidence
- Department immersion reviews and the Gateway assessment screen
- Multi-batch support, so Batch 02 does not need a second deployment

## 8. Things that look like details and are not

- **Never delete a log or a mark.** Soft-delete and keep an audit trail of who changed what
  and when. This programme decides whether someone keeps their job in January; the record
  has to survive being questioned.
- **Timestamp the log review separately from the submission.** A log reviewed at 09:00 the
  next morning is not the same as one reviewed at 17:30 in front of the trainee, and you
  want to be able to see the difference.
- **The baseline is write-once.** Lock it after D01. If it can be edited later, velocity can
  be gamed and it stops meaning anything.
- **Store the weights per batch, not in code.** They will change for Batch 02, and Batch
  01's history must keep computing with Batch 01's weights.
- **Every trainee-visible number needs a plain-language sentence beside it.** A 21-year-old
  seeing "velocity 29" with no explanation will read it as a failing grade.
