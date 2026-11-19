# Opportunity AI — Working MVP

A full-stack hackathon prototype for discovering opportunities, analyzing resumes,
matching skills, checking eligibility, and tracking deadlines.

## Requirements
- Python 3.10+
- Node.js 18+

## 1. Start the backend

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload
```

Backend: http://localhost:8000  
API documentation: http://localhost:8000/docs

## 2. Start the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite (normally http://localhost:5173).

## 3. Try the prototype
1. Open Dashboard.
2. Upload a PDF or DOCX resume in Resume Analyzer.
3. Review extracted skills and edit them if necessary.
4. Open Discover to search and filter sample opportunities.
5. Open Matches to see skill-based recommendations and eligibility gaps.
6. Open Skill Gaps to see skills to improve.
7. Open Deadlines to see upcoming closing dates.

## Notes
- The app seeds a small set of clearly labeled demo opportunities in SQLite.
- Matching is a transparent baseline algorithm, not a trained or guaranteed AI model.
- Resume extraction is best-effort. Scanned/image-only PDFs may need OCR, which is not included.
- No real external scraping or email delivery is enabled. Add official APIs/RSS feeds and
  a notification provider only after checking their terms and permissions.
- This is a demo MVP. Before production, add authentication, authorization, encryption,
  malware scanning, rate limiting, audit logging, secure file handling, and privacy controls.
