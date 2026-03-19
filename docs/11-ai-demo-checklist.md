# AI Demo Checklist (OpenAI Chat V1)

Ngay cap nhat checklist: `2026-03-18`

## 1) Preflight

```powershell
cd d:\CodeKhoaLuan\ELearning\elearning
docker compose -f backend/docker-compose.yml up -d
docker compose -f backend/docker-compose.yml ps
npm --prefix frontend run dev
```

Kiem tra cac service chinh:
- `database`
- `redis`
- `directus`
- `ai-api`

## 2) Health Check

```powershell
cd d:\CodeKhoaLuan\ELearning\elearning
$env:AI_INTERNAL_KEY = ((Get-Content backend/.env | Where-Object { $_ -match '^AI_INTERNAL_KEY=' } | Select-Object -First 1) -split '=',2)[1].Trim()
Invoke-RestMethod -Method Get -Uri "http://localhost:8090/v1/health"
```

Dieu kien bat buoc:
- `OPENAI_API_KEY` da duoc set trong `backend/.env`
- `ai-api` tra ve `{"status":"ok","service":"ai-api"}`

## 3) Demo UI

1. Dang nhap `student@elearning.dev / Student@123`
2. Mo dashboard va bat launcher `AI Chat`
3. Thu hoi:
   - `Khoa React nao phu hop cho nguoi moi bat dau?`
   - `Tom tat noi dung chinh cua khoa Python co ban.`
   - `Module nao trong khoa Next.js noi ve routing?`
4. Xac nhan:
   - Chat tra loi theo du lieu course/module/lesson that
   - Co reference cards den course/module/lesson
   - Co follow-up question
   - Co feedback `Huu ich` / `Chua on`

## 4) API Demo

```powershell
cd d:\CodeKhoaLuan\ELearning\elearning
$env:AI_INTERNAL_KEY = ((Get-Content backend/.env | Where-Object { $_ -match '^AI_INTERNAL_KEY=' } | Select-Object -First 1) -split '=',2)[1].Trim()
$studentId = "15b74e8d-5f05-4a25-b395-196876e77231"

$chat = @{
  user_id = $studentId
  role = "student"
  message = "Khoa React nao phu hop cho nguoi moi bat dau?"
  current_path = "/dashboard"
} | ConvertTo-Json -Depth 8

$response = Invoke-RestMethod -Method Post -Uri "http://localhost:8090/v1/chat" -Headers @{ "X-AI-Internal-Key" = $env:AI_INTERNAL_KEY } -ContentType "application/json" -Body $chat
$response | ConvertTo-Json -Depth 8
```

Ky vong:
- Co `conversation_id`
- Co `assistant_message_id`
- `data.answer` la chuoi
- `data.references` la mang cac reference course/module/lesson

## 5) Feedback Demo

```powershell
cd d:\CodeKhoaLuan\ELearning\elearning
$feedback = @{
  user_id = $studentId
  conversation_id = $response.conversation_id
  message_id = $response.assistant_message_id
  mode = "chat"
  rating = 1
  comment = "Tra loi dung du lieu khoa hoc"
  include_in_training = $true
} | ConvertTo-Json -Depth 8

Invoke-RestMethod -Method Post -Uri "http://localhost:8090/v1/feedback" -Headers @{ "X-AI-Internal-Key" = $env:AI_INTERNAL_KEY } -ContentType "application/json" -Body $feedback | ConvertTo-Json -Depth 6
```

## 6) Quick Recovery

```powershell
docker compose -f backend/docker-compose.yml logs --tail=200 ai-api
docker compose -f backend/docker-compose.yml restart ai-api
```

Neu chat loi:
- Kiem tra `OPENAI_API_KEY`
- Kiem tra `AI_INTERNAL_KEY`
- Kiem tra DB/Redis/Directus da san sang
