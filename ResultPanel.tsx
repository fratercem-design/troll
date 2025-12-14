import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Shield, Copy } from "lucide-react";
import { AnalysisResult } from '@/lib/schemas';
import { cn } from '@/lib/utils';

interface ResultPanelProps {
  comment: string;
  result: AnalysisResult;
}

export function ResultPanel({ comment, result }: ResultPanelProps) {
  const riskColor = 
    result.risk.level === 'high' ? 'bg-red-500' :
    result.risk.level === 'medium' ? 'bg-yellow-500' :
    'bg-green-500';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
      {/* Left: Original Comment */}
      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Original Comment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted/50 rounded-lg text-lg italic border-l-4 border-primary">
            &quot;{comment}&quot;
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline" className="capitalize">{result.likely_goal}</Badge>
              {result.tactics.map((t, i) => (
                  <Badge key={i} variant="secondary">{t.name} ({(t.confidence * 100).toFixed(0)}%)</Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Right: Analysis & Tools */}
      <Card className="md:col-span-2">
        <Tabs defaultValue="translation" className="w-full">
            <div className="px-6 pt-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="translation">Translation</TabsTrigger>
                    <TabsTrigger value="risk">Risk & Action</TabsTrigger>
                    <TabsTrigger value="replies">Reply Builder</TabsTrigger>
                    <TabsTrigger value="rules">Receipts</TabsTrigger>
                </TabsList>
            </div>
          
          <div className="p-6">
            <TabsContent value="translation" className="space-y-4 mt-0">
              <div>
                <h3 className="text-lg font-semibold mb-2">Plain English Translation</h3>
                <p className="text-muted-foreground bg-muted p-4 rounded-md">{result.translation_plain}</p>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Underlying Intent</h3>
                <p className="text-muted-foreground">{result.translation_intent}</p>
              </div>
            </TabsContent>

            <TabsContent value="risk" className="space-y-4 mt-0">
               <div className="flex items-center gap-4 p-4 border rounded-lg">
                   <div className={cn("w-3 h-3 rounded-full", riskColor)} />
                   <div>
                       <h3 className="font-semibold capitalize">{result.risk.level} Risk</h3>
                       <p className="text-sm text-muted-foreground">{result.risk.reasons.join(', ')}</p>
                   </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 border rounded-lg bg-red-50/10 border-red-200/20">
                       <h4 className="font-semibold flex items-center gap-2 text-red-500">
                           <Shield className="w-4 h-4" /> Recommended Action
                       </h4>
                       <p className="mt-2 text-xl font-bold capitalize">{result.recommended_action.primary}</p>
                       <p className="text-sm text-muted-foreground mt-1">{result.recommended_action.why}</p>
                   </div>
                   
                   <div className="space-y-2">
                       <h4 className="font-semibold text-sm">Flags</h4>
                       <ul className="space-y-1">
                           <li className="flex items-center gap-2 text-sm">
                               {result.risk.contains_hate_or_slur ? <AlertTriangle className="w-4 h-4 text-red-500"/> : <div className="w-4 h-4 rounded-full border" />}
                               Hate / Slur
                           </li>
                           <li className="flex items-center gap-2 text-sm">
                               {result.risk.contains_threat ? <AlertTriangle className="w-4 h-4 text-red-500"/> : <div className="w-4 h-4 rounded-full border" />}
                               Threat
                           </li>
                           <li className="flex items-center gap-2 text-sm">
                               {result.risk.sexual_harassment ? <AlertTriangle className="w-4 h-4 text-red-500"/> : <div className="w-4 h-4 rounded-full border" />}
                               Sexual Harassment
                           </li>
                       </ul>
                   </div>
               </div>
            </TabsContent>

            <TabsContent value="replies" className="space-y-4 mt-0">
              {result.risk.level === 'high' ? (
                  <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>High Risk Detected</AlertTitle>
                      <AlertDescription>
                          Engagement is not recommended. Please report and ban.
                      </AlertDescription>
                  </Alert>
              ) : (
                  <div className="space-y-4">
                      {Object.entries(result.replies).map(([key, reply]) => {
                          if (!reply) return null;
                          return (
                              <div key={key} className="border rounded-lg p-4">
                                  <div className="flex justify-between items-start mb-2">
                                      <h4 className="font-semibold capitalize text-sm text-muted-foreground">
                                          {key.replace(/_/g, ' ')}
                                      </h4>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(reply)}>
                                          <Copy className="h-3 w-3" />
                                      </Button>
                                  </div>
                                  <p>{reply}</p>
                              </div>
                          )
                      })}
                  </div>
              )}
            </TabsContent>
            
            <TabsContent value="rules" className="space-y-4 mt-0">
                <div className="space-y-4">
                    <h3 className="font-semibold">Evidence</h3>
                    {result.tactics.map((t, i) => (
                        <div key={i} className="bg-muted p-3 rounded-md">
                            <span className="font-medium capitalize">{t.name}:</span>
                            <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                                {t.evidence_phrases.map((phrase, j) => (
                                    <li key={j}>&quot;{phrase}&quot;</li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    
                     <h3 className="font-semibold mt-4">Coach Notes</h3>
                     <ul className="list-disc list-inside space-y-1 text-sm">
                         {result.coach_notes.map((note, i) => (
                             <li key={i}>{note}</li>
                         ))}
                     </ul>
                </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
