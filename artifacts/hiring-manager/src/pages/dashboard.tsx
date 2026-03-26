import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useGetStats } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Users, FileText, CheckCircle2, XCircle, Clock, MapPin, Briefcase } from "lucide-react";
import { format } from "date-fns";

export default function Dashboard() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isAuthLoading, setLocation]);

  const { data: stats, isLoading: isStatsLoading } = useGetStats();

  if (isAuthLoading || !isAuthenticated) return null;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your hiring pipeline across all locations.</p>
        </div>

        {isStatsLoading || !stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-28 bg-card rounded-2xl animate-pulse border border-border" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard title="Total" value={stats.total} icon={Users} color="text-blue-500" />
            <StatCard title="New" value={stats.new} icon={FileText} color="text-info" />
            <StatCard title="Reviewed" value={stats.reviewed} icon={Clock} color="text-warning" />
            <StatCard title="Interviewing" value={stats.interviewing} icon={Users} color="text-purple-400" />
            <StatCard title="Hired" value={stats.hired} icon={CheckCircle2} color="text-success" />
            <StatCard title="Rejected" value={stats.rejected} icon={XCircle} color="text-destructive" />
          </div>
        )}

        <div className="bg-card border border-border rounded-2xl shadow-lg shadow-black/5 overflow-hidden">
          <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20">
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Recent Applications</h2>
              <p className="text-sm text-muted-foreground">The most recent submissions from the website.</p>
            </div>
            <Link 
              href="/applicants"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:bg-secondary/80 transition-colors text-sm"
            >
              View All
            </Link>
          </div>
          
          <div className="divide-y divide-border">
            {isStatsLoading ? (
              <div className="p-8 text-center text-muted-foreground">Loading recent applicants...</div>
            ) : stats?.recentApplicants && stats.recentApplicants.length > 0 ? (
              stats.recentApplicants.map((app) => (
                <Link 
                  key={app.id} 
                  href={`/applicants/${app.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 hover:bg-muted/30 transition-colors gap-4 block"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground text-lg">{app.name}</span>
                      <StatusBadge status={app.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-1">
                      {app.position && (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-4 h-4 text-primary" />
                          <span>{app.position}</span>
                        </div>
                      )}
                      {app.location && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span>{app.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(app.createdAt), "MMM d, yyyy")}
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No applications yet</h3>
                <p className="text-muted-foreground mt-1">New applications will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={`p-2 bg-muted rounded-lg group-hover:scale-110 transition-transform ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-display font-bold text-foreground mt-2">{value}</p>
    </div>
  );
}
