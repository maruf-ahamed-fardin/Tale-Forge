import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Database, LockKeyhole, PenLine, Sparkles, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

const features = [
  {
    title: "Personal style memory",
    description: "A fine-tuned adapter is planned to learn patterns from your private Bangla stories.",
    icon: Wand2,
  },
  {
    title: "Story-first workspace",
    description: "Create, edit, continue, save, export, and evaluate stories from one focused interface.",
    icon: PenLine,
  },
  {
    title: "Private dataset flow",
    description: "Source files move through raw, extracted, cleaned, tagged, and training-ready stages.",
    icon: Database,
  },
];

const steps = ["Upload your writing", "Validate Bangla text", "Build a dataset", "Train an adapter", "Generate new stories"];

const genres = [
  "Romance",
  "Horror",
  "Thriller",
  "Mystery",
  "Fantasy",
  "Science Fiction",
  "Drama",
  "Psychological",
  "Adventure",
  "Historical",
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-extrabold text-[#1f1b2d]">TaleForge</span>
          </Link>
          <nav className="hidden items-center gap-2 sm:flex" aria-label="Landing navigation">
            <Link className={buttonVariants({ variant: "ghost", size: "sm" })} href="/login">
              Log in
            </Link>
            <Link className={buttonVariants({ size: "sm" })} href="/dashboard">
              Open App
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative flex min-h-[86svh] items-center overflow-hidden px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <Image
          src="/images/taleforge-studio-preview.png"
          alt="TaleForge writing studio preview"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(251,250,247,0.97)_0%,rgba(251,250,247,0.9)_45%,rgba(251,250,247,0.66)_100%)]" />

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <Badge variant="primary">Personal AI storytelling</Badge>
          <h1 className="mt-6 max-w-3xl text-5xl font-extrabold leading-[1.05] text-[#1f1b2d] sm:text-7xl">
            <span className="block">Your Voice.</span>
            <span className="block">New Stories.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#57534e] sm:text-xl">
            A personal storytelling AI trained on your writing style, designed for private Bangla datasets,
            original generation, and a calm writing workflow.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/studio" className={buttonVariants({ size: "lg" })}>
              Start Writing
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/stories" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Explore Stories
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-3 lg:px-8">
          {features.map((feature) => (
            <div key={feature.title} className="flex gap-4 rounded-lg border border-border bg-white p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-primary">
                <feature.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-semibold text-[#292524]">{feature.title}</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <Badge variant="warm">How it works</Badge>
          <h2 className="mt-4 text-3xl font-extrabold text-[#1f1b2d]">From private stories to a reusable style adapter.</h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            TaleForge is designed around fine-tuning an existing open model with LoRA or QLoRA. The target is
            style approximation, not copying your source stories.
          </p>
        </div>
        <ol className="grid gap-3">
          {steps.map((step, index) => (
            <li key={step} className="flex items-center gap-4 rounded-lg border border-border bg-white p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f4f1ec] text-sm font-bold text-[#292524]">
                {index + 1}
              </span>
              <span className="font-semibold text-[#292524]">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#f4f1ec]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <BookOpen className="h-8 w-8 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-extrabold text-[#1f1b2d]">Genres stay flexible.</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              The studio is planned around genre, theme, mood, characters, setting, length, and generation
              controls, so simple prompts and advanced control can live together.
            </p>
          </div>
          <div className="flex flex-wrap content-start gap-2">
            {genres.map((genre) => (
              <Badge key={genre} variant="neutral">
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 rounded-lg border border-border bg-white p-6 md:grid-cols-[auto_1fr_auto] md:items-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f0fdf4] text-[#166534]">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-[#1f1b2d]">Private by default.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The default architecture keeps your stories in your own backend and local storage. External AI
              providers can be added later only as explicit configuration.
            </p>
          </div>
          <Link href="/dataset" className={buttonVariants({ variant: "outline" })}>
            Dataset Center
          </Link>
        </div>
      </section>
    </main>
  );
}
