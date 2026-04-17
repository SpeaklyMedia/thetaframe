import { useEffect } from "react";

const TOUCH_QUERY = "(hover: none) and (pointer: coarse)";
const CARD_SELECTOR = "[data-habit-focus-group] [data-habit-focus-card]";
const FOCUS_CLASS = "is-canvas-focused";
const ROW_TOLERANCE = 20;
const DEADBAND = 40;

type CardEntry = [HTMLElement, DOMRect];

function groupIntoRows(entries: CardEntry[]): CardEntry[][] {
  const rows: CardEntry[][] = [];

  for (const entry of entries) {
    const top = entry[1].top;
    const existing = rows.find((row) => Math.abs(row[0][1].top - top) <= ROW_TOLERANCE);

    if (existing) {
      existing.push(entry);
    } else {
      rows.push([entry]);
    }
  }

  return rows;
}

function removeFocusClass(elements: readonly HTMLElement[]) {
  for (const element of elements) {
    element.classList.remove(FOCUS_CLASS);
  }
}

function getVisibleHabitCards(): CardEntry[] {
  const entries: CardEntry[] = [];

  for (const element of document.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
    const rect = element.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
    if (rect.width === 0 || rect.height === 0) continue;
    entries.push([element, rect]);
  }

  return entries;
}

export function useHabitCanvasFocus(): void {
  useEffect(() => {
    const media = window.matchMedia(TOUCH_QUERY);
    let focusedCards: HTMLElement[] = [];
    let raf: number | null = null;
    let isListening = false;

    const clearFocusedCards = () => {
      removeFocusClass(focusedCards);
      focusedCards = [];
    };

    const sampleFocus = () => {
      raf = null;

      const targetY = window.innerHeight * 0.35;
      const rows = groupIntoRows(getVisibleHabitCards());

      if (rows.length === 0) {
        clearFocusedCards();
        return;
      }

      let bestRow: CardEntry[] | null = null;
      let bestDistance = Infinity;

      for (const row of rows) {
        const distance = Math.abs(row[0][1].top - targetY);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestRow = row;
        }
      }

      if (!bestRow) return;

      const activeIsInBestRow =
        focusedCards.length > 0 &&
        bestRow.some(([card]) => focusedCards.includes(card));

      if (activeIsInBestRow) return;

      let activeRowDistance = Infinity;
      if (focusedCards.length > 0) {
        for (const row of rows) {
          if (row.some(([card]) => focusedCards.includes(card))) {
            activeRowDistance = Math.abs(row[0][1].top - targetY);
            break;
          }
        }
      }

      if (focusedCards.length > 0 && bestDistance >= activeRowDistance - DEADBAND) return;

      clearFocusedCards();
      focusedCards = bestRow.map(([card]) => card);
      for (const card of focusedCards) {
        card.classList.add(FOCUS_CLASS);
      }
    };

    const scheduleFocusSample = () => {
      if (raf !== null) return;
      raf = window.requestAnimationFrame(sampleFocus);
    };

    const startTouchFocus = () => {
      if (isListening) return;
      isListening = true;
      scheduleFocusSample();
      window.addEventListener("scroll", scheduleFocusSample, { passive: true });
      window.addEventListener("resize", scheduleFocusSample, { passive: true });
    };

    const stopTouchFocus = () => {
      if (raf !== null) {
        window.cancelAnimationFrame(raf);
        raf = null;
      }
      if (isListening) {
        window.removeEventListener("scroll", scheduleFocusSample);
        window.removeEventListener("resize", scheduleFocusSample);
        isListening = false;
      }
      clearFocusedCards();
    };

    const handlePointerModeChange = () => {
      if (media.matches) {
        startTouchFocus();
      } else {
        stopTouchFocus();
      }
    };

    handlePointerModeChange();
    media.addEventListener("change", handlePointerModeChange);

    return () => {
      stopTouchFocus();
      media.removeEventListener("change", handlePointerModeChange);
      for (const element of document.querySelectorAll<HTMLElement>(CARD_SELECTOR)) {
        element.classList.remove(FOCUS_CLASS);
      }
    };
  }, []);
}
