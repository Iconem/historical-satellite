import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { subMonths } from 'date-fns';

const dateStorage = {
    getItem: (key) => {
        const item = localStorage.getItem(key);
        // Check if the item is a valid ISO string and represents a valid date
        if (item && !isNaN(Date.parse(item))) {
          return new Date(item);
        } else {
          // Return a fallback date if the item doesn't exist or isn't a valid date
          return subMonths(new Date(), 2);
        }
      },
    setItem: (key, value) => {
      if (value instanceof Date) {
        localStorage.setItem(key, value.toISOString()); // Store dates as ISO strings
      }
    },
    removeItem: (key) => {
      localStorage.removeItem(key);
    }
  };

// Custom atomWithStorage for Date objects
function atomWithDateStorage(key, initialValue) {
  return atomWithStorage(key, initialValue, dateStorage
  );
}

export const leftTimelineDateAtom = atomWithDateStorage('leftTimelineDate', subMonths(new Date(), 2));
export const rightTimelineDateAtom = atomWithDateStorage('rightTimelineDate', subMonths(new Date(), 2));
export const clickedMapAtom = atomWithStorage('ui_clicked_map', 'left');