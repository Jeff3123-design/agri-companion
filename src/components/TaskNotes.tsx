import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, MessageSquare, Calendar } from "lucide-react";
import { format } from "date-fns";

interface TaskNote {
  id: string;
  note: string;
  day: number;
  created_at: string;
}

interface TaskNotesProps {
  sessionId: string;
  userId: string;
  currentDay: number;
}

export const TaskNotes = ({ sessionId, userId, currentDay }: TaskNotesProps) => {
  const { toast } = useToast();
  const [notes, setNotes] = useState<TaskNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [showInput, setShowInput] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [sessionId, currentDay]);

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("task_notes")
      .select("*")
      .eq("session_id", sessionId)
      .eq("day", currentDay)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
    } else {
      setNotes(data || []);
    }
    setLoading(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setSaving(true);
    const { error } = await supabase.from("task_notes").insert({
      user_id: userId,
      session_id: sessionId,
      day: currentDay,
      note: newNote.trim(),
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Note saved",
        description: "Your observation has been recorded.",
      });
      setNewNote("");
      setShowInput(false);
      fetchNotes();
    }
    setSaving(false);
  };

  const handleDeleteNote = async (noteId: string) => {
    const { error } = await supabase
      .from("task_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete note.",
        variant: "destructive",
      });
    } else {
      setNotes(notes.filter((n) => n.id !== noteId));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5" />
            Daily Observations
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInput(!showInput)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showInput && (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <Textarea
              placeholder="Record your observations, weather conditions, pest sightings, or any notes for today..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddNote} disabled={saving || !newNote.trim()}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Save Note
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowInput(false);
                  setNewNote("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {notes.length === 0 && !showInput ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No observations recorded for Day {currentDay}. Add notes to track your progress!
          </p>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className="p-3 bg-card border rounded-lg group"
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                    onClick={() => handleDeleteNote(note.id)}
                    aria-label="Delete note"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(note.created_at), "MMM d, yyyy 'at' h:mm a")}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
