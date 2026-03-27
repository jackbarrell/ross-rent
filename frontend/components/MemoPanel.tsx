"use client";

import { useEffect, useState } from "react";
import { fetchMemo } from "@/lib/api";
import { InvestmentMemo } from "@/lib/types";

export function MemoPanel({ propertyId }: { propertyId: string }) {
  const [memo, setMemo] = useState<InvestmentMemo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMarkdown, setShowMarkdown] = useState(false);

  useEffect(() => {
    fetchMemo(propertyId)
      .then(setMemo)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [propertyId]);

  const handleExport = () => {
    if (!memo) return;
    const blob = new Blob([memo.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `investment_memo_${propertyId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const handlePdf = () => {
    if (!memo) return;
    const html = memo.sections.map((s) => {
      const content = s.content
        .split("\n")
        .map((line) => {
          const escaped = escapeHtml(line);
          if (line.startsWith("|")) return `<code>${escaped}</code><br/>`;
          if (line.startsWith("- ")) return `<li>${escapeHtml(line.substring(2))}</li>`;
          if (line.trim() === "") return "<br/>";
          return `<p style="margin:2px 0">${escaped.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>")}</p>`;
        })
        .join("");
      return `<h2 style="color:#0ea5e9;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:20px">${escapeHtml(s.title)}</h2>${content}`;
    }).join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Investment Memo – ${propertyId}</title>
<style>body{font-family:Inter,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a2e;line-height:1.6;font-size:13px}
h1{font-size:20px;margin-bottom:4px}h2{font-size:15px}code{font-size:11px;display:block;margin:2px 0}li{margin-left:16px}
@media print{body{padding:20px}}</style></head>
<body><h1>Investment Memo</h1><p style="color:#666">Generated: ${new Date(memo.generatedAt).toLocaleDateString()} · Property: ${propertyId}</p>${html}</body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  if (loading) return <p>Generating investment memo…</p>;
  if (!memo) return <p className="error">Could not generate memo.</p>;

  return (
    <div className="panelStack">
      <div className="rowBetween">
        <h2><span className="pillAi" style={{ marginRight: 8 }}>AI</span> Investment Memo</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btnSecondary" onClick={() => setShowMarkdown(!showMarkdown)}>
            {showMarkdown ? "Formatted" : "Raw Markdown"}
          </button>
          <button className="btnSecondary" onClick={handleExport}>
            Export .md ↓
          </button>
          <button className="btnPrimary" onClick={handlePdf}>
            Export PDF ↓
          </button>
        </div>
      </div>

      <p className="hintText">Generated on {new Date(memo.generatedAt).toLocaleDateString()}</p>

      {showMarkdown ? (
        <pre className="markdownPre">{memo.markdown}</pre>
      ) : (
        <div className="memoSections">
          {memo.sections.map((section, i) => (
            <div key={i} className="memoSection">
              <h3>{section.title}</h3>
              <div className="memoContent">
                {section.content.split("\n").map((line, j) => {
                  if (line.startsWith("|")) {
                    return <code key={j} className="memoTableLine">{line}</code>;
                  }
                  if (line.startsWith("- ")) {
                    return <li key={j}>{line.substring(2)}</li>;
                  }
                  if (line.startsWith("**") && line.endsWith("**")) {
                    return <p key={j}><strong>{line.replace(/\*\*/g, "")}</strong></p>;
                  }
                  if (line.trim() === "") return <br key={j} />;
                  // Parse bold/italic without dangerouslySetInnerHTML
                  const parts: React.ReactNode[] = [];
                  let remaining = line;
                  let partIdx = 0;
                  while (remaining) {
                    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
                    const italicMatch = remaining.match(/\*(.*?)\*/);
                    const match = boldMatch && italicMatch
                      ? (boldMatch.index! <= italicMatch.index! ? boldMatch : italicMatch)
                      : boldMatch || italicMatch;
                    if (!match || match.index === undefined) {
                      parts.push(remaining);
                      break;
                    }
                    if (match.index > 0) parts.push(remaining.slice(0, match.index));
                    if (match[0].startsWith("**")) {
                      parts.push(<strong key={partIdx++}>{match[1]}</strong>);
                    } else {
                      parts.push(<em key={partIdx++}>{match[1]}</em>);
                    }
                    remaining = remaining.slice(match.index + match[0].length);
                  }
                  return <p key={j}>{parts}</p>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
