"""
Fetch YouTube transcripts + push to Obsidian & cultcodex.me

SETUP:
  1. Export YouTube cookies:
       - Install browser extension "Get cookies.txt LOCALLY"
       - Visit youtube.com while logged in
       - Export → save as youtube_cookies.txt in this directory
  2. Set env vars:
       CULTCODEX_URL=https://cultcodex.me
       CULTCODEX_SESSION=<paste session cookie from browser DevTools>
       OBSIDIAN_VAULT=/mnt/d/Obsidian Vault/AI Research   (optional)
  3. Run: python3 pipeline.py
"""

import json
import os
import re
import time
import subprocess
import tempfile
import requests
import urllib3
from pathlib import Path

urllib3.disable_warnings()

# ── Config ────────────────────────────────────────────────────────────────────
VIDEOS_FILE = "psychesnightmares_videos.json"
TRANSCRIPTS_FILE = "transcripts.json"
OBSIDIAN_VAULT = Path(os.environ.get("OBSIDIAN_VAULT", "/mnt/d/Obsidian Vault/AI Research"))
CULTCODEX_URL = os.environ.get("CULTCODEX_URL", "https://cultcodex.me")
CULTCODEX_SESSION = os.environ.get("CULTCODEX_SESSION", "")  # paste session cookie value
COOKIES_FILE = os.environ.get("YT_COOKIES", "youtube_cookies.txt")
CHANNEL_NAME = "Psyche's Nightmares"
CHANNEL_TAG = "psyches-nightmares"

# ── Transcript fetch via yt-dlp ───────────────────────────────────────────────

def fetch_transcript_ytdlp(video_id):
    """Download auto-captions via yt-dlp and return plain text."""
    with tempfile.TemporaryDirectory() as tmpdir:
        cmd = [
            "yt-dlp",
            "--no-check-certificates",
            "--write-auto-sub",
            "--sub-lang", "en",
            "--skip-download",
            "--sub-format", "vtt",
            "-o", f"{tmpdir}/%(id)s",
        ]
        if os.path.exists(COOKIES_FILE):
            cmd += ["--cookies", COOKIES_FILE]
        cmd.append(f"https://youtu.be/{video_id}")

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        vtt_files = list(Path(tmpdir).glob("*.vtt"))
        if not vtt_files:
            return None
        raw = vtt_files[0].read_text(encoding="utf-8", errors="ignore")
        return vtt_to_text(raw)


def vtt_to_text(vtt):
    """Strip VTT timing lines and return clean transcript text."""
    lines = []
    seen = set()
    for line in vtt.splitlines():
        line = line.strip()
        if not line or "-->" in line or line.startswith("WEBVTT") or re.match(r"^\d+$", line):
            continue
        # Remove VTT tags like <00:00:01.000><c> etc.
        line = re.sub(r"<[^>]+>", "", line)
        if line and line not in seen:
            seen.add(line)
            lines.append(line)
    return " ".join(lines)


def fetch_all_transcripts():
    videos = json.load(open(VIDEOS_FILE))

    cache = {}
    if os.path.exists(TRANSCRIPTS_FILE):
        cache = json.load(open(TRANSCRIPTS_FILE))

    need = [v for v in videos if not cache.get(v["video_id"])]
    print(f"Fetching transcripts: {len(need)} remaining of {len(videos)} total")

    if not os.path.exists(COOKIES_FILE):
        print(f"  WARNING: {COOKIES_FILE} not found — YouTube may block requests.")
        print("  Export cookies from your browser and save as youtube_cookies.txt")

    for i, v in enumerate(need):
        vid = v["video_id"]
        print(f"  [{i+1}/{len(need)}] {v['title'][:70]}")
        cache[vid] = fetch_transcript_ytdlp(vid)
        time.sleep(0.5)

        if i % 10 == 0:
            with open(TRANSCRIPTS_FILE, "w") as f:
                json.dump(cache, f)

    with open(TRANSCRIPTS_FILE, "w") as f:
        json.dump(cache, f, indent=2)

    got = sum(1 for v in cache.values() if v)
    print(f"Done. {got}/{len(videos)} transcripts retrieved → {TRANSCRIPTS_FILE}")
    return cache

# ── Obsidian ──────────────────────────────────────────────────────────────────

def safe_filename(title):
    return re.sub(r'[<>:"/\\|?*]', "", title).strip()


def to_obsidian_md(video, transcript):
    date = video["published_at"][:10]
    lines = [
        f"# {video['title']}",
        "",
        f"- **Channel**: {CHANNEL_NAME}",
        f"- **Published**: {date}",
        f"- **Views**: {video.get('views', '?')}",
        f"- **Likes**: {video.get('likes', '?')}",
        f"- **URL**: {video['url']}",
        "",
        "## Transcript",
        "",
        transcript if transcript else "_No transcript available._",
        "",
        "## Links",
        "",
        f"[[{CHANNEL_NAME} Index]]",
    ]
    return "\n".join(lines)


def write_obsidian_notes(videos, cache):
    if not OBSIDIAN_VAULT.exists():
        print(f"Obsidian vault not found at {OBSIDIAN_VAULT} — skipping.")
        return

    index_links = []
    for v in videos:
        transcript = cache.get(v["video_id"])
        md = to_obsidian_md(v, transcript)
        stem = f"{v['published_at'][:10]} {safe_filename(v['title'])}"
        path = OBSIDIAN_VAULT / f"{stem}.md"
        path.write_text(md, encoding="utf-8")
        index_links.append(f"[[{stem}]]")

    index_path = OBSIDIAN_VAULT / f"{CHANNEL_NAME} Index.md"
    index_path.write_text(
        f"# {CHANNEL_NAME} Index\n\n" + "\n".join(index_links),
        encoding="utf-8",
    )
    print(f"Obsidian: wrote {len(videos)} notes + index → {OBSIDIAN_VAULT}")

# ── Cultcodex ─────────────────────────────────────────────────────────────────

def cultcodex_login(session):
    session.cookies.set("session", CULTCODEX_SESSION, domain="cultcodex.me")
    print("cultcodex: session cookie set")


def enrich_for_cultcodex(video, transcript):
    excerpt = (transcript or video.get("description", ""))[:500]
    if len(excerpt) == 500:
        excerpt = excerpt.rsplit(" ", 1)[0] + "…"
    return {
        "title": video["title"],
        "slug": re.sub(r"[^a-z0-9]+", "-", video["title"].lower()).strip("-"),
        "content": transcript or video.get("description", ""),
        "tags": [CHANNEL_TAG, "youtube", "transcript"],
        "requiredEntitlement": None,
    }


def push_to_cultcodex(videos, cache):
    if not CULTCODEX_SESSION:
        print("CULTCODEX_SESSION not set — skipping.")
        return

    session = requests.Session()
    session.verify = False
    cultcodex_login(session)

    ok = fail = 0
    for v in videos:
        payload = enrich_for_cultcodex(v, cache.get(v["video_id"]))
        try:
            r = session.post(
                f"{CULTCODEX_URL}/api/admin/vault",
                json=payload,
                timeout=15,
            )
            if r.ok:
                ok += 1
            else:
                print(f"  FAIL {v['video_id']}: {r.status_code} {r.text[:120]}")
                fail += 1
        except Exception as e:
            print(f"  ERROR {v['video_id']}: {e}")
            fail += 1
        time.sleep(0.15)

    print(f"cultcodex: {ok} posted, {fail} failed")

# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    videos = json.load(open(VIDEOS_FILE))
    cache = fetch_all_transcripts()
    write_obsidian_notes(videos, cache)
    push_to_cultcodex(videos, cache)
