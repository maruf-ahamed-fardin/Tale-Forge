"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  HardDrive,
  Key,
  LogOut,
  Moon,
  Palette,
  RefreshCw,
  Save,
  Sliders,
  Sparkles,
  Sun,
  User,
} from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { authApi, type UserOut } from "@/lib/api";
import { getStoredUser, logout } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState<UserOut | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Creative Preferences
  const [defaultGenre, setDefaultGenre] = useState("Drama");
  const [defaultLength, setDefaultLength] = useState("Medium");
  const [temperature, setTemperature] = useState(0.8);
  const [savedMsg, setSavedMsg] = useState("");

  // Live AI Model & API Key
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("taleforge-lora");
  const [keySavedMsg, setKeySavedMsg] = useState("");

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
        if (parsed.defaultGenre) setDefaultGenre(parsed.defaultGenre);
        if (parsed.defaultLength) setDefaultLength(parsed.defaultLength);
        if (parsed.temperature) setTemperature(parsed.temperature);
      } catch {
        // ignore
      }
    }

    // Load AI Model & Gemini API Key
    const savedKey = localStorage.getItem("tf_gemini_api_key");
    if (savedKey) setGeminiApiKey(savedKey);
    // Same key the chat page reads, so the choice made here is the one used in chat
    const savedModel = localStorage.getItem("tf_preferred_model");
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const prefs = {
      defaultLanguage: language,
      defaultGenre,
      defaultLength,
      temperature,
    };
    localStorage.setItem("tf_preferences", JSON.stringify(prefs));
    setSavedMsg(t("settings.preferencesSaved", undefined, "Preferences updated successfully!"));
    setTimeout(() => setSavedMsg(""), 3500);
  };

  const handleSaveAIConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("tf_gemini_api_key", geminiApiKey.trim());
    localStorage.setItem("tf_preferred_model", selectedModel);
    setKeySavedMsg(t("settings.aiConfigSaved", undefined, "AI settings saved!"));
    setTimeout(() => setKeySavedMsg(""), 4000);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <section className="space-y-4 sm:space-y-6">
      <PageHeader
        eyebrow={t("nav.settings", undefined, "Settings")}
        title={t("settings.title", undefined, "Workspace Settings")}
        description={t(
          "settings.subtitle",
          undefined,
          "Manage your display language, theme mode, generation preferences, and local data controls."
        )}
      />

      {savedMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{savedMsg}</span>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
        {/* Main Settings Form */}
        <div className="space-y-4 sm:space-y-6">
          {/* Appearance & Language Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary shrink-0" />
                <CardTitle>
                  {t("settings.uiPreferencesTitle", undefined, "Appearance & Language")}
                </CardTitle>
              </div>
              <CardDescription>
                {t(
                  "settings.uiPreferencesDesc",
                  undefined,
                  "Customize your interface language and night/light theme."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-5">
              {/* Language Selection */}
              <div>
                <label className="text-sm font-semibold text-foreground">
                  {t("settings.selectLanguage", undefined, "Website Language / ভাষা")}
                </label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold transition-all",
                      language === "en"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-surface text-foreground hover:bg-surface-hover"
                    )}
                  >
                    <span>🇬🇧</span>
                    <span>English (Default)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("bn")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold transition-all",
                      language === "bn"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-surface text-foreground hover:bg-surface-hover"
                    )}
                  >
                    <span>🇧🇩</span>
                    <span>বাংলা (Bangla)</span>
                  </button>
                </div>
              </div>

              {/* Theme Mode Selection */}
              <div className="border-t border-border pt-3.5 sm:pt-4">
                <label className="text-sm font-semibold text-foreground">
                  {t("settings.selectTheme", undefined, "Color Theme / মোড")}
                </label>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold transition-all",
                      theme === "light"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-surface text-foreground hover:bg-surface-hover"
                    )}
                  >
                    <Sun className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>{t("settings.themeLight", undefined, "Light Mode (লাইট মোড)")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold transition-all",
                      theme === "dark"
                        ? "border-primary bg-primary/10 text-primary shadow-xs"
                        : "border-border bg-surface text-foreground hover:bg-surface-hover"
                    )}
                  >
                    <Moon className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span>{t("settings.themeNight", undefined, "Night Mode (নাইট মোড)")}</span>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>{t("settings.profileCardTitle", undefined, "Account Profile")}</CardTitle>
              </div>
              <CardDescription>
                {t(
                  "settings.profileCardDesc",
                  undefined,
                  "Personal credentials and workspace identity."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUser ? (
                <div className="flex min-h-24 items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : currentUser ? (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold uppercase">
                        {t("settings.displayName", undefined, "Display Name")}
                      </span>
                      <p className="mt-1 font-medium text-foreground">
                        {currentUser.display_name || "Tale Author"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold uppercase">
                        {t("settings.emailAddress", undefined, "Email Address")}
                      </span>
                      <p className="mt-1 font-medium text-foreground break-all">{currentUser.email}</p>
                    </div>
                  </div>
                  <div className="border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground font-semibold uppercase">
                      {t("settings.accountId", undefined, "Account ID")}
                    </span>
                    <p className="mt-1 font-mono text-xs text-muted-foreground break-all">
                      {currentUser.id}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("settings.guestMode", undefined, "Signed in as guest or offline mode.")}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Creative & Generation Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="h-5 w-5 text-primary" />
                <CardTitle>
                  {t("settings.generationDefaultsTitle", undefined, "Generation Defaults")}
                </CardTitle>
              </div>
              <CardDescription>
                {t(
                  "settings.generationDefaultsDesc",
                  undefined,
                  "Customize initial parameters for story creation in the Studio."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePreferences} className="space-y-5">
                <div>
                  <label className="text-sm font-semibold text-foreground">
                    {t("settings.defaultGenre", undefined, "Default Genre")}
                  </label>
                  <select
                    value={defaultGenre}
                    onChange={(e) => setDefaultGenre(e.target.value)}
                    className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                  >
                    {["Drama", "Romance", "Mystery", "Horror", "Thriller", "Fantasy"].map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1">
                    <label className="text-sm font-semibold text-foreground">
                      {t("settings.temperatureLabel", { val: temperature }, `Creativity & Temperature: ${temperature}`)}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {temperature <= 0.5
                        ? t("settings.predictable", undefined, "Predictable & Structured")
                        : temperature >= 1.0
                        ? t("settings.wild", undefined, "Creative & Wild")
                        : t("settings.balanced", undefined, "Balanced")}
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

                <Button type="submit" className="w-full sm:w-auto">
                  <Save className="h-4 w-4 mr-1.5" />
                  {t("settings.savePreferences", undefined, "Save Preferences")}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Live AI Model & API Key Configuration */}
          <Card className="border-primary/40 bg-gradient-to-br from-surface to-primary/5">
            <CardHeader>
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles className="h-4.5 w-4.5 text-primary shrink-0" />
                  <CardTitle className="text-sm sm:text-base truncate">
                    {t("settings.liveAiTitle", undefined, "Live AI Model & API Configuration")}
                  </CardTitle>
                </div>
                {geminiApiKey ? (
                  <Badge variant="green" className="self-start xs:self-auto shrink-0">
                    {t("settings.liveAiConnected", undefined, "Live AI Connected")}
                  </Badge>
                ) : (
                  <Badge variant="warm" className="self-start xs:self-auto shrink-0">
                    {t("settings.offlineEngineBadge", undefined, "Offline Smart Engine")}
                  </Badge>
                )}
              </div>
              <CardDescription>
                {t(
                  "settings.liveAiDesc",
                  undefined,
                  "Choose your AI generation engine and optionally add a free Google Gemini API Key."
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {keySavedMsg && (
                <div className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3 text-sm text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{keySavedMsg}</span>
                </div>
              )}

              <form onSubmit={handleSaveAIConfig} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground">
                    {t("settings.modelSelectLabel", undefined, "AI Generation Model")}
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs sm:text-sm text-foreground outline-none focus:border-primary truncate"
                  >
                    <option value="taleforge-lora">
                      TaleForge LoRA Adapter (Your Trained Model)
                    </option>
                    <option value="gemini-1.5-flash">
                      Google Gemini 1.5 Flash (Cloud AI - Fast)
                    </option>
                    <option value="gemini-1.5-pro">
                      Google Gemini 1.5 Pro (Cloud AI - Deep)
                    </option>
                    <option value="smart-engine">
                      TaleForge Smart Engine (Offline, no AI)
                    </option>
                  </select>
                  <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    {selectedModel === "taleforge-lora" && "Your own model, trained on your stories. No cloud API needed."}
                    {selectedModel === "gemini-1.5-flash" && "Ultra-fast live storytelling in Bangla & English (needs an API key)"}
                    {selectedModel === "gemini-1.5-pro" && "Deep literary quality for long plots (needs an API key)"}
                    {selectedModel === "smart-engine" && "Offline template engine (no API key or network required)"}
                  </p>
                </div>

                <div>
                  <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                      <Key className="h-4 w-4 text-primary shrink-0" />
                      {t("settings.geminiKeyLabel", undefined, "Google Gemini API Key")}
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline font-medium self-start xs:self-auto"
                    >
                      {t("settings.getFreeKey", undefined, "Get Free Key (Google AI Studio) →")}
                    </a>
                  </div>
                  <div className="relative mt-1.5">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="pr-10 font-mono text-xs sm:text-sm rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                    💡 {t(
                      "settings.geminiKeyHint",
                      undefined,
                      "Adding a free Gemini API key enables ultra-fast, live literary storytelling in Bangla and English matching your trained style."
                    )}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <Button type="submit" className="w-full sm:w-auto">
                    <Save className="h-4 w-4 mr-1.5" />
                    {t("settings.saveAiConfig", undefined, "Save Live AI Settings")}
                  </Button>
                  {geminiApiKey && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setGeminiApiKey("");
                        localStorage.removeItem("tf_gemini_api_key");
                        setKeySavedMsg(t("settings.clearKey", undefined, "Key removed."));
                        setTimeout(() => setKeySavedMsg(""), 3500);
                      }}
                    >
                      {t("settings.clearKey", undefined, "Clear Key")}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions & Privacy */}
        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary shrink-0" />
                <CardTitle>
                  {t("settings.storageCardTitle", undefined, "Storage & Session")}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t(
                  "settings.storageCardDesc",
                  undefined,
                  "Source story documents and models are kept isolated on your local server."
                )}
              </p>

              <div className="border-t border-border pt-4 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-xs sm:text-sm py-2.5 rounded-xl"
                  onClick={() => {
                    localStorage.removeItem("tf_preferences");
                    setSavedMsg(t("settings.preferencesSaved", undefined, "Preferences reset to defaults."));
                    setTimeout(() => setSavedMsg(""), 3000);
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-2 shrink-0" />
                  <span className="truncate">{t("settings.resetPreferences", undefined, "Reset Preferences to Defaults")}</span>
                </Button>

                <Button
                  variant="destructive"
                  className="w-full justify-start text-xs sm:text-sm py-2.5 rounded-xl"
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5 mr-2 shrink-0" />
                  <span className="truncate">{t("settings.signOut", undefined, "Sign Out of TaleForge")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
