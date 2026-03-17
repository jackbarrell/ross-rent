"use client";

import { useState } from "react";

interface LocationSelectorProps {
  locations: string[];
  selected: string;
  onChange: (value: string) => void;
}

export function LocationSelector({ locations, selected, onChange }: LocationSelectorProps) {
  const [textInput, setTextInput] = useState("");

  const handleSearch = () => {
    onChange(textInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="panel searchPanel">
      <div className="searchRow">
        <div className="searchInputGroup">
          <label className="label" htmlFor="searchInput">Search by city, ZIP, or address</label>
          <div className="searchBar">
            <input
              id="searchInput"
              className="textInput"
              type="text"
              placeholder="e.g. Austin, 78702, Holly St…"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button className="btnPrimary" onClick={handleSearch}>Search</button>
          </div>
        </div>
        <div className="searchInputGroup">
          <label className="label" htmlFor="locationDropdown">Or select a demo location</label>
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
