"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  Cpu,
  Download,
  GraduationCap,
  Image as ImageIcon,
  Library,
  MessageSquare,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  Square,
  Trash2,
  User,
  Volume2,
  VolumeX,
  Wand2,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { simpleAiApi, storiesApi, type AIStatus } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  autoTrained?: boolean;
  model?: string;
  persona?: string;
  trainingScope?: string;
  saved?: boolean;
  imageUrl?: string;
  timestamp?: string;
}

interface ImageAttachment {
  file: File;
  dataUrl: string;
  base64: string;
  type: string;
}

// Model Options
const AVAILABLE_MODELS = [
  {
    id: "gemini-1.5-flash",
    name: "Google Gemini 1.5 Flash",
    tag: "Fast & Multimodal",
    badge: "Recommended",
    desc: "বিদ্যুৎগতির দ্রুত ও গভীর বাংলা গল্প কথন। ছবি দেখেও নিখুঁত দৃশ্য বর্ণনা ও গল্প সৃষ্টি করতে সক্ষম।",
    icon: Zap,
    color: "text-amber-500",
  },
  {
    id: "gemini-1.5-pro",
    name: "Google Gemini 1.5 Pro",
    tag: "Deep Literary Novelist",
    badge: "Pro Quality",
    desc: "জটিল প্লট, বহু-অধ্যায় উপন্যাস ও গভীর চরিত্র বিশ্লেষণের জন্য বিশ্বমানের শক্তিশালী মডেল।",
    icon: Sparkles,
    color: "text-indigo-500",
  },
  {
    id: "taleforge-lora",
    name: "TaleForge LoRA Adapter",
    tag: "Personal Trained Voice",
    badge: "My Style",
    desc: "আপনার নিজস্ব আপলোড করা ও অটো-ট্রেইন্ড গল্পগুলোর অবিকল বাচনভঙ্গি ও শব্দচয়নকে প্রাধান্য দেয়।",
    icon: BookOpen,
    color: "text-emerald-500",
  },
  {
    id: "smart-engine",
    name: "TaleForge Smart Engine",
    tag: "Offline & Procedural",
    badge: "Offline",
    desc: "সম্পূর্ণ লোকাল ও অফলাইন এলগরিদমিক বাংলা সাহিত্য ইঞ্জিন। কোনো ক্লাউড বা কি-এর প্রয়োজন নেই।",
    icon: Cpu,
    color: "text-blue-500",
  },
];

// Persona / Author Style Options
const AVAILABLE_PERSONAS = [
  {
    id: "default",
    name: "স্বাভাবিক স্টাইল (Balanced)",
    desc: "উন্নত, প্রাঞ্জল ও গতিশীল সমকালীন বাংলা গদ্য।",
    emoji: "✍️",
  },
  {
    id: "humayun",
    name: "হুমায়ূন আহমেদ ধারা (Magic Realism)",
    desc: "সহজ-সরল বাক্যে অদ্ভুত চরিত্র, রাতজাগা জোছনা, বৃষ্টি ও গভীর অনুভূতি।",
    emoji: "🌧️",
  },
  {
    id: "mystery",
    name: "ফেলুদা / রহস্য ও গোয়েন্দা (Mystery)",
    desc: "তীক্ষ্ণ পর্যবেক্ষণ, টানটান সাসপেন্স ও রোমাঞ্চকর অনুসন্ধান।",
    emoji: "🔍",
  },
  {
    id: "romance",
    name: "কাব্যিক প্রেম ও মানবিক সম্পর্ক (Poetic Romance)",
    desc: "হৃদয়স্পর্শী আবেগ, নিঃশব্দ দীর্ঘশ্বাস ও গভীর ভালোবাসার গল্প।",
    emoji: "💖",
  },
  {
    id: "classic",
    name: "ক্লাসিক্যাল সাহিত্য (Rabindra / Sarat Classic)",
    desc: "ভাবগম্ভীর, মার্জিত ও গভীর আত্মবিশ্লেষণমূলক ধ্রুপদী সাহিত্যধারা।",
    emoji: "📜",
  },
];

// Training Scope Options (Default Master Stories vs Account Personal vs Hybrid)
const AVAILABLE_TRAINING_SCOPES = [
  {
    id: "hybrid",
    name: "হাইব্রিড শৈলী (ডিফল্ট + নিজস্ব)",
    shortName: "হাইব্রিড শৈলী",
    tag: "Recommended",
    badge: "Hybrid",
    desc: "ডিফল্ট মাস্টার সাহিত্য ভাণ্ডার এবং আপনার অ্যাকাউন্টের নিজস্ব ব্যক্তিগত গল্প—উভয়ের সেরা জ্ঞান একসাথে প্রয়োগ করবে।",
    icon: Sparkles,
    color: "text-amber-500",
  },
  {
    id: "personal",
    name: "শুধুমাত্র ব্যক্তিগত শৈলী (Account Only)",
    shortName: "ব্যক্তিগত শৈলী",
    tag: "Private",
    badge: "Personal",
    desc: "শুধুমাত্র আপনার অ্যাকাউন্টে আপলোড ও ট্রেইন করা গল্পগুলোর নিজস্ব বাচনভঙ্গি ও চরিত্রায়ন ব্যবহার করবে।",
    icon: User,
    color: "text-emerald-500",
  },
  {
    id: "default",
    name: "শুধুমাত্র ডিফল্ট সাহিত্য (Master Stories)",
    shortName: "ডিফল্ট সাহিত্য",
    tag: "Master Class",
    badge: "Default",
    desc: "হুমায়ূন আহমেদ, ফেলুদা রহস্য, বিভূতিভূষণ ও ক্লাসিক বাংলা সাহিত্যের ৬টি মাস্টার গল্পের কাঠামোর ওপর ভিত্তি করবে।",
    icon: BookOpen,
    color: "text-indigo-500",
  },
];

// Starter prompt suggestion cards
const STARTER_SUGGESTIONS = [
  {
    title: "বৃষ্টির রাতের একাকী ক্যাফে",
    desc: "ঝুম বৃষ্টির রাতে শহরের এক পুরনো ক্যাফেতে হঠাৎ এক অদ্ভুত ডায়েরি ও অচেনা মানুষের প্রবেশ...",
    prompt:
      "একটি ঝুম বৃষ্টির রাতের গল্প লিখুন। শহরের কোলাহলহীন এক পুরনো ক্যাফেতে একাকী বসে কফি খাচ্ছিল শুভ্র। হঠাৎ বন্ধ দরজায় এসে দাঁড়াল ভেজা শরীরে এক অচেনা তরুণী, হাতে একটি পুরনো চামড়ায় বাঁধানো ডায়রি।",
    icon: "🌧️",
    persona: "humayun",
  },
  {
    title: "কুয়াশাচ্ছন্ন পাহাড়ি রহস্য",
    desc: "দার্জিলিংয়ের এক প্রাচীন হেরিটেজ কটেজে ঘটে যাওয়া অমীমাংসিত এক অদ্ভুত চুরির অনুসন্ধান...",
    prompt:
      "দার্জিলিংয়ের কুয়াশাচ্ছন্ন ম্যাল রোডের ওপারে এক প্রাচীন কটেজে অমীমাংসিত একটি চুরির ঘটনা নিয়ে রহস্য গল্প লিখুন। ফেলুদা স্টাইলে তীক্ষ্ণ পর্যবেক্ষণ ও যুক্তির খেলায় সত্য উন্মোচন করুন।",
    icon: "🔍",
    persona: "mystery",
  },
  {
    title: "ছবি দেখে দৃশ্যপট রচনা (Vision)",
    desc: "আপনার ফোনের বা পিসির যে কোনো ছবি আপলোড করে সেই দৃশ্য নিয়ে সম্পূর্ণ মৌলিক বাংলা গল্প তৈরি করুন।",
    prompt: "এই ছবিটি খুব গভীরভাবে পর্যবেক্ষণ করে একটি জীবন্ত ও গভীর মানবিক অনুভূতির বাংলা গল্প রচনা করুন।",
    icon: "🎨",
    persona: "default",
    isAttachGuide: true,
  },
  {
    title: "আমার নিজস্ব ট্রেইন্ড স্টাইলে উপন্যাস",
    desc: "আমার পূর্বে আপলোড করা গল্পের শব্দভাণ্ডার, উপমা ও ভাষার ছাঁচে একটি সম্পূর্ণ নতুন কাহিনী...",
    prompt:
      "আমার পূর্বে ট্রেইন করানো গল্পের নিজস্ব শব্দচয়ন, বাক্য গঠন ও ছাঁচ নিখুঁতভাবে অনুকরণ করে মানুষের আত্মবিশ্বাস ও সম্পর্কের একটি সমৃদ্ধ গল্প রচনা করুন।",
    icon: "🧠",
    persona: "default",
    model: "taleforge-lora",
  },
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoTrain, setAutoTrain] = useState(true);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("gemini-1.5-flash");
  const [selectedPersona, setSelectedPersona] = useState<string>("default");
  const [selectedTrainingScope, setSelectedTrainingScope] = useState<string>("hybrid");

  // Dropdown states
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showPersonaDropdown, setShowPersonaDropdown] = useState(false);
  const [showTrainingScopeDropdown, setShowTrainingScopeDropdown] = useState(false);

  // Message action states
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedStoriesMap, setSavedStoriesMap] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Image attachment
  const [attachedImage, setAttachedImage] = useState<ImageAttachment | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const personaDropdownRef = useRef<HTMLDivElement>(null);
  const trainingScopeDropdownRef = useRef<HTMLDivElement>(null);

  // Load status and persisted preferences
  const refreshStatus = () => {
    simpleAiApi()
      .status()
      .then((data) => setAiStatus(data))
      .catch(() => {});
  };

  useEffect(() => {
    refreshStatus();
    if (typeof window !== "undefined") {
      const savedModel = localStorage.getItem("tf_preferred_model");
      if (savedModel) setSelectedModel(savedModel);
      const savedPersona = localStorage.getItem("tf_preferred_persona");
      if (savedPersona) setSelectedPersona(savedPersona);
      const savedScope = localStorage.getItem("tf_preferred_training_scope");
      if (savedScope) setSelectedTrainingScope(savedScope);
    }

    // Close dropdowns on outside click
    const handleClickOutside = (e: MouseEvent) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(e.target as Node)
      ) {
        setShowModelDropdown(false);
      }
      if (
        personaDropdownRef.current &&
        !personaDropdownRef.current.contains(e.target as Node)
      ) {
        setShowPersonaDropdown(false);
      }
      if (
        trainingScopeDropdownRef.current &&
        !trainingScopeDropdownRef.current.contains(e.target as Node)
      ) {
        setShowTrainingScopeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Adjust textarea height dynamically like ChatGPT/Claude
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputPrompt(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Keyboard send (Enter to send, Shift+Enter for newline)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    setShowModelDropdown(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("tf_preferred_model", modelId);
    }
  };

  const handleSelectPersona = (personaId: string) => {
    setSelectedPersona(personaId);
    setShowPersonaDropdown(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("tf_preferred_persona", personaId);
    }
  };

  const handleNewChat = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeakingId(null);
    setMessages([]);
    setInputPrompt("");
    setAttachedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setToastMsg("দয়া করে একটি সঠিক ইমেজ ফাইল (.jpg, .png, .webp) নির্বাচন করুন।");
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] || "";
      setAttachedImage({
        file,
        dataUrl,
        base64,
        type: file.type || "image/jpeg",
      });
    };
    reader.readAsDataURL(file);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleTriggerSuggestion = (item: (typeof STARTER_SUGGESTIONS)[number]) => {
    if (item.isAttachGuide) {
      imageInputRef.current?.click();
      return;
    }
    if (item.persona) setSelectedPersona(item.persona);
    if (item.model) setSelectedModel(item.model);
    sendPrompt(item.prompt, item.persona, item.model);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = inputPrompt.trim();
    if ((!prompt && !attachedImage) || loading) return;

    const userMsgText = prompt || "এই ছবিটি দেখে একটি জীবন্ত ও চমৎকার বাংলা গল্প রচনা করুন।";
    sendPrompt(userMsgText, selectedPersona, selectedModel, attachedImage);
    setInputPrompt("");
    setAttachedImage(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const sendPrompt = async (
    promptText: string,
    personaOverride?: string,
    modelOverride?: string,
    imageAttach?: ImageAttachment | null,
  ) => {
    const activePersona = personaOverride || selectedPersona;
    const activeModel = modelOverride || selectedModel;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: promptText,
      imageUrl: imageAttach?.dataUrl,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await simpleAiApi().chat(
        promptText,
        autoTrain,
        imageAttach?.base64,
        imageAttach?.type,
        activeModel,
        activePersona,
        selectedTrainingScope,
      );

      const aiMsg: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: "assistant",
        content: res.story,
        autoTrained: res.auto_trained,
        model: res.model,
        persona: activePersona,
        trainingScope: res.training_scope || selectedTrainingScope,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      refreshStatus();
    } catch (err: unknown) {
      const errDetail = err instanceof Error ? err.message : "গল্প তৈরিতে সমস্যা হয়েছে।";
      const errorMsg: ChatMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `দুঃখিত, গল্পটি তৈরিতে সাময়িক সমস্যা হয়েছে: ${errDetail}\n\n💡 পরামর্শ: সেটিংস পেজে গিয়ে আপনার বিনামূল্যে পাওয়া Google Gemini API Key যুক্ত রয়েছে কিনা তা যাচাই করে নিন।`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyStory = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSaveToStories = async (id: string, text: string) => {
    if (savingId === id || savedStoriesMap[id]) return;
    setSavingId(id);

    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    let title = "TaleForge Generated Story";
    let bodyText = text;

    for (const l of lines) {
      if (l.startsWith("#")) {
        title = l.replace(/^#+\s*/, "").trim();
        bodyText = lines.filter((line) => line !== l).join("\n\n");
        break;
      }
    }

    try {
      await storiesApi().create({
        title: title.slice(0, 100),
        content: bodyText || text,
        genre: "AI Generated",
        mood: "Literary",
      });

      setSavedStoriesMap((prev) => ({ ...prev, [id]: true }));
      setToastMsg(`'${title}' আপনার লাইব্রেরিতে সফলভাবে সংরক্ষিত হয়েছে!`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch {
      setToastMsg("গল্পটি লাইব্রেরিতে সংরক্ষণ করা সম্ভব হয়নি।");
      setTimeout(() => setToastMsg(null), 3000);
    } finally {
      setSavingId(null);
    }
  };

  const handleDownloadStory = (text: string) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    let title = "taleforge_story";
    for (const l of lines) {
      const clean = l.replace(/^[#*\-_\s]+/, "").trim();
      if (clean) {
        title = clean.replace(/[^a-z0-9\u0980-\u09FF_-]+/gi, "_").slice(0, 40);
        break;
      }
    }

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReadAloud = (storyText: string, messageId: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setToastMsg("আপনার ব্রাউজারে Text-to-Speech সুবিধা পাওয়া যায়নি।");
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }

    if (speakingId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();

    // Clean markdown headings/bullets for clean audio reading
    const cleanSpeech = storyText.replace(/[#*`_~>-]/g, "").trim();
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);

    const voices = window.speechSynthesis.getVoices();
    const bnVoice = voices.find((v) => v.lang.startsWith("bn")) || voices[0];
    if (bnVoice) utterance.voice = bnVoice;

    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingId(null);
    utterance.onerror = () => setSpeakingId(null);

    window.speechSynthesis.speak(utterance);
    setSpeakingId(messageId);
  };

  const handleSelectTrainingScope = (scopeId: string) => {
    setSelectedTrainingScope(scopeId);
    setShowTrainingScopeDropdown(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("tf_preferred_training_scope", scopeId);
    }
  };

  const currentModelInfo =
    AVAILABLE_MODELS.find((m) => m.id === selectedModel) || AVAILABLE_MODELS[0];
  const currentPersonaInfo =
    AVAILABLE_PERSONAS.find((p) => p.id === selectedPersona) || AVAILABLE_PERSONAS[0];
  const currentScopeInfo =
    AVAILABLE_TRAINING_SCOPES.find((s) => s.id === selectedTrainingScope) ||
    AVAILABLE_TRAINING_SCOPES[0];
  const ModelIcon = currentModelInfo.icon;
  const ScopeIcon = currentScopeInfo.icon;

  return (
    <div className="relative flex flex-col h-[calc(100dvh-125px)] sm:h-[calc(100vh-135px)] w-full max-w-5xl mx-auto overflow-hidden">
      {/* ─── Top Bar / Header: Model Selector & Actions ─── */}
      <header className="shrink-0 flex items-center justify-between pb-3 px-2 border-b border-border/60">
        <div className="flex items-center gap-2">
          {/* Model Selector Dropdown */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              type="button"
              onClick={() => setShowModelDropdown((prev) => !prev)}
              className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold text-[#1f1b2d] bg-white border border-border/80 shadow-xs hover:bg-stone-50 transition"
              title="Change AI Model"
            >
              <ModelIcon className={`h-4 w-4 ${currentModelInfo.color}`} />
              <span className="truncate max-w-[130px] sm:max-w-[200px]">
                {currentModelInfo.name}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>

            {showModelDropdown && (
              <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-white border border-border p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
                <p className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Select AI Generation Engine
                </p>
                <div className="space-y-1">
                  {AVAILABLE_MODELS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = m.id === selectedModel;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectModel(m.id)}
                        className={`w-full flex items-start gap-3 rounded-xl p-2.5 text-left transition ${
                          isSelected
                            ? "bg-indigo-50/80 text-primary"
                            : "hover:bg-stone-50 text-[#292524]"
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg bg-white shadow-xs mt-0.5 ${m.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold truncate">{m.name}</span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-full ${
                                isSelected
                                  ? "bg-primary text-white"
                                  : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {m.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                            {m.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Persona / Style Selector Dropdown */}
          <div className="relative" ref={personaDropdownRef}>
            <button
              type="button"
              onClick={() => setShowPersonaDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#44403c] bg-stone-100/80 hover:bg-stone-200/80 transition"
              title="Select Writing Persona / Literary Style"
            >
              <span>{currentPersonaInfo.emoji}</span>
              <span className="hidden md:inline truncate max-w-[140px]">
                {currentPersonaInfo.name.split(" ")[0]}
              </span>
              <ChevronDown className="h-3 w-3 text-stone-500" />
            </button>

            {showPersonaDropdown && (
              <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white border border-border p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
                <p className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Literary Persona / লেখক শৈলী
                </p>
                <div className="space-y-1">
                  {AVAILABLE_PERSONAS.map((p) => {
                    const isSelected = p.id === selectedPersona;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPersona(p.id)}
                        className={`w-full flex items-start gap-2.5 rounded-xl p-2 text-left transition ${
                          isSelected
                            ? "bg-indigo-50 text-primary"
                            : "hover:bg-stone-50 text-[#292524]"
                        }`}
                      >
                        <span className="text-base">{p.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold leading-snug">{p.name}</p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                            {p.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Training Scope Selector Dropdown */}
          <div className="relative" ref={trainingScopeDropdownRef}>
            <button
              type="button"
              onClick={() => setShowTrainingScopeDropdown((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#44403c] bg-stone-100/80 hover:bg-stone-200/80 transition"
              title="Select AI Training Scope (Personal vs Default Literature)"
            >
              <ScopeIcon className={`h-3.5 w-3.5 ${currentScopeInfo.color}`} />
              <span className="hidden md:inline truncate max-w-[130px]">
                {currentScopeInfo.shortName}
              </span>
              <ChevronDown className="h-3 w-3 text-stone-500" />
            </button>

            {showTrainingScopeDropdown && (
              <div className="absolute left-0 top-full mt-2 w-72 rounded-2xl bg-white border border-border p-2 shadow-xl z-50 animate-in fade-in-50 zoom-in-95">
                <p className="px-3 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Knowledge Scope / প্রশিক্ষণ জ্ঞান পরিসীমা
                </p>
                <div className="space-y-1">
                  {AVAILABLE_TRAINING_SCOPES.map((s) => {
                    const SIcon = s.icon;
                    const isSelected = s.id === selectedTrainingScope;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectTrainingScope(s.id)}
                        className={`w-full flex items-start gap-2.5 rounded-xl p-2 text-left transition ${
                          isSelected
                            ? "bg-amber-50/80 text-amber-950 font-medium"
                            : "hover:bg-stone-50 text-[#292524]"
                        }`}
                      >
                        <div className={`p-1 rounded-lg bg-white shadow-2xs mt-0.5 ${s.color}`}>
                          <SIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-bold leading-snug">{s.name}</p>
                            <span
                              className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                                isSelected
                                  ? "bg-amber-600 text-white"
                                  : "bg-stone-100 text-stone-600"
                              }`}
                            >
                              {s.badge}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                            {s.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Header: New Chat & Library Links */}
        <div className="flex items-center gap-2">
          {aiStatus && (
            <Link
              href="/train"
              className="hidden lg:flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 transition"
              title="View personal and default training stories"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>
                {aiStatus.personal_trained_stories ?? 0} নিজস্ব / {aiStatus.default_stories_count ?? 6} ডিফল্ট
              </span>
            </Link>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 rounded-xl text-xs font-semibold hover:bg-stone-100 text-[#44403c]"
            title="Start a new clean story canvas"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Story</span>
          </Button>

          <Link
            href="/stories"
            className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold bg-white border border-border/70 hover:bg-stone-50 text-[#292524] transition shadow-2xs"
            title="Open Saved Stories Library"
          >
            <Library className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Library</span>
          </Link>
        </div>
      </header>

      {/* ─── Toast Feedback Notification ─── */}
      {toastMsg && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 rounded-xl bg-stone-900/90 backdrop-blur-md px-4 py-2 text-xs font-medium text-white shadow-xl animate-in fade-in-50 slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ─── Center Body: Either Empty Hero State or Conversation Stream ─── */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-6">
        {messages.length === 0 ? (
          /* ─── ChatGPT / Claude Style Welcome Empty State ─── */
          <div className="flex flex-col items-center justify-center min-h-[70%] text-center max-w-2xl mx-auto py-8">
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg mb-4">
              <Sparkles className="h-7 w-7" />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
                <Zap className="h-2.5 w-2.5 text-white" />
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1f1b2d]">
              What tale shall we craft today?
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-md">
              আজ আপনি কী গল্প সৃষ্টি করতে চান? নিচে আপনার চিন্তা লিখুন, ছবি আপলোড করুন, বা যেকোনো একটি আইডিয়া নির্বাচন করুন।
            </p>

            {/* Quick Starter Suggestion Cards */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
              {STARTER_SUGGESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleTriggerSuggestion(item)}
                  className="group relative rounded-2xl border border-border/80 bg-white/80 hover:bg-white p-4 text-left transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{item.icon}</span>
                    <h3 className="text-xs font-bold text-[#1f1b2d] group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ─── Active Message Stream ─── */
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((m) => {
              const isUser = m.role === "user";
              const isSaved = savedStoriesMap[m.id];
              const isSaving = savingId === m.id;
              const isSpeaking = speakingId === m.id;

              // Word count & read time
              const wordCount = m.content.trim().split(/\s+/).filter(Boolean).length;
              const readMinutes = Math.max(1, Math.ceil(wordCount / 180));

              return (
                <div
                  key={m.id}
                  className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}
                >
                  {!isUser && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm mt-0.5">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[82%] rounded-3xl px-5 py-4 ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm"
                        : "bg-white border border-border/70 text-[#292524] rounded-tl-sm shadow-xs"
                    }`}
                  >
                    {/* Model & Persona Attribution (Assistant only) */}
                    {!isUser && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-border/50 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-primary">TaleForge</span>
                          {m.model && (
                            <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-700">
                              {m.model}
                            </span>
                          )}
                          {m.trainingScope && (
                            <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-medium text-stone-600 flex items-center gap-1">
                              {m.trainingScope === "personal" ? (
                                <>
                                  <User className="h-2.5 w-2.5 text-emerald-600" />
                                  <span>ব্যক্তিগত AI</span>
                                </>
                              ) : m.trainingScope === "default" ? (
                                <>
                                  <BookOpen className="h-2.5 w-2.5 text-indigo-600" />
                                  <span>ডিফল্ট সাহিত্য</span>
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                                  <span>হাইব্রিড মোড</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-stone-400">
                            {wordCount} শব্দ • {readMinutes} মিনিট পড়া
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Attached Image Preview (User message) */}
                    {isUser && m.imageUrl && (
                      <div className="mb-3 overflow-hidden rounded-2xl border border-white/20">
                        <img
                          src={m.imageUrl}
                          alt="Uploaded input"
                          className="max-h-60 w-auto rounded-2xl object-cover"
                        />
                      </div>
                    )}

                    {/* Story / Prompt Body */}
                    <div className="prose prose-stone max-w-none text-sm sm:text-base leading-relaxed break-words whitespace-pre-wrap">
                      {m.content}
                    </div>

                    {/* Assistant Action Bar (Copy, Save, TTS, Download, Regenerate) */}
                    {!isUser && (
                      <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {/* Copy */}
                          <button
                            type="button"
                            onClick={() => handleCopyStory(m.id, m.content)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
                            title="Copy story"
                          >
                            {copiedId === m.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          {/* Save to Stories Library */}
                          <button
                            type="button"
                            onClick={() => handleSaveToStories(m.id, m.content)}
                            disabled={isSaving || isSaved}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                              isSaved
                                ? "text-emerald-700 bg-emerald-50"
                                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                            }`}
                            title="Save story to personal library"
                          >
                            {isSaving ? (
                              <>
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                <span>Saving…</span>
                              </>
                            ) : isSaved ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Saved in Library</span>
                              </>
                            ) : (
                              <>
                                <BookOpen className="h-3.5 w-3.5 text-primary" />
                                <span>Save</span>
                              </>
                            )}
                          </button>

                          {/* Read Aloud (Browser TTS) */}
                          <button
                            type="button"
                            onClick={() => handleReadAloud(m.content, m.id)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                              isSpeaking
                                ? "bg-amber-50 text-amber-700 animate-pulse"
                                : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                            }`}
                            title={isSpeaking ? "Stop speech" : "Read story aloud"}
                          >
                            {isSpeaking ? (
                              <>
                                <VolumeX className="h-3.5 w-3.5 text-amber-600" />
                                <span>Stop Audio</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="h-3.5 w-3.5" />
                                <span>Read Aloud</span>
                              </>
                            )}
                          </button>

                          {/* Download as TXT */}
                          <button
                            type="button"
                            onClick={() => handleDownloadStory(m.content)}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition"
                            title="Download story as .txt file"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>Download</span>
                          </button>
                        </div>

                        {/* Regenerate story */}
                        <button
                          type="button"
                          onClick={() => {
                            const lastUserMsg = [...messages]
                              .reverse()
                              .find((msg) => msg.role === "user");
                            if (lastUserMsg) {
                              sendPrompt(lastUserMsg.content);
                            }
                          }}
                          disabled={loading}
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition"
                          title="Generate a fresh variation"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Regenerate</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-stone-200 text-stone-700 shadow-sm mt-0.5">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Typing / Generating Animation */}
            {loading && (
              <div className="flex gap-3.5 justify-start max-w-3xl mx-auto animate-in fade-in-50">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-sm">
                  <Sparkles className="h-4 w-4 animate-spin" />
                </div>
                <div className="rounded-3xl rounded-tl-sm border border-border/70 bg-white px-5 py-4 shadow-xs">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                    <span className="font-medium text-[#292524]">
                      {attachedImage
                        ? "AI ছবিটি বিশ্লেষণ করে চমৎকার বাংলা গল্প রচনা করছে..."
                        : `${currentModelInfo.name} আপনার নিজস্ব স্টাইলে গল্পটি বুনছে...`}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─── Bottom Floating Capsule Input (ChatGPT / Claude Style) ─── */}
      <div className="shrink-0 pb-3 pt-1 px-2 sm:px-4">
        <div className="max-w-3xl mx-auto">
          {/* Image Attachment Preview Badge */}
          {attachedImage && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-2xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs text-primary shadow-xs animate-in fade-in-50">
              <img
                src={attachedImage.dataUrl}
                alt="Attached preview"
                className="h-8 w-8 rounded-xl object-cover border border-indigo-300"
              />
              <span className="font-semibold truncate max-w-[200px]">
                {attachedImage.file.name}
              </span>
              <button
                type="button"
                onClick={() => setAttachedImage(null)}
                className="p-1 rounded-full text-stone-500 hover:text-red-600 hover:bg-stone-200/60 transition"
                title="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Floating Rounded Input Pill */}
          <div className="relative rounded-3xl border border-stone-300/80 bg-white shadow-md focus-within:border-primary/70 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputPrompt}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={
                attachedImage
                  ? "ছবিটি নিয়ে কিছু বলতে চাইলে লিখুন (বা সরাসরি Send চাপুন)..."
                  : "কী গল্প সৃষ্টি করতে চান লিখুন... (Enter চাপলে সেন্ড, Shift+Enter নতুন লাইন)"
              }
              className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm sm:text-base text-[#1f1b2d] placeholder:text-stone-400 focus:outline-none max-h-44"
              disabled={loading}
            />

            {/* Inside Input Action Bar (Attachment, Auto-Train Toggle, Send Button) */}
            <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
              <div className="flex items-center gap-2">
                {/* Hidden Image Input */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                {/* Attach Image Button */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-stone-500 hover:text-primary hover:bg-stone-100 transition"
                  title="ছবি আপলোড করে গল্প লিখুন (Attach Image for Storytelling)"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>

                {/* Auto-Retrain Toggle Pill */}
                <button
                  type="button"
                  onClick={() => setAutoTrain((prev) => !prev)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    autoTrain
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  }`}
                  title="TaleForge learns and memorizes newly created stories automatically"
                >
                  <Zap className={`h-3 w-3 ${autoTrain ? "text-amber-500 fill-amber-500" : ""}`} />
                  <span>{autoTrain ? "Auto-Train On" : "Auto-Train Off"}</span>
                </button>

                {/* Quick Persona Badge */}
                <span className="hidden sm:inline-flex text-[11px] text-muted-foreground">
                  {currentPersonaInfo.emoji} {currentPersonaInfo.name.split(" ")[0]}
                </span>
              </div>

              {/* Circular Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={loading || (!inputPrompt.trim() && !attachedImage)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                title="Send Prompt (Enter)"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 ml-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* Minimalist Bottom Disclaimer */}
          <p className="text-center text-[10px] text-muted-foreground mt-1.5">
            TaleForge learns from your stories and generates original tales. Check important plot and creative details.
          </p>
        </div>
      </div>
    </div>
  );
}
