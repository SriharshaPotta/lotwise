// Motion's full feature set (animations, gestures, layout/layoutId), loaded as its own chunk after
// hydration by LazyMotion in MotionProvider instead of being part of every page's initial JS.
import { domMax } from "motion/react";

export default domMax;
