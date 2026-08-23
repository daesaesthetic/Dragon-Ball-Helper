import { useGetGuildConfig, useGetModerationLogs, useGetGuilds } from '@workspace/api-client-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldAlert, Link as LinkIcon, MessageSquare, AlertTriangle, ScrollText, Activity } from 'lucide-react';
import { format } from 'date-fns';

export default function GuildDashboard({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  
  const { data: config, isLoading: configLoading } = useGetGuildConfig(guildId);
  const { data: logsPage, isLoading: logsLoading } = useGetModerationLogs(guildId, { limit: 10 });
  const { data: guilds } = useGetGuilds();
  
  const guild = guilds?.find(g => g.id === guildId);

  const getActionBadge = (action: string) => {
    switch(action) {
      case 'ban': return <Badge variant="destructive">Ban</Badge>;
      case 'kick': return <Badge className="bg-orange-500 hover:bg-orange-600">Kick</Badge>;
      case 'timeout': return <Badge className="bg-amber-500 hover:bg-amber-600">Timeout</Badge>;
      case 'delete': return <Badge variant="secondary">Delete</Badge>;
      case 'warn': return <Badge className="bg-yellow-500 hover:bg-yellow-600">Warn</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center gap-4 border-b border-border pb-6">
        <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center overflow-hidden shadow-sm">
          {guild?.iconUrl ? (
            <img src={guild.iconUrl} alt={guild.name} className="h-full w-full object-cover" />
          ) : (
            <ShieldAlert className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{guild?.name || 'Loading...'}</h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-1">
            <span className="font-mono text-xs">{guildId}</span>
            <span>•</span>
            <span>{guild?.memberCount?.toLocaleString() || 0} members</span>
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-primary" />
                Active Safeguards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Link Filter</span>
                    </div>
                    <Badge variant={config?.linkFilter ? 'default' : 'secondary'}>
                      {config?.linkFilter ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Spam Filter</span>
                    </div>
                    <Badge variant={config?.spamFilter ? 'default' : 'secondary'}>
                      {config?.spamFilter ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Max Mentions</span>
                    </div>
                    <div className="font-mono font-bold text-sm bg-background px-2 py-1 rounded border border-border">
                      {config?.maxMentions}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/20">
                    <div className="flex items-center gap-3">
                      <ScrollText className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Banned Words</span>
                    </div>
                    <div className="font-mono font-bold text-sm bg-background px-2 py-1 rounded border border-border">
                      {config?.bannedWords?.length || 0}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="shadow-sm border-border/60 h-full flex flex-col">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Recent Automation Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              {logsLoading ? (
                <div className="p-6 space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : logsPage?.items && logsPage.items.length > 0 ? (
                <div className="divide-y divide-border/50 overflow-auto max-h-[500px]">
                  {logsPage.items.map(log => (
                    <div key={log.id} className="p-4 hover:bg-secondary/20 transition-colors flex gap-4">
                      <div className="mt-1">
                        {getActionBadge(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-medium text-sm text-foreground">
                            {log.username} <span className="text-muted-foreground text-xs font-mono ml-1">({log.userId})</span>
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.createdAt), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm mt-1 text-muted-foreground">
                          {log.reason}
                        </p>
                        {log.messageContent && (
                          <div className="mt-2 text-xs font-mono bg-secondary/40 p-2 rounded border border-border/50 text-muted-foreground break-all">
                            "{log.messageContent}"
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                    <ShieldAlert className="h-6 w-6 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="font-medium text-lg">No recent activity</h3>
                  <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                    The automod has not taken any actions recently. Check back later or adjust the safeguards.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
