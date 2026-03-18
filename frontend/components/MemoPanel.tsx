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
          <button className="btnPrimary" onClick={handleExport}>
            Export Memo ↓
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
                  return <p key={j} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>") }} />;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
