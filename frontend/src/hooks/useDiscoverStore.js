import { create } from "zustand";

/**
 * Persistent state for the Discover page.
 * Survives navigation because Zustand lives outside React's component tree.
 */
const useDiscoverStore = create((set) => ({
  prompt:       "",
  activeChip:   null,
  langFilter:   null,
  energy:       0.3,
  tempo:        0.45,
  valence:      0.4,
  energyOn:     false,
  tempoOn:      false,
  valenceOn:    false,
  durationOn:   false,
  durationMins: 300,
  filtersOpen:  false,
  limit:        20,

  // Last search results
  tracks:      [],
  totalDurSec: 0,

  setPrompt:       (v) => set({ prompt: v }),
  setActiveChip:   (v) => set({ activeChip: v }),
  setLangFilter:   (v) => set({ langFilter: v }),
  setEnergy:       (v) => set({ energy: v }),
  setTempo:        (v) => set({ tempo: v }),
  setValence:      (v) => set({ valence: v }),
  setEnergyOn:     (v) => set({ energyOn: v }),
  setTempoOn:      (v) => set({ tempoOn: v }),
  setValenceOn:    (v) => set({ valenceOn: v }),
  setDurationOn:   (v) => set({ durationOn: v }),
  setDurationMins: (v) => set({ durationMins: v }),
  setFiltersOpen:  (v) => set({ filtersOpen: v }),
  setLimit:        (v) => set({ limit: v }),
  setResults:      (tracks, totalDurSec) => set({ tracks, totalDurSec }),
}));

export default useDiscoverStore;
