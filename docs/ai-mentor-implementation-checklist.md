# AI Mentor Implementation Checklist

## Completed

- [x] Upgrade AI backend schema for mentor risk metrics in `learning_progress`
- [x] Add `mentor_recommendations` table for shown/clicked/completed outcomes
- [x] Compute `inactive_days`, `failed_quiz_attempts_7d`, `streak_days`, `risk_score`, `risk_band`
- [x] Support multi-course mentor planning instead of single-course summary
- [x] Change mentor CTA to deep-link directly into lesson routes
- [x] Attach `recommendation_id` to mentor plan items
- [x] Track recommendation clicks from frontend
- [x] Mark recommendation completed when matching `lesson_complete` event arrives
- [x] Expose instructor risk endpoint from AI backend
- [x] Render at-risk student panel on instructor dashboard
- [x] Add dismissal tracking for recommendations
- [x] Add notification/email triggers for high-risk interventions
- [x] Add instructor action buttons for sending intervention directly
- [x] Add analytics view for recommendation CTR and completion lift

## Follow-up

- [ ] Add richer quiz-topic weakness signals to risk engine
- [ ] Add per-action outcome slices by intervention type and course
- [ ] Add auto-trigger cooldown rules to avoid over-notifying inactive students
