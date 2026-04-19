"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, Loader2, Scan } from "lucide-react";
import { ResultPanel } from "@/ResultPanel";
import { useAppStore } from "@/lib/store";
import { AnalysisResult } from "@/lib/schemas";

export default function HomePage() {
  const { rules } = useAppStore();
  const [comment, setComment] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async () => {
    if (!comment.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment, rules }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Analysis failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      analyze();
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
              <Scan className="w-6 h-6" />
              Troll Decoder
            </h1>
            <p className="text-sm text-muted-foreground">
              AI-powered comment moderation assistant
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/rules">
              <BookOpen className="w-4 h-4 mr-2" />
              Rulebook
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-3">
          <label className="text-sm font-medium">Paste a comment to analyze</label>
          <Textarea
            placeholder="Paste the comment here..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[120px] text-base resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">⌘ Enter</kbd> to analyze
            </p>
            <Button onClick={analyze} disabled={loading || !comment.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4 mr-2" />
                  Decode
                </>
              )}
            </Button>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {result && <ResultPanel comment={comment} result={result} />}
      </main>
    </div>
  );
}
