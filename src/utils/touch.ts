/**
 * Whether this is a touch screen: a device that can't hover. Read once at
 * load. Hover-only affordances (tooltips, grips that appear on hover) need
 * another way in here, and drags have to come from pointer events, since the
 * browser's native drag and drop doesn't work with a finger.
 */
export const isTouchScreen = typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches
