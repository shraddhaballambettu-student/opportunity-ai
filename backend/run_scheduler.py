
from apscheduler.schedulers.blocking import BlockingScheduler
from opportunity_collector import collect_opportunities

scheduler = BlockingScheduler()

def daily_collection():
    print("\nStarting daily opportunity collection...")
    collect_opportunities()

# Run once when the scheduler starts
daily_collection()

# Then run every day at 8:00 AM
scheduler.add_job(
    daily_collection,
    trigger="cron",
    hour=8,
    minute=0,
    id="daily_opportunity_collection",
    replace_existing=True
)

print("Opportunity AI scheduler is running.")
print("Next automatic collection: Every day at 8:00 AM.")

try:
    scheduler.start()
except (KeyboardInterrupt, SystemExit):
    print("Scheduler stopped.")
