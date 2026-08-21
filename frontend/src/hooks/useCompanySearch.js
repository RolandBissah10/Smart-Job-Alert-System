import { useEffect, useRef, useState } from 'react';
import { searchCompanies } from '../services/api';

const DEBOUNCE_MS = 300;

/** Debounced company-name suggestions, backed by real scraped job postings.
 * Fetches on every query change (including empty - the backend returns the
 * most common companies as a default browse list) and always keeps the most
 * recent request's result, discarding stale in-flight responses. */
export default function useCompanySearch(query, { enabled = true } = {}) {
  const [suggestions, setSuggestions] = useState([]);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setSuggestions([]);
      return;
    }

    const thisRequestId = ++requestIdRef.current;
    const timer = setTimeout(() => {
      searchCompanies(query)
        .then((data) => {
          if (requestIdRef.current === thisRequestId) {
            setSuggestions(data.companies || []);
          }
        })
        .catch(() => {
          if (requestIdRef.current === thisRequestId) {
            setSuggestions([]);
          }
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, enabled]);

  return suggestions;
}
