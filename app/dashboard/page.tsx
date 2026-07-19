"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Youtube,
  BookOpen,
  Radio,
  ExternalLink,
  RefreshCw,
  Users,
  Eye,
  Video,
  Zap,
} from "lucide-react";
import Link from "next/link";

const YT_API_KEY = "AIzaSyAfdKAR1z1LE5wYxqROj1fIOannQLlj1u0";
const YT_CHANNEL_HANDLE = "psychesnightmares";
const CULTCODEX_URL = "https://cultcodex.me";

interface YTStats {
  title: string;
  subscribers: string;
  views: string;
  videoCount: string;
}

interface YTVideo {
  title: string;
  url: string;
  publishedAt: string;
  views: string;
}

interface CultStatus {
  live: boolean;
  title?: string;
  viewers?: number;
}

function useGreeting() {
  const [greeting, setGreeting] = useState("");
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () => {
      const h = new Date().getHours();
      setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
      setTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, []);
  return { greeting, time };
}

function fmtNum(n: string | number) {
  return Number(n).toLocaleString();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

export default function Dashboard() {
  const { greeting, time } = useGreeting();
  const [ytStats, setYtStats] = useState<YTStats | null>(null);
  const [ytVideos, setYtVideos] = useState<YTVideo[]>([]);
  const [cultStatus, setCultStatus] = useState<CultStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function fetchAll() {
    setLoading(true);
    await Promise.allSettled([fetchYT(), fetchCultcodex()]);
    setLastRefresh(new Date());
    setLoading(false);
  }

  async function fetchYT() {
    try {
      const chRes = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${YT_CHANNEL_HANDLE}&key=${YT_API_KEY}`
      );
      const chData = await chRes.json();
      const ch = chData.items?.[0];
      if (!ch) return;

      setYtStats({
        title: ch.snippet.title,
        subscribers: ch.statistics.subscriberCount ?? "0",
        views: ch.statistics.viewCount ?? "0",
        videoCount: ch.statistics.videoCount ?? "0",
      });

      const uploadsId = ch.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsId) {
        const cdRes = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${ch.id}&key=${YT_API_KEY}`
        );
        const cdData = await cdRes.json();
        const pid = cdData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
        if (pid) await fetchLatestVideos(pid);
      } else {
        await fetchLatestVideos(uploadsId);
      }
    } catch {}
  }

  async function fetchLatestVideos(playlistId: string) {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=5&key=${YT_API_KEY}`
    );
    const data = await res.json();
    const ids = data.items?.map((i: any) => i.snippet.resourceId.videoId).join(",") ?? "";
    if (!ids) return;

    const statsRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${YT_API_KEY}`
    );
    const statsData = await statsRes.json();
    const statsMap: Record<string, string> = {};
    for (const v of statsData.items ?? []) statsMap[v.id] = v.statistics.viewCount;

    setYtVideos(
      data.items.map((i: any) => ({
        title: i.snippet.title,
        url: `https://youtu.be/${i.snippet.resourceId.videoId}`,
        publishedAt: i.snippet.publishedAt,
        views: statsMap[i.snippet.resourceId.videoId] ?? "0",
      }))
    );
  }

  async function fetchCultcodex() {
    try {
      const res = await fetch(`${CULTCODEX_URL}/api/live/status`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCultStatus(data);
      }
    } catch {
      setCultStatus({ live: false });
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-muted-foreground text-sm">{time}</p>
            <h1 className="text-3xl font-extrabold tracking-tight">{greeting}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              refreshed {lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <Button variant="outline" size="icon" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Cultcodex", href: CULTCODEX_URL, icon: <Zap className="w-3 h-3" /> },
            { label: "YouTube", href: `https://youtube.com/@${YT_CHANNEL_HANDLE}`, icon: <Youtube className="w-3 h-3" /> },
            { label: "Troll Rules", href: "/rules", icon: <BookOpen className="w-3 h-3" /> },
          ].map((l) => (
            <a key={l.label} href={l.href} target={l.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
              <Badge variant="secondary" className="cursor-pointer hover:bg-muted gap-1 px-3 py-1 text-xs">
                {l.icon} {l.label}
              </Badge>
            </a>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* YouTube stats */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Youtube className="w-5 h-5 text-red-500" />
              <CardTitle className="text-base">{ytStats?.title ?? "Psyche's Nightmares"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ytStats ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(ytStats.subscribers)}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Users className="w-3 h-3" /> subscribers</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(ytStats.videoCount)}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Video className="w-3 h-3" /> videos</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{fmtNum(ytStats.views)}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> total views</p>
                  </div>
                </div>
              ) : (
                <div className="h-16 bg-muted animate-pulse rounded" />
              )}

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Recent uploads</p>
                {ytVideos.length > 0 ? ytVideos.map((v) => (
                  <a key={v.url} href={v.url} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between text-sm hover:text-foreground text-muted-foreground group">
                    <span className="truncate flex-1 group-hover:text-foreground transition-colors">{v.title}</span>
                    <span className="ml-2 shrink-0 text-xs">{fmtNum(v.views)} · {timeAgo(v.publishedAt)}</span>
                  </a>
                )) : (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-muted animate-pulse rounded" />)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cultcodex */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Zap className="w-5 h-5 text-purple-500" />
              <CardTitle className="text-base">Cultcodex</CardTitle>
              {cultStatus?.live && (
                <Badge className="ml-auto bg-red-500 text-white animate-pulse">LIVE</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {cultStatus ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Radio className={`w-4 h-4 ${cultStatus.live ? "text-red-500" : "text-muted-foreground"}`} />
                    <span className="text-sm">
                      {cultStatus.live
                        ? `Streaming: ${cultStatus.title ?? "Live now"}`
                        : "Not currently live"}
                    </span>
                  </div>
                  {cultStatus.viewers != null && (
                    <p className="text-xs text-muted-foreground">{fmtNum(cultStatus.viewers)} viewers</p>
                  )}
                </div>
              ) : (
                <div className="h-10 bg-muted animate-pulse rounded" />
              )}

              <div className="pt-2 border-t space-y-2">
                {[
                  { label: "Vault", href: `${CULTCODEX_URL}/vault` },
                  { label: "Grimoire", href: `${CULTCODEX_URL}/grimoire` },
                  { label: "Live", href: `${CULTCODEX_URL}/live` },
                ].map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground group">
                    <span>{link.label}</span>
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Troll decoder */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <CardTitle className="text-base">Troll Decoder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                AI-powered chat moderation rules engine for your streams.
              </p>
              <Link href="/rules">
                <Button size="sm" variant="outline" className="w-full">Manage Rules</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Pipeline */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <RefreshCw className="w-5 h-5 text-green-500" />
              <CardTitle className="text-base">Content Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Fetches YouTube transcripts → Obsidian + Cultcodex vault.</p>
              <div className="font-mono text-xs bg-muted rounded p-2 leading-relaxed">
                python3 pipeline.py
              </div>
              <p className="text-xs">Run locally — YouTube requires your IP.</p>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
