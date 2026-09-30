import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


def make_run_id():
    return datetime.now(ZoneInfo("Europe/Rome")).strftime("%Y%m%d_%H%M%S_%f")


def safe_run_id(value):
    value = "" if value is None else str(value)
    value = re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip())
    return value.strip("_")


def configure_report_run(base_dir: Path, continue_run=None):
    base_dir.mkdir(parents=True, exist_ok=True)

    if continue_run:
        run_id = safe_run_id(continue_run)

        if not run_id:
            raise ValueError("--continue-run requires a non-empty run folder name.")

        run_dir = base_dir / run_id

        if not run_dir.exists():
            raise FileNotFoundError(
                f"Cannot continue missing run folder: {run_dir}"
            )

        return run_dir

    run_dir = base_dir / make_run_id()
    run_dir.mkdir(parents=True, exist_ok=False)
    return run_dir
