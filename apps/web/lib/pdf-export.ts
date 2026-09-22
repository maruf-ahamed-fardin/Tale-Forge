/**
 * TaleForge High-Fidelity Bengali PDF & Printable Document Generator.
 * Uses browser print engine with Google Fonts (Noto Serif Bengali & Outfit)
 * ensuring 100% vector clarity, zero broken conjuncts (যুক্তাক্ষর), and clean page breaks.
 */

export interface ExportStoryOptions {
  title: string;
  content: string;
  author?: string;
  genre?: string;
  wordCount?: number;
  date?: string;
}

export function exportStoryAsPdf(options: ExportStoryOptions): void {
  const { title, content, author = "TaleForge Author", genre = "বাংলা সাহিত্য", wordCount, date } = options;
  const formattedDate =
    date ||
    new Date().toLocaleDateString("bn-BD", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  const count = wordCount || content.trim().split(/\s+/).filter(Boolean).length;

  const paragraphs = content
    .replace(/^#\s+[^\n]+\n+/, "") // remove markdown header if present
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("অনুগ্রহ করে ব্রাউজারে পপ-আপ (Pop-ups) অনুমতি দিন যাতে PDF তৈরি করা যায়।");
    return;
  }

  const cleanTitle = title.replace(/^#\s*/, "").trim() || "গল্প";

  const html = `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(cleanTitle)} - TaleForge</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Bengali:wght@400;600;700;800&family=Outfit:wght@600;800&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 22mm 18mm 22mm 18mm;
      @bottom-center {
        content: counter(page);
        font-family: 'Outfit', sans-serif;
        font-size: 9pt;
        color: #64748b;
      }
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      color: #0f172a;
      background-color: #ffffff;
      font-family: 'Noto Serif Bengali', serif;
      font-size: 11.5pt;
      line-height: 1.85;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    .header-rule {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1.5pt solid #e2e8f0;
      padding-bottom: 6pt;
      margin-bottom: 24pt;
    }
    .brand-mark {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 11pt;
      letter-spacing: 0.5px;
      color: #4f46e5;
    }
    .brand-sub {
      font-size: 8.5pt;
      color: #64748b;
    }
    .title-section {
      text-align: center;
      margin-bottom: 24pt;
      padding-bottom: 16pt;
      border-bottom: 1px dashed #cbd5e1;
    }
    h1.story-title {
      font-family: 'Noto Serif Bengali', serif;
      font-weight: 800;
      font-size: 24pt;
      line-height: 1.35;
      margin: 0 0 10pt 0;
      color: #0f172a;
    }
    .metadata-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12pt;
      font-size: 9.5pt;
      color: #64748b;
    }
    .metadata-pill {
      display: inline-block;
      padding: 2pt 8pt;
      border-radius: 999px;
      background: #f1f5f9;
      font-weight: 600;
      color: #4338ca;
    }
    .ornament {
      text-align: center;
      color: #94a3b8;
      font-size: 14pt;
      margin: 20pt 0;
      letter-spacing: 6pt;
    }
    .story-body p {
      margin: 0 0 14pt 0;
      text-align: justify;
      text-justify: inter-word;
      text-indent: 18pt;
    }
    .story-body p:first-of-type {
      text-indent: 0;
    }
    .story-body p:first-of-type::first-letter {
      font-size: 26pt;
      float: left;
      line-height: 0.9;
      margin-right: 6pt;
      color: #4f46e5;
      font-weight: 700;
    }
    .footer-colophon {
      margin-top: 36pt;
      padding-top: 14pt;
      border-top: 1pt solid #e2e8f0;
      text-align: center;
      font-size: 8.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="header-rule">
    <span class="brand-mark">TaleForge</span>
    <span class="brand-sub">Personal AI Literature & Storytelling Platform</span>
  </div>

  <div class="title-section">
    <h1 class="story-title">${escapeHtml(cleanTitle)}</h1>
    <div class="metadata-row">
      <span class="metadata-pill">${escapeHtml(genre)}</span>
      <span>${count} শব্দ (Words)</span>
      <span>•</span>
      <span>${escapeHtml(formattedDate)}</span>
      <span>•</span>
      <span>${escapeHtml(author)}</span>
    </div>
  </div>

  <div class="story-body">
    ${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("\n    ")}
  </div>

  <div class="ornament">❦  ❦  ❦</div>

  <div class="footer-colophon">
    রচিত ও সংকলিত: টেলফোর্জ (TaleForge) এআই সাহিত্য স্টুডিও • সর্বস্বত্ব সংরক্ষিত
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

export function exportStoryAsTxt(title: string, content: string): void {
  const cleanTitle = title.replace(/^#\s*/, "").trim() || "story";
  const blob = new Blob([`${cleanTitle}\n\n${content}`], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fileName =
    cleanTitle.toLowerCase().replace(/[^a-z0-9\u0980-\u09FF_-]+/gi, "_") || "story";
  a.download = `${fileName}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
