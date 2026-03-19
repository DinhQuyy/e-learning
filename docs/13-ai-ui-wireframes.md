# AI UI Wireframes

Last updated: `2026-03-19`

This document describes text wireframes for the proposed AI screens in the project.
The goal is to help frontend, product, and design align quickly on:

- where AI should appear
- what users should see first
- which actions should be primary
- which states must exist

---

## 1. Global AI Chat

### 1.1. Purpose

- shared entry point for AI Q&A
- used for:
  - general questions
  - course / lesson questions
  - platform usage questions

### 1.2. Placement

- fixed launcher in the bottom-right corner
- opens into a modal chat panel

### 1.3. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ AI Copilot                                                                  │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ LEFT RAIL                     │ MAIN CHAT                                    │
│                               │                                              │
│ [Badge: OpenAI Copilot]       │ Header: Kognify AI                           │
│ Ask anything, with learning   │ Subtitle: general + course + lesson support  │
│ and platform support first    │                                              │
│                               │ ┌──────────────────────────────────────────┐ │
│ Context card:                 │ │ Assistant answer bubble                  │ │
│ - Current page: React lesson  │ │ - answer                                 │ │
│ - Course: React ...           │ │ - references                             │ │
│                               │ │ - suggested questions                    │ │
│ Quick prompts:                │ └──────────────────────────────────────────┘ │
│ - Summarize this lesson       │                                              │
│ - Explain more simply         │ ┌──────────────────────────────────────────┐ │
│ - How do I enroll?            │ │ User bubble                              │ │
│ - Show related references     │ └──────────────────────────────────────────┘ │
│                               │                                              │
│                               │ Input area                                  │
│                               │ [textarea..............................]     │
│                               │ [Shift+Enter note]           [Send]         │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

### 1.4. Mobile Wireframe

```text
┌──────────────────────────────┐
│ AI Copilot            [X]    │
├──────────────────────────────┤
│ Context chip                 │
│ Quick prompts (horizontal)   │
├──────────────────────────────┤
│ Chat thread                  │
│ - assistant                  │
│ - user                       │
│ - references                 │
├──────────────────────────────┤
│ [textarea.................]  │
│ [Send]                       │
└──────────────────────────────┘
```

### 1.5. Required blocks

- context chip: `What lesson / course are you viewing`
- page-specific starter prompts
- chat thread
- reference cards
- feedback buttons

### 1.6. States

- empty: suggested prompts
- loading: thinking row / skeleton
- success
- no-data: `No matching data found in the platform`
- restricted: badge and copy change on quiz pages

---

## 2. Student Dashboard - AI Learning Coach

### 2.1. Purpose

- show students what to do next immediately
- remind them about unfinished learning
- avoid forcing them to start from a blank chat

### 2.2. Placement

- top section of the student dashboard, above active course lists

### 2.3. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ AI Learning Coach                                                           │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ What to study today           │ Alerts / reminders                           │
│                               │                                              │
│ [Course thumbnail]            │ [!] 3 unfinished lessons                     │
│ React and Next.js ...         │ [!] 1 quiz not attempted                     │
│ Next lesson: Routing          │ [!] 2 courses inactive for 7 days            │
│ Reason: you are mid-module    │                                              │
│ [Continue learning] [Why?]    │ [View list] [Remind me tonight]              │
├───────────────────────────────┴──────────────────────────────────────────────┤
│ 7-day progress                                                            │
│ [heatmap / streak / course-level progress bars]                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 2.4. Mobile Wireframe

```text
┌──────────────────────────────┐
│ AI Learning Coach            │
├──────────────────────────────┤
│ Card 1: What to study today  │
│ [Continue learning]          │
├──────────────────────────────┤
│ Card 2: Unfinished work      │
│ [View list]                  │
├──────────────────────────────┤
│ Card 3: 7-day progress       │
└──────────────────────────────┘
```

### 2.5. Required blocks

- `Next best action`
- `Reminder list`
- `Weekly progress`
- clear CTAs

### 2.6. What to avoid

- do not turn the dashboard into a chat-first page
- do not show too many AI insights at once

---

## 3. Course Detail Page - AI Course Advisor

### 3.1. Purpose

- help users judge whether a course fits them
- summarize syllabus, goals, level, and prerequisites

### 3.2. Placement

- in the hero area or sticky right-side panel

### 3.3. Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Course Header                                                               │
│ [thumbnail] [title] [rating] [price] [Enroll]                               │
├──────────────────────────────────────┬───────────────────────────────────────┤
│ Course description / modules         │ AI Course Advisor                     │
│                                      │                                       │
│ [tabs: overview | content | reviews] │ - Who is this course for?             │
│                                      │ - What will I learn quickly?          │
│                                      │ - What should I know first?           │
│                                      │                                       │
│                                      │ [Summarize course]                    │
│                                      │ [Compare with another course]         │
│                                      │ [Show quick syllabus]                 │
│                                      │ [Ask AI]                              │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

### 3.4. Required blocks

- fit summary
- prerequisite summary
- target audience summary
- CTA `Continue in chat`

---

## 4. Lesson Page - AI Study Assistant

### 4.1. Purpose

- this is the most important screen for `full lesson body analysis`
- help users understand content deeply without leaving the lesson

### 4.2. Placement

- desktop: right-side panel
- mobile: bottom sheet or sticky tab

### 4.3. Desktop Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Lesson Header                                                               │
│ [Course > Module > Lesson]                                                  │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ Lesson navigation             │ Lesson content                               │
│ - module list                 │                                              │
│ - lesson list                 │ [video / text content / quiz block]          │
│                               │                                              │
├───────────────────────────────┼──────────────────────────────────────────────┤
│ AI Study Assistant            │                                              │
│                               │                                              │
│ Tabs:                         │                                              │
│ [Summary] [Explain]           │                                              │
│ [References] [Q&A]            │                                              │
│                               │                                              │
│ Summary tab:                  │                                              │
│ - 5 key points                │                                              │
│ - 3 likely misunderstandings  │                                              │
│ - 2 self-check questions      │                                              │
│                               │                                              │
│ Explain tab:                  │                                              │
│ [Explain for beginners]       │                                              │
│ [Explain with example]        │                                              │
│ [Turn into study notes]       │                                              │
│                               │                                              │
│ References tab:               │                                              │
│ [Foundations] [Examples]      │                                              │
│ [Advanced]                    │                                              │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

### 4.4. Mobile Wireframe

```text
┌──────────────────────────────┐
│ Lesson content               │
│ ...                          │
├──────────────────────────────┤
│ [AI Study ^]                 │
└──────────────────────────────┘

When opened:

┌──────────────────────────────┐
│ AI Study              [X]    │
├──────────────────────────────┤
│ Tabs                         │
│ Summary | Explain | Ask      │
├──────────────────────────────┤
│ Tab content                  │
└──────────────────────────────┘
```

### 4.5. Primary CTAs

- `Summarize this lesson`
- `Explain for beginners`
- `Extract key points`
- `Find likely misunderstandings`
- `Suggest references`

### 4.6. States

- no-content: lesson has only video / minimal metadata
- loading summary
- restricted if the lesson is inside an assessment flow

---

## 5. Quiz Result Page - AI Mistake Review

### 5.1. Purpose

- show students why they answered incorrectly
- guide them back to the correct lesson / concept

### 5.2. Placement

- directly below the quiz result summary

### 5.3. Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Quiz Result                                                                 │
│ Score: 6/10 | Not passed                                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ AI Mistake Review                                                           │
├───────────────────────────────┬──────────────────────────────────────────────┤
│ Mistake clusters              │ Recovery plan                                │
│                               │                                              │
│ [1] Several answers show      │ - Review Lesson A                            │
│ confusion about routing       │ - Review Lesson B                            │
│                               │ - Retake quiz after review                   │
│ [2] You often miss key        │                                              │
│ conditions in questions       │ [Open related lesson]                        │
│                               │ [Summarize concept again]                    │
│ [See question-level detail]   │ [Ask AI why I keep missing this]             │
└───────────────────────────────┴──────────────────────────────────────────────┘
```

### 5.4. Per-question detail

```text
Question card
- Question
- Your selected answer
- Correct answer
- Why it was wrong
- What concept was confused
- Which lesson to review
```

### 5.5. What to avoid

- do not show AI as a simple answer-reveal tool
- focus on `why it was wrong` and `how to fix it`

---

## 6. Quiz In Progress - Restricted AI Mode

### 6.1. Purpose

- make AI limits explicit during assessments
- prevent the experience from feeling like a bug or inconsistency

### 6.2. Placement

- banner above the quiz area
- AI launcher still exists but switches to limited behavior

### 6.3. Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Quiz in progress                                                            │
│ Time left: 08:21                                                            │
├──────────────────────────────────────────────────────────────────────────────┤
│ [!] AI is limited during assessment                                         │
│ AI will not provide direct answers. You may still ask about:                │
│ - platform usage                                                            │
│ - how to submit                                                             │
│ - where to review the quiz after submission                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ Questions...                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.4. When chat is opened

```text
AI Restricted Panel
- Badge: Assessment mode
- Disabled prompt chips:
  x Give me the answer
  x Solve this question
- Allowed chips:
  ✓ How do I submit?
  ✓ How many attempts do I have?
  ✓ Where do I review this after submission?
```

---

## 7. Help / System Guidance Experience

### 7.1. Purpose

- guide users on how to use the e-learning system
- reduce repetitive support questions

### 7.2. Placement

- starter prompts in global chat
- FAQ section on key pages
- empty-state help

### 7.3. Wireframe

```text
Dashboard / lesson / course page

[Need help?]
- How do I enroll in a course?
- Where do I see my progress?
- When do I get a certificate?
- How do I take a quiz?

[Ask AI]
```

### 7.4. Copywriting requirements

- short
- practical
- action-oriented

---

## 8. Instructor Copilot Workspace (Future)

### 8.1. Condition

Only build this when:

- assignments / submissions exist
- rubrics exist
- review workflow exists

### 8.2. Wireframe

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Instructor Review Workspace                                                 │
├──────────────────────────────────────┬───────────────────────────────────────┤
│ Student submission                   │ Rubric + AI suggestion                │
│                                      │                                       │
│ [submission content]                 │ Criterion 1: 7/10                     │
│                                      │ Criterion 2: 8/10                     │
│ [highlighted sections]               │                                       │
│                                      │ Suggested AI feedback:                │
│                                      │ "... "                                │
│                                      │                                       │
│                                      │ [Accept] [Edit] [Hide AI suggestion]  │
└──────────────────────────────────────┴───────────────────────────────────────┘
```

### 8.3. Safety principles

- AI must not finalize scores automatically
- instructor remains the decision-maker
- audit trail is required

---

## 9. Shared Design Tokens and Patterns

### 9.1. AI labels

- `AI Learning Coach`
- `AI Study Assistant`
- `AI Mistake Review`
- `AI Restricted Mode`

### 9.2. Color direction

- Data-backed card: neutral / cyan
- Suggestion card: indigo / slate
- Restricted mode: amber
- Error: rose

### 9.3. Icon direction

- coach: target / calendar
- study: sparkles / book
- mistakes: alert / rotate-ccw
- restricted: shield-alert

---

## 10. Conclusion

The proposed wireframe set shows that AI should be implemented as multiple contextual screens:

- `Global Chat` for Q&A and platform help
- `Dashboard Coach` for progress and reminders
- `Lesson Study Panel` for full lesson body analysis
- `Quiz Review` for common mistakes
- `Restricted Mode` for assessment

This is the most practical UI direction for the current E-Learning project, instead of relying on a single generic chat box.
