
import sqlite3
import httpx
import re

from pathlib import Path
from bs4 import BeautifulSoup

# Use the same database as main.py
APP_DIR = Path(__file__).resolve().parent
DB_PATH = APP_DIR / "opportunity_ai.db"

REMOTIVE_API = "https://remotive.com/api/remote-jobs"


def extract_skills(tags, description):
    """Extract skills from job tags and descriptions."""

    skills = set()

    if isinstance(tags, list):
        for tag in tags:
            if isinstance(tag, str) and tag.strip():
                skills.add(tag.strip().lower())

    known_skills = [
        "python", "java", "javascript", "react", "html", "css",
        "sql", "machine learning", "data analysis", "excel",
        "communication", "leadership", "project management",
        "figma", "aws", "git", "c++", "cloud computing",
        "marketing", "research", "writing"
    ]

    text = description.lower()

    for skill in known_skills:
        if skill in text:
            skills.add(skill)

    return sorted(skills)[:20]


def fetch_remotive_jobs():
    """Fetch current remote jobs from Remotive."""

    print("Connecting to Remotive...")

    response = httpx.get(
        REMOTIVE_API,
        timeout=30,
        headers={"User-Agent": "OpportunityAI/1.0"}
    )

    response.raise_for_status()

    data = response.json()
    jobs = data.get("jobs", [])

    print(f"Received {len(jobs)} listings from Remotive.")

    return jobs[:100]


def save_opportunities(jobs):
    """Save new opportunities without duplicating existing links."""

    inserted = 0

    with sqlite3.connect(DB_PATH) as conn:

        # Confirm that the existing application database is ready.
        table = conn.execute(
            """
            SELECT name FROM sqlite_master
            WHERE type='table' AND name='opportunities'
            """
        ).fetchone()

        if not table:
            raise RuntimeError(
                "Database not found. Start main.py once first "
                "to create the opportunities table."
            )

        for job in jobs:

            title = job.get("title", "").strip()
            organization = job.get("company_name", "Unknown company")
            link = job.get("url", "").strip()

            if not title or not link:
                continue

            # Avoid duplicate listings.
            existing = conn.execute(
                "SELECT id FROM opportunities WHERE link = ?",
                (link,)
            ).fetchone()

            if existing:
                continue

            # Convert HTML description into readable text.
            raw_description = job.get("description", "")
            description = BeautifulSoup(
                raw_description, "html.parser"
            ).get_text(" ", strip=True)

            description = description[:3000]

            # Preserve source attribution.
            description += " | Source: Remotive."

            location = (
                job.get("candidate_required_location")
                or job.get("job_type")
                or "Remote - check original listing"
            )

            tags = job.get("tags", [])
            skills = extract_skills(tags, description)

            job_type = str(job.get("job_type", "")).lower()

            category = (
                "Internship"
                if "internship" in job_type
                else "Job"
            )

            eligibility = ["check official listing"]

            conn.execute(
                """
                INSERT INTO opportunities (
                    title,
                    organization,
                    category,
                    description,
                    location,
                    deadline,
                    skills,
                    eligibility,
                    link,
                    type
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    title,
                    organization,
                    category,
                    description,
                    location,
                    "",
                    "|".join(skills),
                    "|".join(eligibility),
                    link,
                    "Career"
                )
            )

            inserted += 1

        conn.commit()

    return inserted


def collect_opportunities():
    """Run one collection cycle."""

    print("\n================================")
    print("OPPORTUNITY AI DATA COLLECTOR")
    print("================================")

    try:
        jobs = fetch_remotive_jobs()
        inserted = save_opportunities(jobs)

        print(f"New opportunities added: {inserted}")
        print("Collection completed successfully.")

    except Exception as error:
        print("Collection failed:", str(error))


if __name__ == "__main__":
    collect_opportunities()
