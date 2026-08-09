// Shared card state. Kept behind accessors so the UI modules can read the card
// currently on screen without importing each other (and without a cycle).

let currentItem = null;
let flipped = false;

export function getCurrentItem() {
  return currentItem;
}

export function setCurrentItem(item) {
  currentItem = item;
}

export function isFlipped() {
  return flipped;
}

export function setFlipped(value) {
  flipped = value;
}