from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
from datetime import date, timedelta
import sqlite3
import re
import io

try:
    import fitz
except ImportError:
    fitz = None

try:
    from docx import Document
except ImportError:
    Document = None

APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR / "opportunity_ai.db"

app = FastAPI(title="Opportunity AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SKILL_BANK = [
    "python", "java", "javascript", "react", "html", "css", "sql",
    "machine learning", "data analysis", "communication", "leadership",
    "project management", "excel", "power bi", "figma", "ui/ux",
    "research", "cloud computing", "aws", "git", "fastapi", "c++",
    "public speaking", "problem solving", "statistics"
]

SEED = [
    {
        "title": "National Merit Scholarship",
        "organization": "Education Opportunity Foundation",
        "category": "Scholarship",
        "description": "Merit-based support for undergraduate students with strong academic performance.",
        "location": "India · Multiple locations",
        "deadline": (date.today() + timedelta(days=18)).isoformat(),
        "skills": ["communication", "research", "leadership"],
        "eligibility": ["undergraduate", "academic record", "india"],
        "link": "https://scholarships.gov.in/",
        "type": "Education"
    },
    {
        "title": "Junior Data Analyst Internship",
        "organization": "Northstar Analytics",
        "category": "Internship",
        "description": "Work with a product analytics team to clean datasets, build reports and communicate insights.",
        "location": "Remote · India",
        "deadline": (date.today() + timedelta(days=9)).isoformat(),
        "skills": ["python", "sql", "data analysis", "excel"],
        "eligibility": ["graduate", "student", "python", "sql"],
        "link": "https://www.ncs.gov.in/",
        "type": "Career"
    },
    {
        "title": "Graduate Software Engineer",
        "organization": "Open Systems Labs",
        "category": "Job",
        "description": "Entry-level engineering role focused on web applications, APIs and collaborative development.",
        "location": "Bengaluru · Hybrid",
        "deadline": (date.today() + timedelta(days=24)).isoformat(),
        "skills": ["javascript", "react", "python", "git"],
        "eligibility": ["graduate", "computer science", "engineering"],
        "link": "https://www.ncs.gov.in/",
        "type": "Career"
    },
    {
        "title": "Public Policy Research Fellowship",
        "organization": "Civic Futures Institute",
        "category": "Fellowship",
        "description": "A guided fellowship for emerging researchers interested in public policy and social impact.",
        "location": "New Delhi · Hybrid",
        "deadline": (date.today() + timedelta(days=31)).isoformat(),
        "skills": ["research", "communication", "statistics", "writing"],
        "eligibility": ["graduate", "research", "india"],
        "link": "https://www.india.gov.in/",
        "type": "Fellowship"
    },
    {
        "title": "Digital Skills Development Programme",
        "organization": "Public Skills Initiative",
        "category": "Government Scheme",
        "description": "Training pathways and resources for citizens building foundational digital skills.",
        "location": "India · Online",
        "deadline": (date.today() + timedelta(days=45)).isoformat(),
        "skills": ["communication", "problem solving", "computer skills"],
        "eligibility": ["india", "citizen"],
        "link": "https://www.skillindia.gov.in/",
        "type": "Government"
    },
    {
        "title": "Frontend Developer Internship",
        "organization": "PixelSpring Studio",
        "category": "Internship",
        "description": "Build accessible interfaces and reusable components with a product design team.",
        "location": "Remote",
        "deadline": (date.today() + timedelta(days=6)).isoformat(),
        "skills": ["html", "css", "javascript", "react", "figma"],
        "eligibility": ["student", "graduate", "frontend"],
        "link": "https://internshala.com/",
        "type": "Career"
    }
]

def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS opportunities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                organization TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                location TEXT NOT NULL,
                deadline TEXT NOT NULL,
                skills TEXT NOT NULL,
                eligibility TEXT NOT NULL,
                link TEXT NOT NULL,
                type TEXT NOT NULL
            )
        """)
        count = conn.execute("SELECT COUNT(*) FROM opportunities").fetchone()[0]
        if count == 0:
            for item in SEED:
                conn.execute("""
                    INSERT INTO opportunities
                    (title, organization, category, description, location, deadline,
                     skills, eligibility, link, type)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item["title"], item["organization"], item["category"],
                    item["description"], item["location"], item["deadline"],
                    "|".join(item["skills"]), "|".join(item["eligibility"]),
                    item["link"], item["type"]
                ))

def row_to_dict(row):
    data = dict(row)
    data["skills"] = data["skills"].split("|") if data["skills"] else []
    data["eligibility"] = data["eligibility"].split("|") if data["eligibility"] else []
    return data

@app.on_event("startup")
def startup():
    init_db()

@app.get("/")
def home():
    return {"message": "Opportunity AI API is running", "docs": "/docs"}

@app.get("/api/opportunities")
def get_opportunities(search: str = "", category: str = "All"):
    with connect() as conn:
        rows = conn.execute("SELECT * FROM opportunities ORDER BY deadline ASC").fetchall()
    items = [row_to_dict(row) for row in rows]
    q = search.strip().lower()
    if q:
        items = [x for x in items if q in " ".join([
            x["title"], x["organization"], x["description"], x["location"],
            x["category"], " ".join(x["skills"])
        ]).lower()]
    if category and category != "All":
        items = [x for x in items if x["category"] == category]
    return items

@app.get("/api/stats")
def stats():
    with connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM opportunities").fetchone()[0]
        categories = conn.execute("SELECT COUNT(DISTINCT category) FROM opportunities").fetchone()[0]
    return {"total_opportunities": total, "categories": categories, "new_this_week": 3}

class MatchRequest(BaseModel):
    skills: list[str] = Field(default_factory=list)
    education: str = ""
    interests: list[str] = Field(default_factory=list)


def score_item(item, user_skills, education, interests):
    # Normalize skills for accurate comparison
    required = {s.strip().lower() for s in item["skills"]}
    have = {s.strip().lower() for s in user_skills}

    # Calculate skill match percentage
    overlap = required & have
    skill_score = round(100 * len(overlap) / max(len(required), 1))

    # Check education-related eligibility requirements
    eligibility_terms = [x.strip().lower() for x in item["eligibility"]]
    education_text = education.strip().lower()

    education_levels = {
        "undergraduate", "undergrad", "graduate",
        "postgraduate", "post-graduate", "student",
        "high school", "diploma", "phd", "doctoral",
        "bachelor", "master"
    }

    education_requirements = [
        term for term in eligibility_terms
        if term in education_levels
    ]

    if education_requirements:
        education_match = any(
            re.search(r"\b" + re.escape(term) + r"\b", education_text)
            for term in education_requirements
        )
    else:
        education_match = None

    # Check whether the opportunity matches user interests
    opportunity_text = (
        item["category"] + " " + item["description"]
    ).lower()

    interest_match = any(
        interest.strip().lower() in opportunity_text
        for interest in interests
        if interest.strip()
    )

    # Calculate final match score
    eligibility_points = 20 if education_match is True else 0
    interest_points = 10 if interest_match else 0

    score = min(
        100,
        round(skill_score * 0.7 + eligibility_points + interest_points)
    )

    # Identify skills the user still needs
    missing = sorted(required - have)

    return {
        **item,
        "match_score": score,
        "matched_skills": sorted(overlap),
        "missing_skills": missing,
        "eligibility_status": (
            "Review requirements"
            if education_match is False
            else "Likely match"
        )
    }


@app.post("/api/match")
def match(request: MatchRequest):
    with connect() as conn:
        rows = conn.execute("SELECT * FROM opportunities").fetchall()
    items = [row_to_dict(row) for row in rows]
    results = [score_item(x, request.skills, request.education, request.interests) for x in items]
    return sorted(results, key=lambda x: x["match_score"], reverse=True)

def extract_text(filename: str, content: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        if fitz is None:
            raise HTTPException(500, "PDF support is unavailable. Install PyMuPDF.")
        try:
            with fitz.open(stream=content, filetype="pdf") as pdf:
                return "\n".join(page.get_text() for page in pdf)
        except Exception:
            raise HTTPException(400, "Could not read this PDF. Please try another file.")
    if suffix == ".docx":
        if Document is None:
            raise HTTPException(500, "DOCX support is unavailable. Install python-docx.")
        try:
            doc = Document(io.BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception:
            raise HTTPException(400, "Could not read this DOCX file.")
    if suffix == ".txt":
        return content.decode("utf-8", errors="ignore")
    raise HTTPException(400, "Unsupported file type. Upload PDF, DOCX, or TXT.")

@app.post("/api/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(400, "Please choose a file.")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, "File is too large. Maximum size is 5 MB.")
    text = extract_text(file.filename, content)
    if not text.strip():
        raise HTTPException(400, "No readable text found. If this is a scanned PDF, use a text-based PDF.")
    normalized = re.sub(r"\s+", " ", text.lower())
    found = []
    for skill in SKILL_BANK:
        pattern = r"(?<![a-z0-9+#])" + re.escape(skill.lower()) + r"(?![a-z0-9+#])"
        if re.search(pattern, normalized):
            found.append(skill)
    # Return a short preview only; raw resume text is not persisted.
    return {
        "filename": file.filename,
        "skills": found,
        "text_preview": text[:700],
        "word_count": len(text.split()),
        "message": "Resume analyzed. Please verify the extracted skills before using matches."
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
