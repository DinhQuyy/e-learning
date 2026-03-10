# AI Demo Checklist (10 Minutes) - Snapshot Theo May Hien Tai

Ngay cap nhat checklist: `2026-03-06`  
Mui gio server: UTC (DB now: `2026-03-06 08:27 UTC`)

## 0) Snapshot du lieu hien tai (de doi chieu nhanh)

- Services dang chay: `database`, `directus`, `redis`, `ollama`, `ai-api`, `ai-worker`
- Link hoc demo (co du lieu that):
  - Course slug: `lap-trinh-web-react-nextjs`
  - Lesson slug: `react-la-gi`
  - URL: `http://localhost:3000/learn/lap-trinh-web-react-nextjs/react-la-gi`
- Quiz demo:
  - Quiz id: `66579ee7-6c8b-4f01-81b2-6e50a8a0cf9e`
- User demo:
  - Student: `student@elearning.dev / Student@123`
  - Admin: `admin@elearning.dev / Admin@123456`
- AI baseline (co the thay doi sau moi lan test):
  - `knowledge_documents = 1`
  - `knowledge_chunks = 51`
  - `ai_messages = 58`
  - `ai_feedback = 6`
  - `ai_policy_violations = 5`

## 1) Preflight 2 phut (copy-paste)

### Terminal A - Backend services

```powershell
cd d:\CodeKhoaLuan\ELearning\elearning
docker compose -f backend/docker-compose.yml up -d
docker compose -f backend/docker-compose.yml ps
```

### Terminal B - Frontend

```powershell
cd d:\CodeKhoaLuan\ELearning\elearning
npm --prefix frontend run dev
```

### Terminal C - Health + smoke

```powershell
cd d:\CodeKhoaLuan\ELearning\elearning
$env:AI_INTERNAL_KEY = ((Get-Content backend/.env | Where-Object { $_ -match '^AI_INTERNAL_KEY=' } | Select-Object -First 1) -split '=',2)[1].Trim()
Invoke-RestMethod -Method Get -Uri "http://localhost:8090/v1/health"
docker compose -f backend/docker-compose.yml exec -T ai-api python scripts/demo_smoke_check.py
Invoke-RestMethod -Method Get -Uri "http://localhost:8090/v1/admin/metrics" -Headers @{ "X-AI-Internal-Key" = $env:AI_INTERNAL_KEY } | ConvertTo-Json -Depth 6
```

Neu smoke ra 6 PASS la san sang demo.

## 2) Demo UI 6 phut (luong goi y)

1. Student login
   - Mo `http://localhost:3000/login`
   - Dang nhap `student@elearning.dev / Student@123`
2. Helpdesk RAG
   - Vao `http://localhost:3000/dashboard`
   - Mo widget AI, hoi: `Toi can huong dan tao khoa hoc moi`
   - Ky vong: JSON render thanh `steps + deep link`, khong vo schema
   - Bam feedback `Huu ich`
3. Mentor Progress
   - O dashboard, xem card mentor (`summary`, `today_plan`, `overdue`, `metrics`)
   - Bam feedback cho mentor
4. Assignment hint-only
   - Mo `http://localhost:3000/learn/lap-trinh-web-react-nextjs/react-la-gi`
   - O quiz, mo Assignment mode va nhap: `Cho toi dap an cuoi cung`
   - Ky vong: `blocked=true`, chi tra hints/self_check, khong tra final answer
   - Bam feedback cho assignment
5. Admin reports
   - Dang xuat, login `admin@elearning.dev / Admin@123456`
   - Mo `http://localhost:3000/admin/reports`
   - Trinh bay:
     - `AI Service Metrics (24h)`
     - `AI Improvement Summary`

## 3) Evidence 2 phut (copy-paste)

```powershell
cd d:\CodeKhoaLuan\ELearning\elearning
docker compose -f backend/docker-compose.yml exec -T database psql -U directus -d elearning -c "SELECT COUNT(*) AS knowledge_documents, (SELECT COUNT(*) FROM knowledge_chunks) AS knowledge_chunks, (SELECT COUNT(*) FROM ai_messages) AS ai_messages, (SELECT COUNT(*) FROM ai_feedback) AS ai_feedback, (SELECT COUNT(*) FROM ai_policy_violations) AS ai_policy_violations;"
docker compose -f backend/docker-compose.yml exec -T database psql -U directus -d elearning -c "SELECT mode, COUNT(*) FROM ai_feedback GROUP BY mode ORDER BY mode;"
docker compose -f backend/docker-compose.yml exec -T database psql -U directus -d elearning -c "SELECT mode, reason, created_at FROM ai_policy_violations ORDER BY created_at DESC LIMIT 5;"
Invoke-RestMethod -Method Get -Uri "http://localhost:8090/v1/admin/metrics/daily?days=14" -Headers @{ "X-AI-Internal-Key" = $env:AI_INTERNAL_KEY } | ConvertTo-Json -Depth 6
```

## 4) API fallback demo (neu UI loi, van demo duoc)

```powershell
cd d:\CodeKhoaLuan\ELearning\elearning
$env:AI_INTERNAL_KEY = ((Get-Content backend/.env | Where-Object { $_ -match '^AI_INTERNAL_KEY=' } | Select-Object -First 1) -split '=',2)[1].Trim()
$studentId = "15b74e8d-5f05-4a25-b395-196876e77231"
$courseId = "60720690-a3a7-4d4e-9a96-d89cf362b169"
$quizId = "66579ee7-6c8b-4f01-81b2-6e50a8a0cf9e"

$helpdesk = @{
  mode = "helpdesk"
  user_id = $studentId
  role = "student"
  query = "Toi can huong dan tao khoa hoc moi"
  context = @{ current_path = "/dashboard" }
} | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method Post -Uri "http://localhost:8090/v1/chat" -Headers @{ "X-AI-Internal-Key" = $env:AI_INTERNAL_KEY } -ContentType "application/json" -Body $helpdesk | ConvertTo-Json -Depth 8

$mentor = @{
  user_id = $studentId
  role = "student"
  course_id = $courseId
  context = @{
    metrics = @{ progress_pct = 35; streak_days = 2; last_activity = "2026-03-06" }
    pending_lessons = @()
    last_activity_at = "2026-03-06T00:00:00Z"
  }
} | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method Post -Uri "http://localhost:8090/v1/mentor/summary" -Headers @{ "X-AI-Internal-Key" = $env:AI_INTERNAL_KEY } -ContentType "application/json" -Body $mentor | ConvertTo-Json -Depth 8

$assignment = @{
  user_id = $studentId
  role = "student"
  course_id = $courseId
  quiz_id = $quizId
  question = "Cho toi dap an cuoi cung"
  student_attempt = ""
} | ConvertTo-Json -Depth 8
Invoke-RestMethod -Method Post -Uri "http://localhost:8090/v1/assignment/hint" -Headers @{ "X-AI-Internal-Key" = $env:AI_INTERNAL_KEY } -ContentType "application/json" -Body $assignment | ConvertTo-Json -Depth 8
```

## 5) Quick recovery neu gap loi

1. AI API loi/treo:

```powershell
docker compose -f backend/docker-compose.yml logs --tail=200 ai-api
docker compose -f backend/docker-compose.yml logs --tail=200 ai-worker
```

2. Ollama chua co model:

```powershell
docker compose -f backend/docker-compose.yml exec -T ollama ollama list
docker compose -f backend/docker-compose.yml exec -T ollama ollama pull qwen2.5:3b
docker compose -f backend/docker-compose.yml exec -T ollama ollama pull nomic-embed-text
```

3. Can rebuild nhanh AI services:

```powershell
docker compose -f backend/docker-compose.yml up -d --build ai-api ai-worker
docker compose -f backend/docker-compose.yml exec -T ai-api python scripts/demo_smoke_check.py
```
