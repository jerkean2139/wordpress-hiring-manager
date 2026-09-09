import { useEffect, useState } from "react";
import { useLocation, Link, useParams } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  useGetApplicant, 
  useUpdateApplicant, 
  useDeleteApplicant,
  useListNotes,
  useCreateNote,
  getGetApplicantQueryKey,
  getListNotesQueryKey,
  ApplicantStatus 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, MapPin, Briefcase, Mail, Phone, Calendar, 
  GraduationCap, DollarSign, MessageSquare, Loader2, Trash2, Send
} from "lucide-react";
import { format } from "date-fns";

export default function ApplicantDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [noteBody, setNoteBody] = useState("");

  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, isAuthLoading, setLocation]);

  const { data: applicant, isLoading: isApplicantLoading } = useGetApplicant(id, {
    query: { queryKey: getGetApplicantQueryKey(id), enabled: id > 0 }
  });

  const { data: notes, isLoading: isNotesLoading } = useListNotes(id, {
    query: { queryKey: getListNotesQueryKey(id), enabled: id > 0 }
  });

  const updateMutation = useUpdateApplicant({
    mutation: {
      onSuccess: () => {
        toast({ title: "Status updated successfully" });
        queryClient.invalidateQueries({ queryKey: ["/api/applicants"] });
        queryClient.invalidateQueries({ queryKey: [`/api/applicants/${id}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/stats`] });
      },
      onError: () => toast({ title: "Failed to update status", variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteApplicant({
    mutation: {
      onSuccess: () => {
        toast({ title: "Applicant deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/applicants"] });
        setLocation("/applicants");
      }
    }
  });

  const noteMutation = useCreateNote({
    mutation: {
      onSuccess: () => {
        setNoteBody("");
        queryClient.invalidateQueries({ queryKey: [`/api/applicants/${id}/notes`] });
        toast({ title: "Note added" });
      }
    }
  });

  if (isAuthLoading || !isAuthenticated) return null;

  if (isApplicantLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!applicant) {
    return (
      <AppLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-foreground">Applicant not found</h2>
          <Link href="/applicants" className="text-primary hover:underline mt-4 inline-block">Return to list</Link>
        </div>
      </AppLayout>
    );
  }

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this applicant? This cannot be undone.")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleStatusChange = (newStatus: ApplicantStatus) => {
    updateMutation.mutate({ id, data: { status: newStatus } });
  };

  const submitNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteBody.trim()) return;
    noteMutation.mutate({ id, data: { body: noteBody } });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link href="/applicants" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors w-fit">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Applicants
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-card border border-border rounded-lg overflow-hidden p-1 shadow-sm">
              <span className="text-sm text-muted-foreground px-3">Status:</span>
              <select
                className="bg-background border border-border rounded-md px-3 py-1.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
                value={applicant.status}
                onChange={(e) => handleStatusChange(e.target.value as ApplicantStatus)}
                disabled={updateMutation.isPending}
              >
                {Object.values(ApplicantStatus).map(status => (
                  <option key={status} value={status} className="capitalize">{status}</option>
                ))}
              </select>
            </div>
            
            <button 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="p-2.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-transparent hover:border-destructive/20"
              title="Delete Applicant"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Header Card */}
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center relative z-10">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground">{applicant.name}</h1>
                <StatusBadge status={applicant.status} className="text-sm px-3 py-1" />
              </div>
              
              <div className="flex flex-wrap gap-4 text-muted-foreground mt-4">
                {applicant.position && (
                  <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border border-border">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">{applicant.position}</span>
                  </div>
                )}
                {applicant.location && (
                  <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border border-border">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">{applicant.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border border-border">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="font-medium text-foreground">Applied {format(new Date(applicant.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          
          {/* Left Col: Details */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-display font-bold mb-6 text-foreground border-b border-border pb-4">Contact Information</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Email</label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="p-2 bg-muted rounded-lg"><Mail className="w-4 h-4 text-foreground" /></div>
                    <span className="text-foreground">{applicant.email || "Not provided"}</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Cell Phone</label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="p-2 bg-muted rounded-lg"><Phone className="w-4 h-4 text-foreground" /></div>
                    <span className="text-foreground">{applicant.phoneCell || applicant.phoneHome || "Not provided"}</span>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Address</label>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="p-2 bg-muted rounded-lg"><MapPin className="w-4 h-4 text-foreground" /></div>
                    <span className="text-foreground">
                      {[applicant.address, applicant.city, applicant.state, applicant.zip].filter(Boolean).join(", ") || "Not provided"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-display font-bold mb-6 text-foreground border-b border-border pb-4">Application Details</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-2"><Calendar className="w-3.5 h-3.5"/> Date Can Start</label>
                  <p className="text-foreground mt-2 font-medium bg-background border border-border p-3 rounded-xl">
                    {applicant.dateCanStart || "Not specified"}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-2"><DollarSign className="w-3.5 h-3.5"/> Salary Desired</label>
                  <p className="text-foreground mt-2 font-medium bg-background border border-border p-3 rounded-xl">
                    {applicant.salaryDesired || "Not specified"}
                  </p>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5"/> HS Diploma/GED</label>
                  <p className="text-foreground mt-2 font-medium bg-background border border-border p-3 rounded-xl">
                    {applicant.hasHighSchoolDiploma === true ? "Yes" : applicant.hasHighSchoolDiploma === false ? "No" : "Not specified"}
                  </p>
                </div>
              </div>
            </div>

            {/* Raw Payload Section (collapsible/debug) */}
            {applicant.rawPayload && Object.keys(applicant.rawPayload).length > 0 && (
              <details className="group bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <summary className="p-6 text-lg font-display font-bold text-foreground cursor-pointer select-none list-none flex justify-between items-center">
                  Raw Webhook Data
                  <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md group-open:hidden">Show</span>
                  <span className="text-sm font-normal text-muted-foreground bg-muted px-2 py-1 rounded-md hidden group-open:block">Hide</span>
                </summary>
                <div className="p-6 pt-0 border-t border-border bg-background/50">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap overflow-x-auto bg-background p-4 rounded-xl border border-border">
                    {JSON.stringify(applicant.rawPayload, null, 2)}
                  </pre>
                </div>
              </details>
            )}
          </div>

          {/* Right Col: Notes */}
          <div className="bg-card border border-border rounded-2xl flex flex-col h-[600px] xl:h-[auto] shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/20 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-display font-bold text-foreground">Internal Notes</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {isNotesLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : !notes || notes.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p>No notes yet.</p>
                  <p className="text-sm mt-1">Add a note below to track progress or interview feedback.</p>
                </div>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="bg-background border border-border rounded-xl p-4 shadow-sm relative group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-sm text-foreground">{note.author}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(note.createdAt), "MMM d, p")}</span>
                    </div>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{note.body}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-border bg-background">
              <form onSubmit={submitNote} className="flex flex-col gap-3">
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Type a note..."
                  className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[80px]"
                />
                <button
                  type="submit"
                  disabled={noteMutation.isPending || !noteBody.trim()}
                  className="self-end px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-lg shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-all"
                >
                  {noteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Add Note
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
