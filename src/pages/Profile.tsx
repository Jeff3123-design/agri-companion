import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, User, MapPin, Ruler, Phone } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    farm_location: "",
    farm_size: "",
    contact_info: "",
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else if (data) {
        setProfile({
          full_name: data.full_name || "",
          farm_location: data.farm_location || "",
          farm_size: data.farm_size || "",
          contact_info: data.contact_info || "",
        });
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
        farm_location: profile.farm_location,
        farm_size: profile.farm_size,
        contact_info: profile.contact_info,
      })
      .eq("id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Your profile has been updated.",
      });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20 md:pt-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pb-24 md:pt-20">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Your Profile</h1>
          <p className="text-muted-foreground">
            Manage your farm information and personal details
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Farm Information
            </CardTitle>
            <CardDescription>
              Update your farm details to get personalized recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="farm_location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Farm Location
                </Label>
                <Input
                  id="farm_location"
                  value={profile.farm_location}
                  onChange={(e) => setProfile({ ...profile, farm_location: e.target.value })}
                  placeholder="e.g., Nakuru, Kenya"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="farm_size" className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-muted-foreground" />
                  Farm Size
                </Label>
                <Input
                  id="farm_size"
                  value={profile.farm_size}
                  onChange={(e) => setProfile({ ...profile, farm_size: e.target.value })}
                  placeholder="e.g., 5 acres"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_info" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  Contact Information
                </Label>
                <Input
                  id="contact_info"
                  value={profile.contact_info}
                  onChange={(e) => setProfile({ ...profile, contact_info: e.target.value })}
                  placeholder="Phone number or email"
                />
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
