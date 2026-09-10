import { useState, useLayoutEffect, useRef } from 'react';
import { X } from 'lucide-react';

const MARGIN = 8;
const CARD_WIDTH = 300;
const POLL_INTERVAL_MS = 200;
const MAX_POLL_ATTEMPTS = 10; // 2s - covers a section's initial data fetch, not just layout settling

export default function TourGuide({ steps, onFinish, onStepEnter }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const onStepEnterRef = useRef(onStepEnter);
  onStepEnterRef.current = onStepEnter;

  const step = steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  useLayoutEffect(() => {
    // Lets the host page switch to whatever section/state this step targets
    // (e.g. a step spotlighting a Job Feed control needs the Jobs section
    // active) before we go looking for the element.
    onStepEnterRef.current?.(step);

    if (!step.selector) {
      setRect(null);
      return undefined;
    }

    const measure = () => {
      const el = document.querySelector(step.selector);
      setRect(el ? el.getBoundingClientRect() : null);
      return !!el;
    };

    measure();
    // Keep polling for a bit: the sidebar drawer (mobile) takes a moment to
    // slide open, and a step that just switched sections may target an
    // element still behind that section's initial "Loading..." data fetch.
    let attempts = 0;
    const poll = setInterval(() => {
      attempts += 1;
      if (measure() || attempts >= MAX_POLL_ATTEMPTS) clearInterval(poll);
    }, POLL_INTERVAL_MS);
    window.addEventListener('resize', measure);
    return () => {
      clearInterval(poll);
      window.removeEventListener('resize', measure);
    };
  }, [stepIndex]);

  const next = () => (isLast ? onFinish() : setStepIndex((i) => i + 1));
  const back = () => setStepIndex((i) => Math.max(0, i - 1));

  let cardStyle;
  if (rect) {
    const spaceRight = window.innerWidth - rect.right - 16;
    const spaceLeft = rect.left - 16;
    if (spaceRight >= CARD_WIDTH || spaceLeft >= CARD_WIDTH) {
      const left = spaceRight >= CARD_WIDTH ? rect.right + 16 : rect.left - CARD_WIDTH - 16;
      const top = Math.min(Math.max(rect.top, MARGIN), window.innerHeight - 220);
      cardStyle = { top, left };
    } else {
      // Narrow viewport - no room beside the target (e.g. the mobile sidebar
      // drawer). Stack the card below it instead, so it doesn't cover the
      // very element it's meant to highlight.
      const top = rect.bottom + 16 + 220 <= window.innerHeight
        ? rect.bottom + 16
        : Math.max(MARGIN, rect.top - 16 - 220);
      const left = Math.max(MARGIN, Math.min(rect.left, window.innerWidth - CARD_WIDTH - MARGIN));
      cardStyle = { top, left };
    }
  }

  return (
    <div className={`tour-overlay ${rect ? '' : 'tour-overlay-dimmed'}`}>
      {rect && (
        <div
          className="tour-spotlight"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      <div className={`tour-card ${rect ? '' : 'tour-card-centered'}`} style={cardStyle}>
        <button className="tour-close" onClick={onFinish} aria-label="Skip tour">
          <X size={16} />
        </button>
        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-text">{step.text}</p>
        <div className="tour-footer">
          <span className="tour-step-count">{stepIndex + 1} / {steps.length}</span>
          <div className="tour-actions">
            {!isFirst && (
              <button className="button button-secondary" onClick={back}>Back</button>
            )}
            <button className="button" onClick={next}>{isLast ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
