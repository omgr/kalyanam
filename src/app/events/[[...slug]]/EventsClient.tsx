"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckSquare,
  Edit,
  Trash2,
  ArrowLeft,
  Plus,
  Check,
  Circle,
  Sparkles,
  FileText,
  AlertCircle,
  Save,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useEvents, useEvent, useFamilyMembers, useWedding } from "@/lib/db/hooks";
import { db, WeddingEvent, ChecklistItem } from "@/lib/db/schema";
import { formatDate, formatTime, generateId } from "@/lib/utils";

type EventRoute = { mode: 'list' | 'detail' | 'edit' | 'new'; eventId?: string };

/**
 * Events are addressed by query string rather than by path segment.
 *
 * A static export can only ship HTML for paths known at build time, and event
 * ids are created by the user at runtime — so `/events/<uuid>` had no page to
 * serve and returned a hard 404 on GitHub Pages. Keeping the id in the query
 * string means every view renders from the prerendered `/events` document,
 * which also keeps it working offline in the installed PWA.
 *
 *   /events                      -> list
 *   /events?id=<uuid>            -> detail
 *   /events?id=<uuid>&edit=1     -> edit
 *   /events/new  (or ?new=1)     -> create
 */
function parseRoute(pathname: string, params: URLSearchParams): EventRoute {
  const parts = pathname.split('/').filter(Boolean);

  // /events/new is still prerendered, so old links and bookmarks keep working.
  if (parts[1] === 'new' || params.get('new') === '1') return { mode: 'new' };

  const eventId = params.get('id');
  if (eventId) {
    return { mode: params.get('edit') === '1' ? 'edit' : 'detail', eventId };
  }

  return { mode: 'list' };
}

/** Canonical links for the views above. */
export const eventHref = {
  list: () => '/events',
  detail: (id: string) => `/events?id=${encodeURIComponent(id)}`,
  edit: (id: string) => `/events?id=${encodeURIComponent(id)}&edit=1`,
  new: () => '/events/new',
};

export default function EventsClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { mode, eventId } = parseRoute(pathname, searchParams);
  
  const [weddingId, setWeddingId] = useState<string | null>(null);

  useEffect(() => {
    const storedWeddingId = localStorage.getItem("kalyanam_wedding_id");
    if (!storedWeddingId) {
      router.push("/onboarding");
      return;
    }
    setWeddingId(storedWeddingId);
  }, [router]);

  if (!weddingId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (mode === 'list') return <EventsList weddingId={weddingId} />;
  if (mode === 'new') return <EventForm weddingId={weddingId} />;
  if (mode === 'detail' && eventId) return <EventDetail weddingId={weddingId} eventId={eventId} />;
  if (mode === 'edit' && eventId) return <EventForm weddingId={weddingId} eventId={eventId} />;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    </DashboardLayout>
  );
}

// ============================================
// EVENTS LIST
// ============================================
function EventsList({ weddingId }: { weddingId: string }) {
  const router = useRouter();
  const events = useEvents(weddingId);
  const wedding = useWedding(weddingId);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEvents = events?.filter((event) => {
    const matchesFilter = filter === "all" || event.category === filter;
    const matchesSearch = event.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.localName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "pre-wedding": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "wedding-day": return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400";
      case "post-wedding": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Events & Ceremonies</h1>
            <p className="text-muted-foreground">{events?.length || 0} events for {wedding?.name || "your wedding"}</p>
          </div>
          <Button onClick={() => router.push("/events/new")}><Plus className="w-4 h-4 mr-2" />Add Event</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search events..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "pre-wedding", "wedding-day", "post-wedding"].map((cat) => (
              <Button key={cat} variant={filter === cat ? "default" : "outline"} size="sm" onClick={() => setFilter(cat)}>
                {cat === "all" ? "All" : cat.replace("-", " ")}
              </Button>
            ))}
          </div>
        </div>

        {filteredEvents && filteredEvents.length > 0 ? (
          <div className="space-y-4">
            {filteredEvents.map((event, index) => (
              <motion.div key={event.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push(eventHref.detail(event.id))}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{event.name}</h3>
                          {event.localName && <span className="text-primary text-sm">({event.localName})</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{formatDate(event.date, "short")}</span>
                          {event.startTime && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatTime(event.startTime)}</span>}
                          {event.venue && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{event.venue}</span>}
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getCategoryColor(event.category)}`}>{event.category.replace("-", " ")}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No events yet</h3>
              <p className="text-muted-foreground mb-4">Start adding events and ceremonies for your wedding</p>
              <Button onClick={() => router.push("/events/new")}><Plus className="w-4 h-4 mr-2" />Add Your First Event</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// ============================================
// EVENT DETAIL
// ============================================
function EventDetail({ weddingId, eventId }: { weddingId: string; eventId: string }) {
  const router = useRouter();
  const event = useEvent(eventId);
  const familyMembers = useFamilyMembers(weddingId);
  const [newChecklistItem, setNewChecklistItem] = useState("");

  const handleToggleChecklist = async (itemId: string) => {
    if (!event) return;
    const updated = event.checklist?.map((item) => item.id === itemId ? { ...item, isCompleted: !item.isCompleted } : item);
    await db.events.update(eventId, { checklist: updated, updatedAt: new Date() });
  };

  const handleAddChecklistItem = async () => {
    if (!event || !newChecklistItem.trim()) return;
    const newItem: ChecklistItem = { id: generateId(), text: newChecklistItem.trim(), isCompleted: false };
    await db.events.update(eventId, { checklist: [...(event.checklist || []), newItem], updatedAt: new Date() });
    setNewChecklistItem("");
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!event) return;
    await db.events.update(eventId, { checklist: event.checklist?.filter((item) => item.id !== itemId), updatedAt: new Date() });
  };

  const handleUpdateStatus = async (status: WeddingEvent["status"]) => {
    await db.events.update(eventId, { status, updatedAt: new Date() });
  };

  const handleDeleteEvent = async () => {
    if (confirm("Are you sure you want to delete this event?")) {
      await db.events.delete(eventId);
      router.push("/events");
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "pre-wedding": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "wedding-day": return "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400";
      case "post-wedding": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "ongoing": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "cancelled": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "postponed": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  if (event === undefined) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading event...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (event === null) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Event not found</p>
            <Button variant="link" onClick={() => router.push("/events")}>Back to Events</Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const completedItems = event.checklist?.filter((c) => c.isCompleted).length || 0;
  const totalItems = event.checklist?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 lg:pb-0">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <Button variant="ghost" className="mb-2 -ml-2" onClick={() => router.push("/events")}>
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Events
            </Button>
            <h1 className="text-3xl font-display font-bold">{event.name}</h1>
            {event.localName && <p className="text-xl text-primary mt-1">{event.localName}</p>}
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(event.category)}`}>{event.category.replace("-", " ")}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(event.status)}`}>{event.status}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push(eventHref.edit(eventId))}><Edit className="w-4 h-4 mr-2" />Edit</Button>
            <Button variant="destructive" onClick={handleDeleteEvent}><Trash2 className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Event Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {event.description && <div><h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4><p>{event.description}</p></div>}
                <div className="grid grid-cols-2 gap-4">
                  <div><h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1"><Calendar className="w-4 h-4" /> Date</h4><p className="font-medium">{formatDate(event.date, "long")}</p></div>
                  {event.startTime && <div><h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1"><Clock className="w-4 h-4" /> Time</h4><p className="font-medium">{formatTime(event.startTime)}{event.endTime && ` - ${formatTime(event.endTime)}`}</p></div>}
                  {event.venue && <div className="col-span-2"><h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="w-4 h-4" /> Venue</h4><p className="font-medium">{event.venue}</p>{event.address && <p className="text-sm text-muted-foreground">{event.address}</p>}</div>}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><CheckSquare className="w-5 h-5" />Checklist{totalItems > 0 && <span className="text-sm font-normal text-muted-foreground">({completedItems}/{totalItems})</span>}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {totalItems > 0 && <div className="mb-4"><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completedItems / totalItems) * 100}%` }} /></div></div>}
                {event.checklist && event.checklist.length > 0 ? (
                  <ul className="space-y-2">
                    {event.checklist.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group">
                        <button onClick={() => handleToggleChecklist(item.id)} className="flex-shrink-0">{item.isCompleted ? <Check className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-muted-foreground" />}</button>
                        <span className={`flex-1 ${item.isCompleted ? "line-through text-muted-foreground" : ""}`}>{item.text}</span>
                        <button onClick={() => handleDeleteChecklistItem(item.id)} className="opacity-0 group-hover:opacity-100 text-red-500 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted-foreground text-center py-4">No checklist items yet</p>}
                <div className="flex gap-2 pt-2">
                  <Input placeholder="Add checklist item..." value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAddChecklistItem()} />
                  <Button onClick={handleAddChecklistItem} disabled={!newChecklistItem.trim()}><Plus className="w-4 h-4" /></Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" onClick={() => handleUpdateStatus("ongoing")} disabled={event.status === "ongoing"}><Sparkles className="w-4 h-4 mr-2 text-blue-500" />Mark as Ongoing</Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleUpdateStatus("completed")} disabled={event.status === "completed"}><Check className="w-4 h-4 mr-2 text-green-500" />Mark as Completed</Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleUpdateStatus("scheduled")} disabled={event.status === "scheduled"}><Calendar className="w-4 h-4 mr-2 text-yellow-500" />Reschedule</Button>
              </CardContent>
            </Card>

            {event.assignedTo && event.assignedTo.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />Assigned To</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {event.assignedTo.map((memberId) => {
                      const member = familyMembers?.find((m) => m.id === memberId);
                      return member ? (
                        <div key={memberId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">{member.name.charAt(0)}</div>
                          <div><p className="font-medium text-sm">{member.name}</p><p className="text-xs text-muted-foreground">{member.relation}</p></div>
                        </div>
                      ) : null;
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {event.notes && <Card><CardHeader><CardTitle>Notes</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.notes}</p></CardContent></Card>}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ============================================
// EVENT FORM (New & Edit)
// ============================================
function EventForm({ weddingId, eventId }: { weddingId: string; eventId?: string }) {
  const router = useRouter();
  const event = useEvent(eventId);
  const wedding = useWedding(weddingId);
  const familyMembers = useFamilyMembers(weddingId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "", localName: "", description: "", date: "", startTime: "", endTime: "",
    venue: "", address: "", category: "pre-wedding" as WeddingEvent["category"],
    assignedTo: [] as string[], budget: "", notes: "",
  });
  const [checklistItems, setChecklistItems] = useState<{ id: string; text: string; isCompleted: boolean }[]>([]);

  useEffect(() => {
    if (eventId && event) {
      setFormData({
        name: event.name || "", localName: event.localName || "", description: event.description || "",
        date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
        startTime: event.startTime || "", endTime: event.endTime || "", venue: event.venue || "",
        address: event.address || "", category: event.category, assignedTo: event.assignedTo || [],
        budget: event.budget?.toString() || "", notes: event.notes || "",
      });
      setChecklistItems(event.checklist?.map((item) => ({ id: item.id, text: item.text, isCompleted: item.isCompleted })) || []);
    }
  }, [eventId, event]);

  const updateFormData = (field: string, value: string | string[]) => setFormData((prev) => ({ ...prev, [field]: value }));
  const addChecklistItem = () => setChecklistItems([...checklistItems, { id: generateId(), text: "", isCompleted: false }]);
  const updateChecklistItem = (index: number, text: string) => { const u = [...checklistItems]; u[index] = { ...u[index], text }; setChecklistItems(u); };
  const removeChecklistItem = (index: number) => setChecklistItems(checklistItems.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!weddingId || !formData.name || !formData.date) return;
    setIsSubmitting(true);
    try {
      const checklist: ChecklistItem[] = checklistItems.filter((i) => i.text.trim()).map((i) => ({ id: i.id, text: i.text.trim(), isCompleted: i.isCompleted }));
      const eventData = {
        name: formData.name, localName: formData.localName || undefined, description: formData.description || undefined,
        date: new Date(formData.date), startTime: formData.startTime || undefined, endTime: formData.endTime || undefined,
        venue: formData.venue || undefined, address: formData.address || undefined, category: formData.category,
        assignedTo: formData.assignedTo.length > 0 ? formData.assignedTo : undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined, notes: formData.notes || undefined,
        checklist: checklist.length > 0 ? checklist : undefined, updatedAt: new Date(),
      };
      if (eventId) {
        await db.events.update(eventId, eventData);
        router.push(eventHref.detail(eventId));
      } else {
        const newId = generateId();
        await db.events.add({ ...eventData, id: newId, weddingId, status: "scheduled", createdAt: new Date() } as WeddingEvent);
        router.push(eventHref.detail(newId));
      }
    } catch (error) {
      console.error("Error saving event:", error);
      setIsSubmitting(false);
    }
  };

  if (eventId && !event) return <DashboardLayout><div className="flex items-center justify-center h-64"><p className="text-muted-foreground">Loading...</p></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6 pb-20 lg:pb-0">
        <div>
          <Button variant="ghost" className="mb-2 -ml-2" onClick={() => eventId ? router.push(eventHref.detail(eventId)) : router.push("/events")}>
            <ArrowLeft className="w-4 h-4 mr-2" />{eventId ? "Back to Event" : "Back to Events"}
          </Button>
          <h1 className="text-3xl font-display font-bold">{eventId ? "Edit Event" : "New Event"}</h1>
          <p className="text-muted-foreground">{eventId ? `Update ${event?.name}` : `Add a new event for ${wedding?.name}`}</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" />Event Details</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="name">Event Name *</Label><Input id="name" placeholder="e.g., Mehndi Ceremony" value={formData.name} onChange={(e) => updateFormData("name", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="localName">Local Name</Label><Input id="localName" placeholder="e.g., మెహెందీ" value={formData.localName} onChange={(e) => updateFormData("localName", e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="description">Description</Label><textarea id="description" className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Describe the event..." value={formData.description} onChange={(e) => updateFormData("description", e.target.value)} /></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Label htmlFor="date">Date *</Label><Input id="date" type="date" value={formData.date} onChange={(e) => updateFormData("date", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="startTime">Start Time</Label><Input id="startTime" type="time" value={formData.startTime} onChange={(e) => updateFormData("startTime", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="endTime">End Time</Label><Input id="endTime" type="time" value={formData.endTime} onChange={(e) => updateFormData("endTime", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="venue">Venue</Label><Input id="venue" placeholder="e.g., Grand Palace Hall" value={formData.venue} onChange={(e) => updateFormData("venue", e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="address">Address</Label><Input id="address" placeholder="Full address..." value={formData.address} onChange={(e) => updateFormData("address", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Category</Label><select className="w-full h-10 rounded-lg border border-input bg-background px-3" value={formData.category} onChange={(e) => updateFormData("category", e.target.value as WeddingEvent["category"])}><option value="pre-wedding">Pre-Wedding</option><option value="wedding-day">Wedding Day</option><option value="post-wedding">Post-Wedding</option><option value="other">Other</option></select></div>
              <div className="space-y-2"><Label htmlFor="budget">Budget</Label><Input id="budget" type="number" placeholder="e.g., 50000" value={formData.budget} onChange={(e) => updateFormData("budget", e.target.value)} /></div>
            </div>
            {familyMembers && familyMembers.length > 0 && (
              <div className="space-y-2"><Label>Assign To</Label><div className="flex flex-wrap gap-2">{familyMembers.map((m) => (<button key={m.id} type="button" onClick={() => { const s = formData.assignedTo.includes(m.id); updateFormData("assignedTo", s ? formData.assignedTo.filter((id) => id !== m.id) : [...formData.assignedTo, m.id]); }} className={`px-3 py-1.5 rounded-full text-sm transition-colors ${formData.assignedTo.includes(m.id) ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}>{m.name}</button>))}</div></div>
            )}
            <div className="space-y-2"><Label>Checklist Items</Label><div className="space-y-2">{checklistItems.map((item, i) => (<div key={item.id} className="flex gap-2"><Input placeholder={`Item ${i + 1}`} value={item.text} onChange={(e) => updateChecklistItem(i, e.target.value)} /><Button type="button" variant="ghost" size="icon" onClick={() => removeChecklistItem(i)}><Trash2 className="w-4 h-4 text-red-500" /></Button></div>))}<Button type="button" variant="outline" onClick={addChecklistItem} className="w-full"><Plus className="w-4 h-4 mr-2" />Add Item</Button></div></div>
            <div className="space-y-2"><Label htmlFor="notes">Notes</Label><textarea id="notes" className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Any additional notes..." value={formData.notes} onChange={(e) => updateFormData("notes", e.target.value)} /></div>
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => eventId ? router.push(eventHref.detail(eventId)) : router.push("/events")}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!formData.name || !formData.date || isSubmitting}>{isSubmitting ? "Saving..." : <><Save className="w-4 h-4 mr-2" />{eventId ? "Save Changes" : "Create Event"}</>}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

