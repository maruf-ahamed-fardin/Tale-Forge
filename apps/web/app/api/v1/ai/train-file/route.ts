import { NextRequest, NextResponse } from "next/server";
import { trainOnText } from "@/lib/story-engine";

export const dynamic = "force-dynamic";

import { pathToFileURL } from "url";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

async function extractWithPython(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(
      os.tmpdir(),
      `taleforge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.pdf`,
    );
    fs.writeFileSync(tmpFile, buffer);
    const pyScript = `import pypdf, sys; reader = pypdf.PdfReader(sys.argv[1]); print('\\n\\n'.join(p.extract_text() or '' for p in reader.pages))`;
    execFile("python", ["-c", pyScript, tmpFile], (err, stdout) => {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // ignore
      }
      if (err) {
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    try {
      const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
      const workerUrl = pathToFileURL(workerPath).href;
      PDFParse.setWorker(workerUrl);
    } catch {
      // ignore worker resolution errors
    }

    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    try {
      await parser.destroy();
    } catch {
      // ignore
    }
    const raw = result.text || "";
    // Clean up page numbering artifacts like "-- 1 of 12 --"
    const cleaned = raw
      .replace(/--\s*\d+\s*of\s*\d+\s*--/gi, "")
      .replace(/\r\n/g, "\n")
      .trim();

    if (cleaned) {
      return cleaned;
    }
  } catch (err) {
    console.warn("PDFParse worker error, trying Python extraction fallback:", err);
  }

  // Robust fallback: pure Python pypdf
  try {
    const pyText = await extractWithPython(buffer);
    if (pyText) return pyText;
  } catch (pyErr) {
    console.error("Python PDF extraction error:", pyErr);
  }

  throw new Error(
    "PDF ফাইলটি থেকে লেখা উদ্ধার করা সম্ভব হয়নি। ফাইলটি স্ক্যান করা ছবি নাকি সঠিক টেক্সট ফরম্যাট তা যাচাই করুন।",
  );
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || "").trim();
    if (text) return text;
  } catch (err) {
    console.warn("Mammoth extraction error, trying Python fallback:", err);
  }

  // Python built-in zipfile fallback
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(
      os.tmpdir(),
      `taleforge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.docx`,
    );
    fs.writeFileSync(tmpFile, buffer);
    const pyScript = `import zipfile, xml.etree.ElementTree as ET, sys
try:
    with zipfile.ZipFile(sys.argv[1]) as z:
        xml_content = z.read('word/document.xml')
    tree = ET.fromstring(xml_content)
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    paras = []
    for p in tree.iterfind('.//w:p', namespaces):
        texts = [node.text for node in p.iterfind('.//w:t', namespaces) if node.text]
        if texts:
            paras.append(''.join(texts))
    print('\\n\\n'.join(paras))
except Exception as e:
    sys.exit(1)
`;
    execFile("python", ["-c", pyScript, tmpFile], (err, stdout) => {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // ignore
      }
      if (err) {
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function extractTextFromDoc(buffer: Buffer): string {
  // Extract readable text chunks from legacy binary .doc format
  const contentStr = buffer.toString("binary");
  const regex = /[\x20-\x7E\r\n\t]{4,}/g;
  const matches = contentStr.match(regex);
  if (matches && matches.length > 0) {
    return matches.join("\n").trim();
  }
  return buffer.toString("utf-8");
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const title = (formData.get("title") as string) || "";

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { detail: "No valid file uploaded." },
        { status: 400 },
      );
    }

    const fileObj = file as File;
    const fileName = fileObj.name || "uploaded_story";
    const isPdf =
      fileName.toLowerCase().endsWith(".pdf") ||
      fileObj.type === "application/pdf";
    const isDocx =
      fileName.toLowerCase().endsWith(".docx") ||
      fileObj.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    const isDoc =
      fileName.toLowerCase().endsWith(".doc") ||
      fileObj.type === "application/msword";

    let text = "";
    if (isPdf) {
      const arrayBuffer = await fileObj.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      text = await extractTextFromPdf(buffer);
    } else if (isDocx) {
      const arrayBuffer = await fileObj.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      text = await extractTextFromDocx(buffer);
    } else if (isDoc) {
      const arrayBuffer = await fileObj.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      text = extractTextFromDoc(buffer);
    } else {
      text = await fileObj.text();
    }

    if (!text.trim()) {
      return NextResponse.json(
        { detail: "The uploaded file is empty or contains no readable text." },
        { status: 400 },
      );
    }

    const cleanTitle =
      title.trim() ||
      fileName.replace(/\.(txt|pdf|docx|doc)$/i, "") ||
      "Uploaded Story";

    // Try proxying to Python backend if active
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const forwardForm = new FormData();
      forwardForm.append("file", fileObj);
      forwardForm.append("title", cleanTitle);

      const pyRes = await fetch("http://127.0.0.1:8000/api/v1/ai/train-file", {
        method: "POST",
        body: forwardForm,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (pyRes.ok) {
        const data = await pyRes.json();
        try {
          trainOnText(text, cleanTitle);
        } catch {
          // ignore
        }
        return NextResponse.json(data);
      }
    } catch {
      // Fall back to embedded engine
    }

    const result = trainOnText(text, cleanTitle);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "File training failed";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
