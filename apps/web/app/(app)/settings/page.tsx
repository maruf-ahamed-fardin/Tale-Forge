"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  HardDrive,
  Lock,
  LogOut,
  RefreshCw,
  Save,
  Settings,
  Sliders,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authApi, type UserOut } from "@/lib/api";
import { getStoredUser, logout } from "@/lib/auth";

export default function SettingsPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Preferences
  const [defaultLanguage, setDefaultLanguage] = useState("bn");
  const [defaultGenre, setDefaultGenre] = useState("Drama");
  const [defaultLength, setDefaultLength] = useState("Medium");
  const [temperature, setTemperature] = useState(0.8);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    // Load user profile
    const cached = getStoredUser();
    if (cached) setCurrentUser(cached as UserOut);

    authApi()
      .me()
      .then((u) => setCurrentUser(u))
      .catch(() => {})
      .finally(() => setLoadingUser(false));

    // Load saved preferences
    const saved = localStorage.getItem("tf_preferences");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.defaultLanguage) setDefaultLanguage(parsed.defaultLanguage);
        if (parsed.defaultGenre) setDefaultGenre(parsed.defaultGenre);
        if (parsed.defaultLength) setDefaultLength(parsed.defaultLength);
        if (parsed.temperature) setTemperature(parsed.temperature);
      } catch {
        // ignore
      }
    }
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const prefs = {
      defaultLanguage,
      defaultGenre,
      defaultLength,
      temperature,
    };
    localStorage.setItem("tf_preferences", JSON.stringify(prefs));
    setSavedMsg("Preferences updated successfully!");
    setTimeout(() => setSavedMsg(""), 3500);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Workspace Settings"
        description="Manage your account profile, generation preferences, and local data controls."
      />

      {savedMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Main Settings Form */}
        <div className="space-y-6">
          {/* Account Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>Account Profile</CardTitle>
              </div>
              <CardDescription>
                Personal credentials and workspace identity.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUser ? (
                <div className="flex min-h-24 items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : currentUser ? (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold uppercase">
                        Display Name
                      </span>
                      <p className="mt-1 font-medium text-[#292524]">
                        {currentUser.display_name || "Tale Author"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold uppercase">
                        Email Address
                      </span>
                      <p className="mt-1 font-medium text-[#292524]">{currentUser.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground font-semibold uppercase">
                      Account ID
                    </span>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {currentUser.id}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Signed in as guest or offline mode.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Creative & Generation Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                <CardTitle>Generation Defaults</CardTitle>
              </div>
              <CardDescription>
                Customize initial parameters for story creation in the Studio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePreferences} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-[#292524]">
                    Default Language / ভাষা
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDefaultLanguage("bn")}
                      className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${
                        defaultLanguage === "bn"
                          ? "border-primary bg-[#eef2ff] text-primary"
                          : "border-border bg-white text-[#44403c] hover:bg-[#f7f4ef]"
                      }`}
                    >
                      বাংলা (Bangla)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDefaultLanguage("en")}
                      className={`rounded-lg border px-3 py-2 text-center text-sm font-semibold transition ${
                        defaultLanguage === "en"
                          ? "border-primary bg-[#eef2ff] text-primary"
                          : "border-border bg-white text-[#44403c] hover:bg-[#f7f4ef]"
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-[#292524]">Default Genre</label>
                  <select
                    value={defaultGenre}
                    onChange={(e) => setDefaultGenre(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-[#292524] outline-none focus:border-primary"
                  >
                    {["Drama", "Romance", "Mystery", "Horror", "Thriller", "Fantasy"].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-[#292524]">
                      Creativity & Temperature: {temperature}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {temperature <= 0.5 ? "Predictable" : temperature >= 1.0 ? "Creative & Wild" : "Balanced"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.4"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="mt-2 w-full accent-primary"
                  />
                </div>

                <Button type="submit">
                  <Save className="h-4 w-4 mr-1.5" />
                  Save Preferences
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions & Privacy */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                <CardTitle>Storage & Session</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Source story documents and models are kept isolated on your local server.
              </p>

              <div className="border-t border-border pt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs"
                  onClick={() => {
                    localStorage.removeItem("tf_preferences");
                    setSavedMsg("Reset preferences to defaults.");
                    setTimeout(() => setSavedMsg(""), 3000);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2" />
                  Reset Preferences
                </Button>

                <Button
                  variant="destructive"
                  className="w-full justify-start text-xs"
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Sign Out of TaleForge
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
