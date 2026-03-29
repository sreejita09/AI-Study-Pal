import { createContext, useContext, useState, useCallback, useRef } from "react";

const MotivationContext = createContext(null);

const CARD_DURATION = 3500; // auto-dismiss after 3.5s

export function MotivationProvider({ children }) {
  const [current, setCurrent] = useState(null); // { id, type, title, message }
  const queueRef = useRef([]);
  const timerRef = useRef(null);
  const idRef = useRef(0);

  const showNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      setCurrent(null);
      return;
    }
    const next = queueRef.current.shift();
    setCurrent(next);
    timerRef.current = setTimeout(() => {
      setCurrent(null);
      // small gap before next card
      setTimeout(showNext, 200);
    }, CARD_DURATION);
  }, []);

  const showCard = useCallback(({ type = "success", title, message }) => {
    const card = { id: ++idRef.current, type, title, message };
    if (current) {
      // queue it
      queueRef.current.push(card);
    } else {
      setCurrent(card);
      timerRef.current = setTimeout(() => {
        setCurrent(null);
        setTimeout(showNext, 200);
      }, CARD_DURATION);
    }
  }, [current, showNext]);

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setCurrent(null);
    setTimeout(showNext, 200);
  }, [showNext]);

  return (
    <MotivationContext.Provider value={{ current, showCard, dismiss }}>
      {children}
    </MotivationContext.Provider>
  );
}

export function useMotivation() {
  const ctx = useContext(MotivationContext);
  if (!ctx) throw new Error("useMotivation must be used within MotivationProvider");
  return ctx;
}
