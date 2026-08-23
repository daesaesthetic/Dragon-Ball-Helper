import { useState } from 'react';
import { useGetInfractions, useCreateInfraction, useDeleteInfraction, getGetInfractionsQueryKey } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Search, UserMinus, ShieldOff, Clock, Trash2, ShieldAlert, FileText, User } from 'lucide-react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

export default function GuildInfractions({ params }: { params: { guildId: string } }) {
  const { guildId } = params;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [userIdFilter, setUserIdFilter] = useState('');
  const [debouncedUserId, setDebouncedUserId] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Pagination could be added, just passing limit 50 for now
  const { data: infractionsPage, isLoading } = useGetInfractions(guildId, { 
    userId: debouncedUserId || undefined, 
    limit: 50 
  });

  const createInfraction = useCreateInfraction();
  const deleteInfraction = useDeleteInfraction();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedUserId(userIdFilter);
  };

  const handleClearSearch = () => {
    setUserIdFilter('');
    setDebouncedUserId('');
  };

  const handleDelete = (infractionId: number) => {
    if (!confirm('Are you sure you want to pardon this infraction? This will delete the record.')) return;
    
    deleteInfraction.mutate({
      guildId,
      infractionId
    }, {
      onSuccess: () => {
        toast({ title: 'Infraction pardoned', description: 'The record has been removed.' });
        // Invalidate or patch cache
        queryClient.invalidateQueries({ queryKey: getGetInfractionsQueryKey(guildId) });
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to pardon infraction.', variant: 'destructive' });
      }
    });
  };

  const [createData, setCreateData] = useState({
    userId: '',
    username: '',
    type: 'warn' as 'warn' | 'kick' | 'ban',
    reason: '',
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createData.userId || !createData.username || !createData.reason) {
      toast({ title: 'Validation Error', description: 'Please fill out all required fields.', variant: 'destructive' });
      return;
    }

    createInfraction.mutate({
      guildId,
      data: {
        userId: createData.userId,
        username: createData.username,
        type: createData.type,
        reason: createData.reason,
        moderatorId: 'dashboard',
        moderatorUsername: 'Dashboard Admin',
      }
    }, {
      onSuccess: () => {
        toast({ title: 'Infraction created', description: 'The user has been penalized.' });
        setIsCreateOpen(false);
        setCreateData({ userId: '', username: '', type: 'warn', reason: '' });
        queryClient.invalidateQueries({ queryKey: getGetInfractionsQueryKey(guildId) });
      },
      onError: () => {
        toast({ title: 'Error', description: 'Failed to create infraction.', variant: 'destructive' });
      }
    });
  };

  const getTypeBadge = (type: string) => {
    switch(type) {
      case 'ban': return <Badge variant="destructive" className="flex gap-1.5"><ShieldOff className="w-3 h-3"/> Ban</Badge>;
      case 'kick': return <Badge className="bg-orange-500 hover:bg-orange-600 flex gap-1.5"><UserMinus className="w-3 h-3"/> Kick</Badge>;
      case 'warn': return <Badge className="bg-yellow-500 hover:bg-yellow-600 flex gap-1.5"><ShieldAlert className="w-3 h-3"/> Warn</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto w-full flex flex-col h-[calc(100vh-2rem)] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Infractions</h1>
          <p className="text-muted-foreground mt-1">Browse, filter, and manage user penalties.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <form onSubmit={handleSearch} className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by User ID..." 
              className="pl-9 bg-background shadow-sm font-mono text-sm"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
            />
          </form>
          {debouncedUserId && (
            <Button variant="ghost" onClick={handleClearSearch} className="px-3">
              Clear
            </Button>
          )}

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-sm">
                Issue Penalty
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateSubmit}>
                <DialogHeader>
                  <DialogTitle>Issue Manual Infraction</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="userId">User ID</Label>
                    <Input 
                      id="userId" 
                      placeholder="e.g. 123456789012345678" 
                      className="font-mono"
                      value={createData.userId}
                      onChange={(e) => setCreateData({ ...createData, userId: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input 
                      id="username" 
                      placeholder="e.g. baduser99" 
                      value={createData.username}
                      onChange={(e) => setCreateData({ ...createData, username: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="type">Action Type</Label>
                    <Select 
                      value={createData.type} 
                      onValueChange={(val: 'warn' | 'kick' | 'ban') => setCreateData({ ...createData, type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="kick">Kick</SelectItem>
                        <SelectItem value="ban">Ban</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Input 
                      id="reason" 
                      placeholder="Reason for infraction..." 
                      value={createData.reason}
                      onChange={(e) => setCreateData({ ...createData, reason: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createInfraction.isPending}>
                    {createInfraction.isPending ? 'Processing...' : 'Issue Infraction'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <Card className="flex-1 overflow-hidden shadow-sm border-border/60 flex flex-col min-h-0">
        <div className="bg-muted/30 border-b border-border p-3 grid grid-cols-12 gap-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
          <div className="col-span-2">User</div>
          <div className="col-span-1">Action</div>
          <div className="col-span-4">Reason</div>
          <div className="col-span-2">Moderator</div>
          <div className="col-span-2">Date</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        
        <div className="flex-1 overflow-auto bg-background">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : infractionsPage?.items && infractionsPage.items.length > 0 ? (
            <div className="divide-y divide-border/50">
              {infractionsPage.items.map(infraction => (
                <div key={infraction.id} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-secondary/10 transition-colors group">
                  <div className="col-span-2 flex flex-col min-w-0">
                    <span className="font-semibold text-sm truncate">{infraction.username}</span>
                    <span className="text-xs font-mono text-muted-foreground truncate">{infraction.userId}</span>
                  </div>
                  <div className="col-span-1">
                    {getTypeBadge(infraction.type)}
                  </div>
                  <div className="col-span-4 flex items-start gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-sm truncate" title={infraction.reason}>{infraction.reason}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <User className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <span className="text-xs truncate">{infraction.moderatorUsername}</span>
                  </div>
                  <div className="col-span-2 flex flex-col text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {format(new Date(infraction.createdAt), 'MMM d, yyyy')}</span>
                    <span className="ml-4.5">{format(new Date(infraction.createdAt), 'h:mm a')}</span>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                      onClick={() => handleDelete(infraction.id)}
                      title="Pardon Infraction"
                      disabled={deleteInfraction.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                <ShieldOff className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="font-semibold text-lg">No infractions found</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md">
                {debouncedUserId 
                  ? `No records found for user ${debouncedUserId}.`
                  : 'This server has a clean record. No warnings, kicks, or bans have been issued.'}
              </p>
              {debouncedUserId && (
                <Button variant="outline" className="mt-4" onClick={handleClearSearch}>
                  Clear Search
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
