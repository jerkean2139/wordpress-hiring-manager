import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useListApplicants, ApplicantStatus, ListApplicantsParams } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Search, MapPin, Briefcase, Calendar, Phone, Mail, ChevronRight, Loader2, FilterX } from "lucide-react";
import { format } from "date-fns";

export default function Applicants() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();

  const [filters, setFilters] = useState<ListApplicantsParams>({
    status: undefined,
    search: "",
    location: "",
    position: "",
  });

  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search || ""), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isAuthLoading, setLocation]);

  const { data: applicants, isLoading } = useListApplicants({
    ...filters,
    search: debouncedSearch || undefined,
  });

  if (isAuthLoading || !isAuthenticated) return null;

  const locations = ["Richmond", "New Paris", "Lakengren"];
  const positions = ["Kitchen", "Driver", "Cashier", "Manager", "Prep"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Applicants</h1>
            <p className="text-muted-foreground mt-1">Manage and filter all incoming applications.</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-card border border-border p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              value={filters.search || ""}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>
          
          <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 md:pb-0">
            <select
              className="px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer min-w-[140px]"
              value={filters.status || ""}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any || undefined }))}
            >
              <option value="">All Statuses</option>
              {Object.values(ApplicantStatus).map(status => (
                <option key={status} value={status} className="capitalize">{status}</option>
              ))}
            </select>

            <select
              className="px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer min-w-[140px]"
              value={filters.location || ""}
              onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value || undefined }))}
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>

            <select
              className="px-4 py-2.5 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer min-w-[140px]"
              value={filters.position || ""}
              onChange={(e) => setFilters(prev => ({ ...prev, position: e.target.value || undefined }))}
            >
              <option value="">All Positions</option>
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>

            {(filters.status || filters.search || filters.location || filters.position) && (
              <button
                onClick={() => setFilters({ search: "", status: undefined, location: undefined, position: undefined })}
                className="p-2.5 bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-colors shrink-0"
                title="Clear Filters"
              >
                <FilterX className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-32">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p>Loading applicants...</p>
            </div>
          ) : !applicants || applicants.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-32">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium text-foreground">No applicants found</h3>
              <p className="mt-1">Try adjusting your filters or search term.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {applicants.map((app) => (
                <Link 
                  key={app.id} 
                  href={`/applicants/${app.id}`}
                  className="flex flex-col lg:flex-row lg:items-center p-5 hover:bg-muted/30 transition-colors gap-4 lg:gap-8 cursor-pointer group block"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-foreground truncate">{app.name}</h3>
                      <StatusBadge status={app.status} />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-y-2 gap-x-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-2 truncate">
                        <MapPin className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{app.location || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Briefcase className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{app.position || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{app.email || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 truncate">
                        <Phone className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{app.phoneCell || app.phoneHome || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 border-border pt-4 lg:pt-0">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Applied: {format(new Date(app.createdAt), "MMM d, yyyy")}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors border border-border group-hover:border-primary">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
