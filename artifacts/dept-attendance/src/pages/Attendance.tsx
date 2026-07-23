import { useState, useMemo, useRef } from "react";
import { format, subDays, addDays } from "date-fns";
import { 
  useListMembers, 
  useListAttendance, 
  useMarkAttendance, 
  useUpdateAttendance, 
  useBulkMarkAttendance,
  AttendanceRecordStatus 
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText,
  Filter,
  CheckSquare
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListAttendanceQueryKey } from "@workspace/api-client-react";
import { cn, getRoleLabel } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Attendance() {
  const [date, setDate] = useState<Date>(new Date());
  const formattedDate = format(date, "yyyy-MM-dd");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: members, isLoading: isLoadingMembers } = useListMembers();
  const { data: attendanceRecords, isLoading: isLoadingAttendance } = useListAttendance({ date: formattedDate });
  
  const markMutation = useMarkAttendance();
  const updateMutation = useUpdateAttendance();
  const bulkMarkMutation = useBulkMarkAttendance();

  const handlePreviousDay = () => setDate(subDays(date, 1));
  const handleNextDay = () => setDate(addDays(date, 1));

  // Combine members with their attendance records for the selected date
  const memberAttendance = useMemo(() => {
    if (!members) return [];
    
    let filtered = members;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(q) || 
        m.memberId.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") {
      filtered = filtered.filter(m => m.role === roleFilter);
    }
    
    return filtered.map(member => {
      const record = attendanceRecords?.find(a => a.memberId === member.id);
      return {
        member,
        record
      };
    });
  }, [members, attendanceRecords, search, roleFilter]);

  const stats = useMemo(() => {
    if (!attendanceRecords) return { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    return {
      present: attendanceRecords.filter(r => r.status === "present").length,
      absent: attendanceRecords.filter(r => r.status === "absent").length,
      late: attendanceRecords.filter(r => r.status === "late").length,
      excused: attendanceRecords.filter(r => r.status === "excused").length,
      total: attendanceRecords.length
    };
  }, [attendanceRecords]);

  const handleMarkStatus = (memberId: number, status: AttendanceRecordStatus, recordId?: number) => {
    if (recordId) {
      // Update existing
      updateMutation.mutate({
        id: recordId,
        data: { status }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ date: formattedDate }) });
        }
      });
    } else {
      // Create new
      markMutation.mutate({
        data: {
          memberId,
          date: formattedDate,
          status
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ date: formattedDate }) });
        }
      });
    }
  };

  const handleUpdateNote = (recordId: number, note: string) => {
    updateMutation.mutate({
      id: recordId,
      data: { note }
    }, {
      onSuccess: () => {
        toast({ title: "Note saved", description: "Attendance note updated." });
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ date: formattedDate }) });
      }
    });
  };

  const handleBulkMarkPresent = () => {
    if (!members) return;
    
    const records = memberAttendance
      .filter(ma => !ma.record) // Only mark those not already marked
      .map(ma => ({
        memberId: ma.member.id,
        status: "present" as AttendanceRecordStatus
      }));
      
    if (records.length === 0) {
      toast({ title: "No action needed", description: "All members are already marked for this day." });
      return;
    }

    bulkMarkMutation.mutate({
      data: {
        date: formattedDate,
        records
      }
    }, {
      onSuccess: () => {
        toast({ title: "Bulk update successful", description: `Marked ${records.length} members as present.` });
        queryClient.invalidateQueries({ queryKey: getListAttendanceQueryKey({ date: formattedDate }) });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to perform bulk update.", variant: "destructive" });
      }
    });
  };

  const isLoading = isLoadingMembers || isLoadingAttendance;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Daily Attendance</h1>
          <p className="text-muted-foreground mt-1">Record and manage attendance for specific dates.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card border rounded-lg p-1 shadow-sm">
          <Button variant="ghost" size="icon" onClick={handlePreviousDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-[180px] justify-center font-medium">
                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                {format(date, "PPP")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          
          <Button variant="ghost" size="icon" onClick={handleNextDay} disabled={format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card shadow-sm border">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-foreground">{members?.length || 0}</span>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">Total</span>
          </CardContent>
        </Card>
        <Card className="bg-accent/10 border-accent/20 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-accent">{stats.present}</span>
            <span className="text-xs text-accent font-medium uppercase tracking-wider mt-1">Present</span>
          </CardContent>
        </Card>
        <Card className="bg-destructive/10 border-destructive/20 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-destructive">{stats.absent}</span>
            <span className="text-xs text-destructive font-medium uppercase tracking-wider mt-1">Absent</span>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-500">{stats.late}</span>
            <span className="text-xs text-amber-700 dark:text-amber-500 font-medium uppercase tracking-wider mt-1">Late</span>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20 shadow-sm">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <span className="text-2xl font-bold text-blue-700 dark:text-blue-500">{stats.excused}</span>
            <span className="text-xs text-blue-700 dark:text-blue-500 font-medium uppercase tracking-wider mt-1">Excused</span>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20">
          <div className="flex w-full sm:w-auto gap-3">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search member..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background h-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-36 bg-background h-9">
                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="hod">HOD</SelectItem>
                <SelectItem value="cc_faculty">Computer Center Faculty</SelectItem>
                <SelectItem value="school_faculty">School Computer Faculty</SelectItem>
                <SelectItem value="lab_instructor">Mobile Lab Instructor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button 
            variant="default" 
            size="sm" 
            className="w-full sm:w-auto gap-2"
            onClick={handleBulkMarkPresent}
            disabled={bulkMarkMutation.isPending || isLoading}
          >
            <CheckSquare className="h-4 w-4" />
            Mark Unmarked as Present
          </Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-[300px]">Member</TableHead>
              <TableHead>Role/Details</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[250px]">Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array(5).fill(0).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                  <TableCell><div className="flex gap-3 items-center"><div className="w-8 h-8 rounded-full bg-muted"></div><div className="h-4 w-32 bg-muted rounded"></div></div></TableCell>
                  <TableCell><div className="h-4 w-24 bg-muted rounded"></div></TableCell>
                  <TableCell><div className="h-8 w-48 bg-muted rounded mx-auto"></div></TableCell>
                  <TableCell><div className="h-8 w-full bg-muted rounded"></div></TableCell>
                </TableRow>
              ))
            ) : memberAttendance.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                  No members found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              memberAttendance.map(({ member, record }) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        {member.photoUrl ? (
                          <AvatarImage src={member.photoUrl} alt={member.name} />
                        ) : (
                          <AvatarFallback className="bg-primary/5 text-primary text-xs">
                            {member.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div>
                        <div className="font-medium text-sm text-foreground leading-none mb-1">{member.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{member.memberId}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className="w-fit text-[10px] py-0 px-1.5">{getRoleLabel(member.role)}</Badge>
                      {member.year && <span className="text-xs text-muted-foreground">{member.year} {member.section ? `- ${member.section}` : ''}</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="inline-flex bg-muted/50 p-0.5 rounded-lg border">
                      <StatusButton 
                        icon={<CheckCircle2 className="h-4 w-4 mr-1.5" />}
                        label="Present"
                        active={record?.status === 'present'}
                        onClick={() => handleMarkStatus(member.id, 'present', record?.id)}
                        colorClass="text-accent hover:bg-accent/10 data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                      />
                      <StatusButton 
                        icon={<XCircle className="h-4 w-4 mr-1.5" />}
                        label="Absent"
                        active={record?.status === 'absent'}
                        onClick={() => handleMarkStatus(member.id, 'absent', record?.id)}
                        colorClass="text-destructive hover:bg-destructive/10 data-[active=true]:bg-destructive data-[active=true]:text-destructive-foreground"
                      />
                      <StatusButton 
                        icon={<Clock className="h-4 w-4 mr-1.5" />}
                        label="Late"
                        active={record?.status === 'late'}
                        onClick={() => handleMarkStatus(member.id, 'late', record?.id)}
                        colorClass="text-amber-600 dark:text-amber-500 hover:bg-amber-500/10 data-[active=true]:bg-amber-500 data-[active=true]:text-white"
                      />
                      <StatusButton 
                        icon={<FileText className="h-4 w-4 mr-1.5" />}
                        label="Excused"
                        active={record?.status === 'excused'}
                        onClick={() => handleMarkStatus(member.id, 'excused', record?.id)}
                        colorClass="text-blue-600 dark:text-blue-500 hover:bg-blue-500/10 data-[active=true]:bg-blue-500 data-[active=true]:text-white"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {record ? (
                      <NoteInput 
                        recordId={record.id} 
                        initialNote={record.note || ""} 
                        onSave={(note) => handleUpdateNote(record.id, note)} 
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground italic px-2">Mark status first</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatusButton({ 
  icon, label, active, onClick, colorClass 
}: { 
  icon: React.ReactNode, label: string, active: boolean, onClick: () => void, colorClass: string 
}) {
  return (
    <button
      onClick={onClick}
      data-active={active}
      className={cn(
        "flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-all",
        colorClass,
        !active && "text-muted-foreground hover:text-foreground"
      )}
    >
      {icon} {label}
    </button>
  );
}

function NoteInput({ recordId, initialNote, onSave }: { recordId: number, initialNote: string, onSave: (note: string) => void }) {
  const [note, setNote] = useState(initialNote);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleBlur = () => {
    setIsEditing(false);
    if (note !== initialNote) {
      onSave(note);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setNote(initialNote);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        autoFocus
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="h-8 text-xs bg-background"
        placeholder="Add a note..."
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className="min-h-8 px-3 py-1.5 text-xs rounded-md border border-transparent hover:border-border hover:bg-muted/50 cursor-pointer flex items-center text-muted-foreground transition-colors"
    >
      {note || "Add note..."}
    </div>
  );
}
