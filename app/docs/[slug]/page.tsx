export const dynamic = 'force-dynamic';
import React from "react";
import fs from "fs";
import path from "path";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../Docs.css";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  const docsDir = path.join(process.cwd(), "docs");
  if (!fs.existsSync(docsDir)) return [];
  
  const files = fs.readdirSync(docsDir);
  return files
    .filter(file => file.endsWith(".md"))
    .map(file => ({
      slug: file.replace(".md", ""),
    }));
}

export default async function DocPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  
  // Security check: ensure slug doesn't contain path traversal
  if (slug.includes("..") || slug.includes("/") || slug.includes("\\")) {
    return notFound();
  }

  const filePath = path.join(process.cwd(), "docs", `${slug}.md`);

  if (!fs.existsSync(filePath)) {
    return notFound();
  }

  const content = fs.readFileSync(filePath, "utf8");

  return (
    <div className="docs-container">
      <div className="docs-header">
        <Link href="/" className="docs-back-link" style={{ marginBottom: 0 }}>
          ← Zurück zum Dashboard
        </Link>
        {slug !== "TECHNICAL" ? (
          <Link href="/docs/TECHNICAL" className="docs-nav-link">
            Technische Dokumentation →
          </Link>
        ) : (
          <Link href="/docs/USER_GUIDE" className="docs-nav-link">
            ← Zurück zur Benutzer-Dokumentation
          </Link>
        )}
      </div>
      <div className="docs-content glass-panel">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
      <div style={{ marginTop: "2rem", textAlign: "center", opacity: 0.5, fontSize: "0.8rem" }}>
        &copy; {new Date().getFullYear()} GW2 Alliance Manager - Interne Dokumentation
      </div>
    </div>
  );
}
