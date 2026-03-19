# AI Docs Completion Checklist

## Completion Status
- `AI roadmap status`: Complete for product acceptance.
- `Wireframe status`: Complete at the accepted shipped IA level.
- `Current blocker count`: `0`
- The remaining item below is explicitly optional follow-on scope and does not block calling the AI docs `100% complete`.

## Must Finish To Call Docs Complete
- [x] Build Course Detail - AI Course Advisor
  - Acceptance criteria: public course detail page shows a grounded AI side panel with fit summary, prerequisites, target audience, quick syllabus, and a continue-in-chat CTA.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/components/features/course-ai-advisor.tsx`, `frontend/src/app/(public)/courses/[slug]/page.tsx`, `frontend/src/app/api/ai/course-advisor/route.ts`, `backend/ai/app/course_advisor_service.py`

- [x] Add explicit Help / FAQ blocks on dashboard, course detail, and lesson pages
  - Acceptance criteria: each page renders a deterministic FAQ/help block with short operational guidance and CTA behavior that opens chat or links to the right place.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/components/features/ai-faq-block.tsx`, `frontend/src/lib/ai-faq.ts`, `frontend/src/app/(student)/(portal)/dashboard/page.tsx`, `frontend/src/app/(public)/courses/[slug]/page.tsx`, `frontend/src/app/(student)/learn/[courseSlug]/[lessonSlug]/page.tsx`

- [x] Standardize major AI UI states
  - Acceptance criteria: major AI surfaces visibly support `empty`, `loading`, `success`, `no-data`, `error`, and `restricted` where relevant.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/components/features/ai-surface-state.tsx`, `frontend/src/components/features/course-ai-advisor.tsx`, `frontend/src/components/features/lesson-study-assistant.tsx`, `frontend/src/components/features/quiz-mistake-review.tsx`, `frontend/src/components/features/dashboard-ai-coach.tsx`

- [x] Formalize shared AI UI primitives
  - Acceptance criteria: reusable `AiInsightCard`, reusable `AiSidePanelShell`, reusable `AiSurfaceState`, and reusable `AiFaqBlock` exist and are used by multiple AI surfaces.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/components/features/ai-insight-card.tsx`, `frontend/src/components/features/ai-side-panel-shell.tsx`, `frontend/src/components/features/ai-surface-state.tsx`, `frontend/src/components/features/ai-faq-block.tsx`

- [x] Close remaining lesson-study wireframe gaps
  - Acceptance criteria: lesson study keeps the documented four tabs and supports beginner explanation, example-oriented explanation, study-notes transformation, explicit no-data behavior for `metadata_only`, and explicit restricted handling during quiz mode.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/components/features/lesson-study-assistant.tsx`, `backend/ai/app/chat_service.py`, `frontend/src/lib/ai-schemas.ts`

## Nice-to-Have Polish
- [x] Formalize AI design tokens more explicitly
  - Acceptance criteria: shared color, badge, and trust-style tokens are extracted beyond the current component-level patterns.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/app/globals.css`, `frontend/src/lib/ai-ui-types.ts`, `frontend/src/components/features/ai-insight-card.tsx`, `frontend/src/components/features/ai-side-panel-shell.tsx`, `frontend/src/components/features/ai-surface-state.tsx`

- [x] Standardize the global chat modal on the same primitive set
  - Acceptance criteria: chat modal empty/error helper cards fully reuse the shared AI surface primitives.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/components/features/ai-chat-panel.tsx`, `frontend/src/components/features/ai-chat-widget.tsx`

- [x] Improve instructor review rail visual consistency further
  - Acceptance criteria: AI suggestion rail fully adopts the shared state primitives and visual hierarchy.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/components/features/instructor-assignment-review-workspace.tsx`, `frontend/src/components/features/ai-insight-card.tsx`, `frontend/src/components/features/ai-surface-state.tsx`

## Final Partial Completion Pass
- [x] Curated external references for lesson recommendations
  - Acceptance criteria: lesson references can optionally return curated external resources with reviewable provenance.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `backend/ai/app/p2_service.py`, `backend/scripts/bootstrap.mjs`, `frontend/src/components/features/lesson-study-assistant.tsx`, `frontend/src/lib/ai-schemas.ts`

- [x] Align lesson assistant tabs and sections to wireframe wording
  - Acceptance criteria: lesson assistant uses the documented IA with clear `Summary / Q&A / References / Common pitfalls` equivalents, while preserving lesson-scoped chat and structured study support.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/components/features/lesson-study-assistant.tsx`, `backend/ai/app/chat_service.py`, `frontend/src/lib/ai-schemas.ts`

- [x] Complete final shared AI state consistency pass
  - Acceptance criteria: `AiSurfaceState` is the default non-success state renderer across the major AI surfaces, with consistent CTA behavior and trust styling.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/components/features/ai-surface-state.tsx`, `frontend/src/components/features/lesson-study-assistant.tsx`, `frontend/src/components/features/ai-chat-panel.tsx`, `frontend/src/components/features/quiz-mistake-review.tsx`, `frontend/src/components/features/course-ai-advisor.tsx`, `frontend/src/components/features/instructor-assignment-review-workspace.tsx`

- [x] AI analytics in admin reports
  - Acceptance criteria: existing tracking events feed an admin reporting section with adoption, safety, and quality metrics.
  - Owner: `TBD`
  - Status: `Implemented`
  - Implementation reference: `frontend/src/lib/ai-tracking.ts`, `frontend/src/app/api/ai/events/route.ts`, `backend/scripts/bootstrap.mjs`, `frontend/src/lib/queries/admin.ts`, `frontend/src/app/(admin)/admin/reports/page.tsx`, `frontend/src/app/(admin)/admin/reports/report-charts.tsx`

## Can Be Deferred
- [ ] Broader non-core page FAQ rollout
  - Acceptance criteria: the same deterministic help pattern is extended to additional pages outside dashboard, course detail, and lesson.
  - Owner: `TBD`
  - Status: `Deferred - non-blocking`
  - Implementation reference: `TBD`
