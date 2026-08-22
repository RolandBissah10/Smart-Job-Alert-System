import { useState } from 'react';
import useCompanySearch from '../hooks/useCompanySearch';

export default function ChipInput({ label, values, onAdd, onRemove, placeholder, withCompanySuggestions = false }) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestions = useCompanySearch(input, { enabled: withCompanySuggestions && showSuggestions });

  const add = (valueOverride) => {
    const value = (valueOverride ?? input).trim();
    if (!value || values.includes(value)) return;
    onAdd(value);
    setInput('');
    setShowSuggestions(false);
  };

  return (
    <div className="profile-section">
      <label className="profile-label">{label}</label>
      <div className="chip-grid">
        {values.map((value) => (
          <button key={value} type="button" className="chip selected chip-custom" onClick={() => onRemove(value)}>
            {value} &times;
          </button>
        ))}
      </div>
      <div className="custom-tech-row">
        <div className="autocomplete-input-wrapper">
          <input
            type="text"
            className="profile-input"
            placeholder={placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); add(); }
            }}
          />
          {withCompanySuggestions && showSuggestions && suggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {suggestions
                .filter((name) => !values.includes(name))
                .map((name) => (
                  <button
                    key={name}
                    type="button"
                    className="autocomplete-option"
                    onMouseDown={(e) => { e.preventDefault(); add(name); }}
                  >
                    {name}
                  </button>
                ))}
            </div>
          )}
        </div>
        <button type="button" className="button" onClick={() => add()}>Add</button>
      </div>
    </div>
  );
}
