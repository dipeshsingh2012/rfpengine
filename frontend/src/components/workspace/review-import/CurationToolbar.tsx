import React from "react";
import { Search, X, Plus, CheckSquare, Square } from "lucide-react";

interface CurationToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showAddForm: boolean;
  setShowAddForm: (show: boolean) => void;
  isAllFilteredSelected: boolean;
  onToggleSelectAll: () => void;
}

export const CurationToolbar: React.FC<CurationToolbarProps> = ({
  searchQuery,
  setSearchQuery,
  showAddForm,
  setShowAddForm,
  isAllFilteredSelected,
  onToggleSelectAll,
}) => {
  return (
    <div className="curation-toolbar">
      <div className="toolbar-search">
        <Search size={15} />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by question text, ID (e.g. SEC-01), or keyword..."
        />
        {searchQuery && (
          <button className="clear-search-btn" onClick={() => setSearchQuery("")}>
            <X size={13} />
          </button>
        )}
      </div>

      <div className="toolbar-actions">
        <button className="outline-button add-question-btn" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus size={14} /> Add Question
        </button>
        <button
          className="toolbar-btn"
          onClick={onToggleSelectAll}
          title={isAllFilteredSelected ? "Deselect All" : "Select All"}
        >
          {isAllFilteredSelected ? <CheckSquare size={15} /> : <Square size={15} />}
          {isAllFilteredSelected ? "Deselect All" : "Select All"}
        </button>
      </div>
    </div>
  );
};

