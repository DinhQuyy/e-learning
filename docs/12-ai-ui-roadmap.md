# AI UI Roadmap

Last updated: `2026-03-19`

## 1. Goal

This document defines the UI roadmap for AI features that fit the current E-Learning platform.
The recommended direction is:

- do not turn AI into a single chat widget for every use case
- use `one AI core + context-specific UI`
- prioritize features grounded in existing data: `progress`, `enrollment`, `lesson content`, `quiz attempts`
- use chat for Q&A and explanation, but use cards/panels/workspaces for insights and actions

## 2. Design Principles

### 2.1. Use contextual UI, not chat for everything

- Dashboard: AI should appear as a `coach panel`
- Lesson page: AI should appear as a `study assistant`
- Quiz result: AI should appear as a `mistake review`
- Quiz in progress: AI should switch to `restricted mode`
- Global launcher: keep it as a general entry point, not the container for all features

### 2.2. AI should lead to concrete actions

Every AI block should expose clear CTAs:

- `Continue learning`
- `Review related lesson`
- `Remind me later`
- `Open lesson`
- `Why this suggestion?`

### 2.3. Clearly separate 3 trust levels

- `Data-backed`: based on internal platform data
- `AI suggestion`: synthesized recommendation or analysis
- `Restricted`: limited assistant behavior during assessment

### 2.4. Avoid AI noise

AI UI should appear in 3 forms:

- `Inline cards`: for quick insights
- `Side panel`: for deeper study, references, summaries
- `Modal / chat panel`: for extended conversation

## 3. Roadmap by Phase

| Phase | Main goal | Primary screens | Value |
| --- | --- | --- | --- |
| P1 | Deliver immediate visible value | Dashboard, global chat, lesson page | High |
| P2 | Increase learning depth and review quality | Lesson page, quiz result | Very high |
| P3 | Add assessment control and advanced copilot flows | Quiz in progress, instructor workspace | High but sensitive |

## 4. Feature-to-Screen Matrix

| Feature | Primary user | Best screen | UI pattern | Priority |
| --- | --- | --- | --- | --- |
| Progress analysis, reminders | Student | Dashboard | Coach cards + action list | P1 |
| Next lesson recommendation | Student | Dashboard, course page | Recommendation rail | P1 |
| Platform usage guidance | Student / Instructor | Global chat + contextual prompts | Chat + FAQ chips | P1 |
| Deep summary from lesson body | Student | Lesson page | Right-side study panel | P1 |
| Reference material suggestions | Student | Lesson page | Reference tray / side panel | P2 |
| Common mistake analysis | Student | Quiz result | Mistake review panel | P2 |
| Review lesson recommendations | Student | Quiz result | Recovery actions | P2 |
| Limit AI during assessments | Student | Quiz page | Restricted mode banner + disabled states | P3 |
| Grading / review copilot | Instructor | Instructor workspace | Split review workspace | P3 |

## 5. Detailed Roadmap

### 5.1. P1 - Immediate AI Value

#### P1.1. Global AI Chat

Goal:

- answer general questions
- answer course / lesson / module questions
- answer platform usage questions

UI:

- launcher in the bottom-right corner
- full modal chat panel
- contextual starter prompts
- reference cards
- suggested questions

Required data:

- user role
- current path
- course / lesson context
- course / lesson content tools

Success criteria:

- users can ask `what is this course`, `what is this lesson about`, `how do I enroll`
- chat-open and message-send rate increases

#### P1.2. Student Dashboard - AI Learning Coach

Goal:

- show students what to do next immediately
- remind them about unfinished work
- explain why the system made a suggestion

UI:

- card `What you should study today`
- card `Where you are falling behind`
- card `Unfinished lessons`
- card `7-day learning target`

Required data:

- enrollments
- progress_percentage
- completed lessons
- last lesson accessed

Success criteria:

- users click `Continue learning` from the dashboard
- drop-off in active courses decreases

#### P1.3. Lesson Page - AI Study Assistant

Goal:

- summarize the current lesson
- explain the lesson deeply from the full lesson body
- answer questions tied to the current lesson

UI:

- right-side panel or `AI Study` tab
- quick actions:
  - `Summarize this lesson`
  - `Explain more simply`
  - `Extract key points`
  - `Show likely misunderstandings`

Required data:

- `lessons.content`
- lesson / module / course context

Success criteria:

- users stay on the lesson page and use AI to understand content more deeply

### 5.2. P2 - Deeper Learning and Smarter Review

#### P2.1. Reference Materials by Lesson

Goal:

- suggest internal or external references relevant to the current lesson

UI:

- section `Reference materials`
- filter by intent:
  - `Foundations`
  - `Read more`
  - `Examples`
  - `Advanced`

Required data:

- lesson body
- topic/tag taxonomy
- curated resource catalog

Success criteria:

- users open relevant references
- structured learning time increases

#### P2.2. Quiz Result - AI Mistake Review

Goal:

- show students why they got answers wrong
- distinguish between `concept confusion` and `knowledge gap`

UI:

- block `Your common mistakes`
- block `Concepts to review`
- block `Lessons to revisit`

Required data:

- quiz attempts
- selected answers
- correct answers
- question explanation
- lesson linkage

Success criteria:

- students revisit related lessons after quiz review
- repeated mistake rate decreases

### 5.3. P3 - Assessment Control and Advanced Workspace

#### P3.1. Quiz In Progress - Restricted AI Mode

Goal:

- reduce misuse of AI for direct answer generation during assessment

UI:

- banner `AI is limited during assessment`
- hide unsafe prompt chips
- only allow:
  - platform usage questions
  - format or submission flow questions
  - post-submission review guidance

Success criteria:

- direct-answer attempts decrease
- UX remains transparent rather than confusing

#### P3.2. Instructor Copilot Workspace

Goal:

- help instructors review work, analyze submissions, and score preliminarily

Condition:

- only build this after the project has clear assignment / submission / rubric flows

UI:

- split workspace
- submission on the left
- rubric + AI suggestion on the right
- instructor always has override control

## 6. Shared Component Set

### 6.1. AI Launcher

- fixed-position button
- status badge support
- opens the chat panel from any page

### 6.2. AI Insight Card

Used for:

- dashboard
- quiz result
- course detail

Required parts:

- title
- insight text
- confidence / source state
- action buttons

### 6.3. AI Side Panel

Used for:

- lesson page
- course page

Tabs:

- `Summary`
- `Q&A`
- `References`
- `Common pitfalls`

### 6.4. Restricted AI Banner

Used for:

- quiz page
- assessment mode

Required parts:

- warning icon
- short policy copy
- list of still-allowed actions

## 7. Required UI States

Every AI screen should support:

- empty
- loading
- success
- no-data
- error
- restricted

## 8. UX Success Metrics

### 8.1. Student-facing

- AI panel / chat open rate
- `Continue learning` click-through rate
- reference material open rate
- return-to-lesson rate from quiz review
- lesson completion rate after reminder prompts

### 8.2. Safety / misuse

- number of blocked prompts in assessment mode
- rate of direct-answer intent prompts
- `not helpful` feedback rate

## 9. Recommended Build Order

1. Global AI Chat and contextual prompts
2. Dashboard Learning Coach
3. Lesson Study Assistant
4. Reference tray on lesson page
5. Quiz Mistake Review
6. Restricted AI Mode in quizzes
7. Instructor Copilot Workspace

## 10. Conclusion

The most suitable AI UI for this project is:

- `one AI core` for Q&A
- `multiple context-specific surfaces` for learning, review, and assessment

If built in the right order, AI becomes more than a polished chat widget:

- a `learning coach` on the dashboard
- a `study assistant` on the lesson page
- a `mistake reviewer` on the quiz result page
- and a `restricted assistant` during assessment
