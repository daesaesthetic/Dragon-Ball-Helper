import { useHealthCheck, useGetBotStatus, useGetGuilds } from '@workspace/api-client-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Shield, Activity, Clock, Server, ArrowRight, Zap, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { data: health, isLoading: healthLoading } = useHealthCheck();
  const { data: status, isLoading: statusLoading } = useGetBotStatus();
  const { data: guilds, isLoading: guildsLoading } = useGetGuilds();

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '0h 0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Operations Hub</h1>
        <p className="text-muted-foreground">Monitor bot health and select a guild to manage safeguards.</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border/60 hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statusLoading || healthLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <div className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-full ${status?.online && health?.status === 'ok' ? 'bg-emerald-500' : 'bg-destructive'}`} />
                <div className="text-2xl font-bold font-mono">
                  {status?.online ? 'Online' : 'Offline'}
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {status?.username ? `${status.username}#${status.tag}` : 'System Check'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60 hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Latency</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-2xl font-bold font-mono">{status?.latencyMs || 0}ms</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">WebSocket Heartbeat</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60 hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold font-mono">{formatUptime(status?.uptime)}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Since last restart</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60 hover-elevate transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Connected Guilds</CardTitle>
            <Server className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-2xl font-bold font-mono">{status?.guildCount || 0}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Active deployments</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Active Guilds</h2>
          {guildsLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        
        {guildsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : guilds?.length === 0 ? (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-10 w-10 text-muted-foreground mb-4 opacity-50" />
              <h3 className="font-semibold text-lg">No Guilds Connected</h3>
              <p className="text-muted-foreground max-w-sm mt-1">
                The bot is currently not active in any servers. Invite the bot to a server to see it here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guilds?.map(guild => (
              <Link key={guild.id} href={`/guild/${guild.id}`}>
                <Card className="group cursor-pointer border-border/60 hover:border-primary/50 shadow-sm hover:shadow-md transition-all active-elevate">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:shadow-primary/20 transition-all group-hover:scale-105">
                      {guild.iconUrl ? (
                        <img src={guild.iconUrl} alt={guild.name} className="h-full w-full object-cover" />
                      ) : (
                        <Shield className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                        {guild.name}
                      </h3>
                      <p className="text-sm text-muted-foreground font-mono mt-0.5">
                        {guild.memberCount.toLocaleString()} members
                      </p>
                    </div>
                    <div className="shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-secondary/50 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
