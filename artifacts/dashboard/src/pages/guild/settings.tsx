import { useEffect, useRef, useState } from 'react';
import { useGetGuildConfig, useUpdateGuildConfig, useAddBannedWord, useRemoveBannedWord, getGetGuildConfigQueryKey } from '@workspace/api-client-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Settings2, Plus, X, Link as LinkIcon, MessageSquare, AtSign, Repeat, ShieldAlert, Save } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function GuildSettings({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useGetGuildConfig(guildId);
  const updateConfig = useUpdateGuildConfig();
  const addWord = useAddBannedWord();
  const removeWord = useRemoveBannedWord();

  const [linkFilter, setLinkFilter] = useState(false);
  const [spamFilter, setSpamFilter] = useState(false);
  const [maxMentions, setMaxMentions] = useState<number>(5);
  const [maxDuplicateMessages, setMaxDuplicateMessages] = useState<number>(3);
  
  const [newWord, setNewWord] = useState('');

  const initializedForId = useRef<string | null>(null);

  useEffect(() => {
    if (config && initializedForId.current !== config.guildId) {
      initializedForId.current = config.guildId;
      setLinkFilter(config.linkFilter);
      setSpamFilter(config.spamFilter);
      setMaxMentions(config.maxMentions);
      setMaxDuplicateMessages(config.maxDuplicateMessages);
    }
  }, [config]);

  const handleSaveConfig = () => {
    updateConfig.mutate({
      guildId,
      data: {
        linkFilter,
        spamFilter,
        maxMentions: Number(maxMentions),
        maxDuplicateMessages: Number(maxDuplicateMessages)
      }
    }, {
      onSuccess: (data) => {
        toast({ title: 'Settings saved', description: 'Automod rules have been updated.' });
        queryClient.setQueryData(getGetGuildConfigQueryKey(guildId), data);
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' });
      }
    });
  };

  const handleAddWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim()) return;
    
    addWord.mutate({
      guildId,
      data: { word: newWord.trim().toLowerCase() }
    }, {
      onSuccess: (data) => {
        setNewWord('');
        queryClient.setQueryData(getGetGuildConfigQueryKey(guildId), data);
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to add word.', variant: 'destructive' });
      }
    });
  };

  const handleRemoveWord = (word: string) => {
    removeWord.mutate({
      guildId,
      data: { word }
    }, {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetGuildConfigQueryKey(guildId), data);
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to remove word.', variant: 'destructive' });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto w-full space-y-6">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings2 className="w-8 h-8 text-primary" />
          Rules & Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Configure automated safeguards and filters for this server.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle>Automod Rules</CardTitle>
            <CardDescription>Adjust the thresholds and toggles for automated actions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="flex flex-row items-center justify-between rounded-lg border border-border p-4 shadow-sm bg-secondary/10">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-primary" />
                    Anti-Link
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically delete messages containing links.
                  </p>
                </div>
                <Switch 
                  checked={linkFilter} 
                  onCheckedChange={setLinkFilter} 
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border border-border p-4 shadow-sm bg-secondary/10">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Anti-Spam
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Detect and prevent rapid message spam.
                  </p>
                </div>
                <Switch 
                  checked={spamFilter} 
                  onCheckedChange={setSpamFilter} 
                />
              </div>

              <div className="space-y-3 rounded-lg border border-border p-4 shadow-sm bg-secondary/10">
                <div className="space-y-0.5">
                  <Label htmlFor="maxMentions" className="text-base font-semibold flex items-center gap-2">
                    <AtSign className="w-4 h-4 text-primary" />
                    Max Mentions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Maximum allowed mentions in a single message.
                  </p>
                </div>
                <div className="pt-2">
                  <Input 
                    id="maxMentions"
                    type="number" 
                    min={1} 
                    max={20}
                    value={maxMentions}
                    onChange={(e) => setMaxMentions(parseInt(e.target.value) || 1)}
                    className="max-w-[120px] font-mono text-lg"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border p-4 shadow-sm bg-secondary/10">
                <div className="space-y-0.5">
                  <Label htmlFor="maxDupe" className="text-base font-semibold flex items-center gap-2">
                    <Repeat className="w-4 h-4 text-primary" />
                    Max Duplicate Messages
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Consecutive identical messages before action.
                  </p>
                </div>
                <div className="pt-2">
                  <Input 
                    id="maxDupe"
                    type="number" 
                    min={1} 
                    max={10}
                    value={maxDuplicateMessages}
                    onChange={(e) => setMaxDuplicateMessages(parseInt(e.target.value) || 1)}
                    className="max-w-[120px] font-mono text-lg"
                  />
                </div>
              </div>

            </div>
          </CardContent>
          <CardFooter className="border-t border-border/50 bg-muted/20 px-6 py-4 flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Changes will apply to all channels immediately.
            </span>
            <Button onClick={handleSaveConfig} disabled={updateConfig.isPending} className="min-w-[120px]">
              {updateConfig.isPending ? (
                <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"/> Saving...</span>
              ) : (
                <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Rules</span>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Banned Words Filter
            </CardTitle>
            <CardDescription>
              Messages containing these words will be automatically deleted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddWord} className="flex items-center gap-3 mb-6">
              <Input
                placeholder="Enter a word or phrase to ban..."
                value={newWord}
                onChange={(e) => setNewWord(e.target.value)}
                className="max-w-md font-mono"
                disabled={addWord.isPending}
              />
              <Button type="submit" disabled={!newWord.trim() || addWord.isPending} variant="secondary">
                <Plus className="w-4 h-4 mr-2" />
                Add Word
              </Button>
            </form>

            <div className="flex flex-wrap gap-2 min-h-[100px] p-4 rounded-lg border border-border/50 bg-secondary/10">
              {config?.bannedWords && config.bannedWords.length > 0 ? (
                config.bannedWords.map((word) => (
                  <Badge 
                    key={word} 
                    variant="outline" 
                    className="pl-3 pr-1 py-1.5 text-sm font-mono border-border bg-background flex items-center gap-2 group hover:border-destructive/50 transition-colors"
                  >
                    {word}
                    <button
                      onClick={() => handleRemoveWord(word)}
                      disabled={removeWord.isPending}
                      className="h-5 w-5 rounded-full hover:bg-destructive hover:text-destructive-foreground flex items-center justify-center transition-colors outline-none focus:ring-2 ring-destructive"
                    >
                      <X className="w-3 h-3" />
                      <span className="sr-only">Remove {word}</span>
                    </button>
                  </Badge>
                ))
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground opacity-60 pt-4 pb-2">
                  <span className="text-sm">No banned words configured.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
