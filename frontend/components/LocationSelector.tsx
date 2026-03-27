"use client";

import { useState, useRef, useEffect } from "react";

interface LocationSelectorProps {
  locations: string[];
  selected: string;
  onChange: (value: string) => void;
}

export function LocationSelector({ locations, selected, onChange }: LocationSelectorProps) {
  const [textInput, setTextInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = textInput.trim()
    ? locations.filter(l => l.toLowerCase().includes(textInput.toLowerCase()))
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearch = () => {
    onChange(textInput.trim());
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowSuggestions(false);
  };

  const handlePick = (loc: string) => {
    setTextInput("");
    onChange(loc);
    setShowSuggestions(false);
  };

  return (
    <div className="panel searchPanel">
      <div className="searchRow">
        <div className="searchInputGroup" ref={wrapRef} style={{ position: "relative" }}>
          <label className="label" htmlFor="searchInput">Search by city, ZIP, or address</label>
          <div className="searchBar">
            <input
              id="searchInput"
              className="textInput"
              type="text"
              placeholder="e.g. Morrisville VT, Austin, 78702…"
              value={textInput}
              onChange={(e) => { setTextInput(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            <button className="btnPrimary" onClick={handleSearch}>Search</button>
          </div>
          {showSuggestions && filtered.length > 0 && (
            <div className="searchSuggestions">
              {filtered.slice(0, 8).map(loc => (
                <button key={loc} className="searchSuggestionItem" onClick={() => handlePick(loc)}>
                  <span className="searchSuggestionIcon">📍</span> {loc}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="searchInputGroup">
          <label className="label" htmlFor="locationDropdown">Or select a location</label>
          <select
            id="locationDropdown"
            className="select"
            value={selected}
            onChange={(e) => {
              onChange(e.target.value);
              setTextInput("");
            }}
          >
            <option value="">All locations</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
