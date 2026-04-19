import json
import os
import re
import time
import requests
from pathlib import Path
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

# ── Config ────────────────────────────────────────────────────────────────────
VIDEOS_FILE = "psychesnightmares_videos.json"
OBSIDIAN_VAULT = Path(os.environ.get("OBSIDIAN_VAULT", "/mnt/d/Obsidian Vault/AI Research"))
CULTCODEX_URL = os.environ.get("CULTCODEX_URL", "https://cultcodex.me")
CULTCODEX_API_KEY = os.environ.get("CULTCODEX_API_KEY", "")
TRANSCRIPTS_FILE = "transcripts.json"
CHANNEL_NAME = "Psyche's Nightmares"
CHANNEL_TAG = "psyches-nightmares"

# ── Helpers ───────────────────────────────────────────────────────────────────

def safe_filename(title):
    return re.sub(r'[<>:"/\\|?*]', "", title).strip()


def fetch_transcript(video_id):
    try:
        segments = YouTubeTranscriptApi.get_transcript(video_id)
        return " ".join(s["text"] for s in segments)
    except (TranscriptsDisabled, NoTranscriptFound):
        return None
    except Exception as e:
        print(f"    Error {video_id}: {e}")
        return None


def enrich_for_cultcodex(video, transcript):
    """Build a rich content object suitable for cultcodex."""
    lines = []
    if transcript:
        # Pull first 600 chars as summary excerpt
        excerpt = transcript[:600].rsplit(" ", 1)[0] + "…"
    else:
        excerpt = video.get("description", "")[:300]

    return {
        "title": video["title"],
        "slug": re.sub(r"[^a-z0-9]+", "-", video["title"].lower()).strip("-"),
        "source_url": video["url"],
        "channel": CHANNEL_NAME,
        "published_at": video["published_at"],
        "views": video.get("views"),
        "likes": video.get("likes"),
        "duration": video.get("duration"),
        "thumbnail": video.get("thumbnail"),
        "excerpt": excerpt,
        "transcript": transcript or "",
        "tags": [CHANNEL_TAG, "youtube", "transcript"],
        "description": video.get("description", ""),
    }


def to_obsidian_md(video, transcript):
    title = video["title"]
    date = video["published_at"][:10]
    excerpt = (transcript or video.get("description", ""))[:300]

    lines = [
        f"# {title}",
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


# ── Step 1: Fetch transcripts ─────────────────────────────────────────────────

def fetch_all_transcripts():
    videos = json.load(open(VIDEOS_FILE))

    # Resume from existing cache
    cache = {}
    if os.path.exists(TRANSCRIPTS_FILE):
        cache = json.load(open(TRANSCRIPTS_FILE))

    print(f"Fetching transcripts for {len(videos)} videos (cached: {len(cache)})…")
    for i, v in enumerate(videos):
        vid = v["video_id"]
        if vid in cache:
            continue
        print(f"  [{i+1}/{len(videos)}] {v['title'][:60]}")
        cache[vid] = fetch_transcript(vid)
        time.sleep(0.3)  # be polite

        if i % 20 == 0:
            with open(TRANSCRIPTS_FILE, "w") as f:
                json.dump(cache, f)

    with open(TRANSCRIPTS_FILE, "w") as f:
        json.dump(cache, f, indent=2)
    print(f"Done. Transcripts saved to {TRANSCRIPTS_FILE}")
    return cache


# ── Step 2: Write Obsidian notes ──────────────────────────────────────────────

def write_obsidian_notes(videos, transcript_cache):
    if not OBSIDIAN_VAULT.exists():
        print(f"Obsidian vault not found at {OBSIDIAN_VAULT} — skipping.")
        return

    index_links = []
    for v in videos:
        transcript = transcript_cache.get(v["video_id"])
        md = to_obsidian_md(v, transcript)
        filename = f"{v['published_at'][:10]} {safe_filename(v['title'])}.md"
        path = OBSIDIAN_VAULT / filename
        path.write_text(md, encoding="utf-8")
        index_links.append(f"[[{path.stem}]]")

    # Write index note
    index_path = OBSIDIAN_VAULT / f"{CHANNEL_NAME} Index.md"
    index_path.write_text(
        f"# {CHANNEL_NAME} Index\n\n" + "\n".join(index_links),
        encoding="utf-8",
    )
    print(f"Obsidian: wrote {len(videos)} notes + index to {OBSIDIAN_VAULT}")


# ── Step 3: Push to cultcodex.me ─────────────────────────────────────────────

def push_to_cultcodex(videos, transcript_cache):
    if not CULTCODEX_API_KEY:
        print("CULTCODEX_API_KEY not set — skipping cultcodex push.")
        return

    headers = {
        "Authorization": f"Bearer {CULTCODEX_API_KEY}",
        "Content-Type": "application/json",
    }

    ok, fail = 0, 0
    for v in videos:
        payload = enrich_for_cultcodex(v, transcript_cache.get(v["video_id"]))
        try:
            r = requests.post(
                f"{CULTCODEX_URL}/api/posts",
                json=payload,
                headers=headers,
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
        time.sleep(0.2)

    print(f"Cultcodex: {ok} posted, {fail} failed")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    videos = json.load(open(VIDEOS_FILE))
    transcript_cache = fetch_all_transcripts()
    write_obsidian_notes(videos, transcript_cache)
    push_to_cultcodex(videos, transcript_cache)
