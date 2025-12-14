"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import Link from 'next/link';
import { useAppStore, Rule } from '@/lib/store';

export default function RulesPage() {
    const { rules, addRule, updateRule, deleteRule } = useAppStore();
    const [isCreating, setIsCreating] = useState(false);
    
    // New rule state
    const [newRule, setNewRule] = useState<Partial<Rule>>({
        title: '',
        description: '',
        default_action: 'warn',
        examples: []
    });
    
    const handleSaveNew = () => {
        if (!newRule.title || !newRule.description) return;
        addRule({
            id: crypto.randomUUID(),
            title: newRule.title,
            description: newRule.description,
            default_action: newRule.default_action || 'warn',
            examples: newRule.examples || []
        });
        setNewRule({ title: '', description: '', default_action: 'warn', examples: [] });
        setIsCreating(false);
    };

    return (
        <div className="min-h-screen bg-background p-6 md:p-12 font-sans">
             <main className="max-w-4xl mx-auto space-y-8">
                 <div className="flex items-center gap-4 mb-8">
                     <Button variant="ghost" size="icon" asChild>
                         <Link href="/"><ArrowLeft className="h-4 w-4" /></Link>
                     </Button>
                     <div className="flex-1">
                        <h1 className="text-3xl font-extrabold tracking-tight">Rulebook</h1>
                        <p className="text-muted-foreground">Define your community guidelines for the decoder to reference.</p>
                     </div>
                     <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
                         <Plus className="mr-2 h-4 w-4" /> Add Rule
                     </Button>
                 </div>
                 
                 {isCreating && (
                     <Card className="border-primary">
                         <CardHeader>
                             <CardTitle>New Rule</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                             <div className="space-y-2">
                                 <Label>Rule Title</Label>
                                 <Input 
                                    placeholder="e.g. No Spoilers" 
                                    value={newRule.title}
                                    onChange={e => setNewRule({...newRule, title: e.target.value})}
                                 />
                             </div>
                             <div className="space-y-2">
                                 <Label>Description</Label>
                                 <Textarea 
                                    placeholder="Explain what constitutes a violation..." 
                                    value={newRule.description}
                                    onChange={e => setNewRule({...newRule, description: e.target.value})}
                                 />
                             </div>
                             <div className="space-y-2">
                                 <Label>Default Action</Label>
                                 <Input 
                                    placeholder="warn, timeout, ban..." 
                                    value={newRule.default_action}
                                    onChange={e => setNewRule({...newRule, default_action: e.target.value})}
                                 />
                             </div>
                         </CardContent>
                         <CardFooter className="justify-end gap-2">
                             <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                             <Button onClick={handleSaveNew}>Save Rule</Button>
                         </CardFooter>
                     </Card>
                 )}
                 
                 <div className="space-y-4">
                     {rules.map((rule) => (
                         <RuleItem key={rule.id} rule={rule} onUpdate={updateRule} onDelete={deleteRule} />
                     ))}
                 </div>
             </main>
        </div>
    );
}

function RuleItem({ rule, onUpdate, onDelete }: { rule: Rule, onUpdate: (r: Rule) => void, onDelete: (id: string) => void }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedRule, setEditedRule] = useState(rule);

    const handleSave = () => {
        onUpdate(editedRule);
        setIsEditing(false);
    };

    if (isEditing) {
         return (
             <Card>
                 <CardContent className="space-y-4 pt-6">
                     <div className="space-y-2">
                         <Label>Rule Title</Label>
                         <Input 
                            value={editedRule.title}
                            onChange={e => setEditedRule({...editedRule, title: e.target.value})}
                         />
                     </div>
                     <div className="space-y-2">
                         <Label>Description</Label>
                         <Textarea 
                            value={editedRule.description}
                            onChange={e => setEditedRule({...editedRule, description: e.target.value})}
                         />
                     </div>
                     <div className="flex justify-end gap-2">
                         <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                         <Button onClick={handleSave} size="sm"><Save className="w-4 h-4 mr-2" /> Save</Button>
                     </div>
                 </CardContent>
             </Card>
         )
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-medium">{rule.title}</CardTitle>
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => onDelete(rule.id)}>
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">{rule.description}</p>
                <div className="mt-2 flex gap-2">
                    <Badge variant="secondary">Default: {rule.default_action}</Badge>
                </div>
            </CardContent>
        </Card>
    )
}
