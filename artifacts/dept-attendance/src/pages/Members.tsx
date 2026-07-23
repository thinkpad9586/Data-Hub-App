import { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react";
import { useListMembers, useCreateMember, useUpdateMember, useDeleteMember, useUploadMemberPhoto, Member } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, MoreVertical, Edit2, Trash2, Camera, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { getListMembersQueryKey } from "@workspace/api-client-react";
import { getRoleLabel } from "@/lib/utils";

type MemberRole = "hod" | "cc_faculty" | "school_faculty" | "lab_instructor";

export default function Members() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  const { data: members, isLoading } = useListMembers({ 
    search: search || undefined, 
    role: roleFilter !== "all" ? roleFilter : undefined 
  });

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setIsFormOpen(true);
  };

  const handleOpenNew = () => {
    setEditingMember(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Members</h1>
          <p className="text-muted-foreground mt-1">Manage department faculty and instructors.</p>
        </div>
        <Button onClick={handleOpenNew} className="shrink-0 gap-2">
          <Plus className="h-4 w-4" /> Add Member
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, ID, or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full bg-background"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[180px] bg-background">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="hod">Head of Computer Department (HOD)</SelectItem>
            <SelectItem value="cc_faculty">Computer Center Faculty</SelectItem>
            <SelectItem value="school_faculty">School Computer Faculty</SelectItem>
            <SelectItem value="lab_instructor">Mobile Computer Lab Instructor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="animate-pulse shadow-sm border">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : members?.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-xl bg-card">
          <User className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-foreground">No members found</h3>
          <p className="text-muted-foreground mt-1 text-sm max-w-sm mx-auto">
            {search || roleFilter !== "all" 
              ? "Try adjusting your search filters to find what you're looking for." 
              : "Start by adding members to your department directory."}
          </p>
          {!search && roleFilter === "all" && (
            <Button onClick={handleOpenNew} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" /> Add First Member
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {members?.map(member => (
            <MemberCard key={member.id} member={member} onEdit={() => handleEdit(member)} />
          ))}
        </div>
      )}

      <MemberFormDialog 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        member={editingMember} 
      />
    </div>
  );
}

function MemberCard({ member, onEdit }: { member: Member; onEdit: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const deleteMutation = useDeleteMember();
  const uploadMutation = useUploadMemberPhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'hod': return 'default';
      case 'cc_faculty': return 'info';
      case 'school_faculty': return 'secondary';
      case 'lab_instructor': return 'warning';
      default: return 'outline';
    }
  };

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${member.name}? This action cannot be undone.`)) {
      deleteMutation.mutate({ id: member.id }, {
        onSuccess: () => {
          toast({ title: "Member deleted", description: `${member.name} has been removed.` });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to delete member.", variant: "destructive" });
        }
      });
    }
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const base64Data = base64.split(',')[1];
      
      uploadMutation.mutate({
        id: member.id,
        data: {
          photoBase64: base64Data,
          mimeType: file.type
        }
      }, {
        onSuccess: () => {
          toast({ title: "Photo updated", description: "Member photo has been updated successfully." });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
        },
        onError: () => {
          toast({ title: "Upload failed", description: "Could not upload the photo.", variant: "destructive" });
        }
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="group overflow-hidden shadow-sm hover:shadow-md transition-shadow border-muted/60">
      <CardContent className="p-0">
        <div className="p-6 flex items-start gap-4">
          <div className="relative">
            <Avatar className="h-16 w-16 border shadow-sm">
              {member.photoUrl ? (
                <AvatarImage src={member.photoUrl} alt={member.name} className="object-cover" />
              ) : (
                <AvatarFallback className="bg-primary/5 text-primary text-xl font-medium">
                  {member.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <button 
              className="absolute -bottom-2 -right-2 p-1.5 bg-background border rounded-full text-muted-foreground shadow-sm hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              <Camera className="h-3 w-3" />
            </button>
            <input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handlePhotoUpload} 
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-foreground truncate" title={member.name}>{member.name}</h3>
                <p className="text-sm text-muted-foreground font-mono mt-0.5">{member.memberId}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onEdit} className="gap-2 cursor-pointer">
                    <Edit2 className="h-4 w-4" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="gap-2 cursor-pointer">
                    <Camera className="h-4 w-4" /> Update Photo
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive cursor-pointer">
                    <Trash2 className="h-4 w-4" /> Delete Member
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={getRoleBadgeColor(member.role) as any} className="text-[10px] px-1.5 py-0">
                {getRoleLabel(member.role)}
              </Badge>
              {member.year && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground bg-muted/50 border-transparent">
                  Year {member.year}
                </Badge>
              )}
              {member.section && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground bg-muted/50 border-transparent">
                  Sec {member.section}
                </Badge>
              )}
            </div>
          </div>
        </div>
        {(member.email || member.phone) && (
          <div className="bg-muted/30 px-6 py-3 border-t text-xs text-muted-foreground flex flex-col gap-1">
            {member.email && <div className="truncate">{member.email}</div>}
            {member.phone && <div>{member.phone}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MemberFormDialog({ 
  open, 
  onOpenChange, 
  member 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  member: Member | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();
  
  const isEditing = !!member;
  
  const [formData, setFormData] = useState({
    memberId: "",
    name: "",
    email: "",
    phone: "",
    role: "hod" as MemberRole,
    department: "Computer Science",
    year: "",
    section: ""
  });

  // Reset form when opened with new member data
  useEffect(() => {
    if (open) {
      if (member) {
        setFormData({
          memberId: member.memberId,
          name: member.name,
          email: member.email || "",
          phone: member.phone || "",
          role: member.role as MemberRole,
          department: member.department,
          year: member.year || "",
          section: member.section || ""
        });
      } else {
        setFormData({
          memberId: "",
          name: "",
          email: "",
          phone: "",
          role: "hod",
          department: "Computer Science",
          year: "",
          section: ""
        });
      }
    }
  }, [open, member]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (isEditing) {
      updateMutation.mutate({
        id: member.id,
        data: formData
      }, {
        onSuccess: () => {
          toast({ title: "Member updated", description: "Changes saved successfully." });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to update member.", variant: "destructive" })
      });
    } else {
      createMutation.mutate({
        data: formData as any
      }, {
        onSuccess: () => {
          toast({ title: "Member created", description: `${formData.name} has been added.` });
          queryClient.invalidateQueries({ queryKey: getListMembersQueryKey() });
          onOpenChange(false);
        },
        onError: () => toast({ title: "Error", description: "Failed to create member.", variant: "destructive" })
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Member" : "Add New Member"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Update member details in the department directory." : "Add a new faculty or instructor to the department."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Full Name <span className="text-destructive">*</span></label>
              <Input 
                required 
                value={formData.name} 
                onChange={(e) => handleChange("name", e.target.value)} 
                placeholder="Jane Doe"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">ID Number <span className="text-destructive">*</span></label>
              <Input 
                required 
                value={formData.memberId} 
                onChange={(e) => handleChange("memberId", e.target.value)} 
                placeholder="e.g. 2023-001"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Role <span className="text-destructive">*</span></label>
              <Select value={formData.role} onValueChange={(val) => handleChange("role", val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hod">Head of Computer Department (HOD)</SelectItem>
                  <SelectItem value="cc_faculty">Computer Center Faculty</SelectItem>
                  <SelectItem value="school_faculty">School Computer Faculty</SelectItem>
                  <SelectItem value="lab_instructor">Mobile Computer Lab Instructor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input 
                type="email" 
                value={formData.email} 
                onChange={(e) => handleChange("email", e.target.value)} 
                placeholder="jane.doe@university.edu"
              />
            </div>
            
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Save Changes" : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
