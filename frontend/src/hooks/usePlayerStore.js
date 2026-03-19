/**
 * Global player state using Zustand.
 * Manages current track, queue, playback state, and volume.
 */
import { create } from "zustand";

const usePlayerStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────
  currentTrack: null,
  queue:        [],
  queueIndex:   -1,
  isPlaying:    false,
  volume:       0.8,
  progress:     0,       // 0–1
  duration:     0,       // seconds
  shuffle:      false,
  repeat:       "none",  // "none" | "one" | "all"
  _origQueue:   [],      // pre-shuffle queue

  // ── Actions ────────────────────────────────────────
  playTrack(track, queue = []) {
    const idx = queue.findIndex((t) => t.file_path === track.file_path);
    set({
      currentTrack: track,
      queue:        queue.length ? queue : [track],
      queueIndex:   idx >= 0 ? idx : 0,
      isPlaying:    true,
      progress:     0,
    });
  },

  playQueue(queue, startIndex = 0) {
    set({
      currentTrack: queue[startIndex],
      queue,
      queueIndex:   startIndex,
      isPlaying:    true,
      progress:     0,
    });
  },

  togglePlay() {
    set((s) => ({ isPlaying: !s.isPlaying }));
  },

  next() {
    const { queue, queueIndex, repeat } = get();
    if (repeat === "one") {
      set({ progress: 0, seekTarget: 0 });
      return;
    }
    const nextIdx = queueIndex + 1;
    if (nextIdx < queue.length) {
      set({ currentTrack: queue[nextIdx], queueIndex: nextIdx, isPlaying: true, progress: 0 });
    } else if (repeat === "all" && queue.length > 0) {
      set({ currentTrack: queue[0], queueIndex: 0, isPlaying: true, progress: 0 });
    } else {
      set({ isPlaying: false });
    }
  },

  prev() {
    const { queue, queueIndex, progress } = get();
    if (progress * get().duration > 3) {
      set({ seekTarget: 0 });
      return;
    }
    const prevIdx = queueIndex - 1;
    if (prevIdx >= 0) {
      set({ currentTrack: queue[prevIdx], queueIndex: prevIdx, isPlaying: true, progress: 0 });
    }
  },

  toggleShuffle() {
    const { shuffle, queue, queueIndex, _origQueue } = get();
    if (!shuffle) {
      const current = queue[queueIndex];
      const rest    = queue.filter((_, i) => i !== queueIndex)
                           .sort(() => Math.random() - 0.5);
      const newQueue = [current, ...rest];
      set({ shuffle: true, _origQueue: queue, queue: newQueue, queueIndex: 0 });
    } else {
      const current  = queue[queueIndex];
      const origIdx  = _origQueue.findIndex((t) => t.file_path === current.file_path);
      set({ shuffle: false, queue: _origQueue, queueIndex: origIdx >= 0 ? origIdx : 0, _origQueue: [] });
    }
  },

  cycleRepeat() {
    const { repeat } = get();
    set({ repeat: repeat === "none" ? "all" : repeat === "all" ? "one" : "none" });
  },

  seekTarget: null,

  setProgress(val) {
    set({ progress: Math.max(0, Math.min(1, val)) });
  },

  seek(val) {
    set({ seekTarget: Math.max(0, Math.min(1, val)) });
  },

  setDuration(val) {
    set({ duration: val });
  },

  setVolume(val) {
    set({ volume: Math.max(0, Math.min(1, val)) });
  },

  // Merge Qdrant enrichment into the current track (cultural_meta, adapter_type, tempo…)
  mergeCurrentTrackMeta(meta) {
    set((s) => {
      if (!s.currentTrack) return {};
      return { currentTrack: { ...s.currentTrack, ...meta } };
    });
  },

  addToQueue(track) {
    set((s) => ({ queue: [...s.queue, track] }));
  },

  clearQueue() {
    set({ queue: [], currentTrack: null, queueIndex: -1, isPlaying: false });
  },
}));

export default usePlayerStore;
