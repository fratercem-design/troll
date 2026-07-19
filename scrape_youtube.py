import os
import json
import requests

API_KEY = os.environ.get("YOUTUBE_API_KEY", "YOUR_API_KEY_HERE")
HANDLE = "psychesnightmares"
BASE = "https://www.googleapis.com/youtube/v3"


def get_channel_id(handle):
    r = requests.get(f"{BASE}/channels", params={
        "part": "id,snippet,statistics",
        "forHandle": handle,
        "key": API_KEY,
    })
    r.raise_for_status()
    items = r.json().get("items", [])
    if not items:
        raise ValueError(f"Channel @{handle} not found")
    ch = items[0]
    print(f"Channel: {ch['snippet']['title']}")
    print(f"Subscribers: {ch['statistics'].get('subscriberCount', 'hidden')}")
    print(f"Total videos: {ch['statistics'].get('videoCount', '?')}")
    print()
    return ch["id"], ch["snippet"].get("uploadsPlaylistId") or get_uploads_playlist(ch["id"])


def get_uploads_playlist(channel_id):
    r = requests.get(f"{BASE}/channels", params={
        "part": "contentDetails",
        "id": channel_id,
        "key": API_KEY,
    })
    r.raise_for_status()
    return r.json()["items"][0]["contentDetails"]["relatedPlaylists"]["uploads"]


def get_all_videos(playlist_id):
    videos = []
    page_token = None
    while True:
        params = {
            "part": "snippet",
            "playlistId": playlist_id,
            "maxResults": 50,
            "key": API_KEY,
        }
        if page_token:
            params["pageToken"] = page_token
        r = requests.get(f"{BASE}/playlistItems", params=params)
        r.raise_for_status()
        data = r.json()
        for item in data.get("items", []):
            sn = item["snippet"]
            videos.append({
                "title": sn["title"],
                "video_id": sn["resourceId"]["videoId"],
                "url": f"https://youtu.be/{sn['resourceId']['videoId']}",
                "published_at": sn["publishedAt"],
                "description": sn["description"],
                "thumbnail": sn.get("thumbnails", {}).get("high", {}).get("url"),
            })
        page_token = data.get("nextPageToken")
        if not page_token:
            break
    return videos


def enrich_with_stats(videos):
    ids = [v["video_id"] for v in videos]
    enriched = []
    for i in range(0, len(ids), 50):
        batch = ids[i:i+50]
        r = requests.get(f"{BASE}/videos", params={
            "part": "statistics,contentDetails",
            "id": ",".join(batch),
            "key": API_KEY,
        })
        r.raise_for_status()
        stats_map = {item["id"]: item for item in r.json().get("items", [])}
        for v in videos[i:i+50]:
            info = stats_map.get(v["video_id"], {})
            stats = info.get("statistics", {})
            details = info.get("contentDetails", {})
            enriched.append({
                **v,
                "views": stats.get("viewCount"),
                "likes": stats.get("likeCount"),
                "comments": stats.get("commentCount"),
                "duration": details.get("duration"),
            })
    return enriched


if __name__ == "__main__":
    channel_id, uploads_id = get_channel_id(HANDLE)
    videos = get_all_videos(uploads_id)
    videos = enrich_with_stats(videos)

    out_file = "psychesnightmares_videos.json"
    with open(out_file, "w") as f:
        json.dump(videos, f, indent=2)

    print(f"Scraped {len(videos)} videos -> {out_file}")
    for v in videos[:5]:
        print(f"  {v['published_at'][:10]}  {v['views']:>8} views  {v['title']}")
