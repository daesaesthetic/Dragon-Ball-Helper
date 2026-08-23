import { Link, useRoute } from 'wouter';
import { Shield, Activity, Settings, UserMinus, Bot, Zap } from 'lucide-react';
import { useGetGuilds } from '@workspace/api-client-react';
import React from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isGuildRoute, params] = useRoute('/guild/:guildId/*?');
  const guildId = isGuildRoute && params ? params.guildId : null;
  const { data: guilds } = useGetGuilds();
  
  const currentGuild = guilds?.find(g => g.id === guildId);

  // useRoute exact match for specific pages
  const [isActivity] = useRoute('/guild/:guildId');
  const [isInfractions] = useRoute('/guild/:guildId/infractions');
  const [isSettings] = useRoute('/guild/:guildId/settings');

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/20 selection:text-primary">
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col justify-between shrink-0">
        <div>
          <div className="h-16 flex items-center px-6 border-b border-border">
            <Link href="/" className="flex items-center gap-2 group outline-none">
              <div className="h-8 w-8 rounded bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 group-hover:scale-105 transition-transform duration-200">
                <Bot className="w-5 h-5" />
              </div>
              <span className="font-bold text-sidebar-foreground tracking-tight text-lg">Nexus<span className="text-primary">Mod</span></span>
            </Link>
          </div>

          <nav className="p-4 space-y-1">
            <Link href="/" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${!guildId ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`}>
              <Activity className="w-4 h-4" />
              Overview
            </Link>
            
            {guildId && (
              <div className="pt-6 pb-2">
                <div className="px-3 mb-2 flex items-center gap-2">
                  <div className="h-5 w-5 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {currentGuild?.iconUrl ? (
                      <img src={currentGuild.iconUrl} alt={currentGuild.name} className="h-full w-full object-cover" />
                    ) : (
                      <Shield className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
                    {currentGuild?.name || 'Selected Guild'}
                  </span>
                </div>
                
                <Link href={`/guild/${guildId}`} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActivity ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm' : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`}>
                  <Activity className="w-4 h-4" />
                  Activity
                </Link>
                
                <Link href={`/guild/${guildId}/infractions`} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isInfractions ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm' : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`}>
                  <UserMinus className="w-4 h-4" />
                  Infractions
                </Link>

                <Link href={`/guild/${guildId}/settings`} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isSettings ? 'bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm' : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`}>
                  <Settings className="w-4 h-4" />
                  Rules & Settings
                </Link>
              </div>
            )}
          </nav>
        </div>
        
        <div className="p-4 border-t border-border">
           <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
             <Zap className="w-4 h-4 text-emerald-500" />
             <span className="font-mono text-xs">System Online</span>
           </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-background flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
