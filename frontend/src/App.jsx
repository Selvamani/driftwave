import { useEffect, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import DiscoverPage    from "./pages/DiscoverPage";
import LibraryPage     from "./pages/LibraryPage";
import PlaylistsPage   from "./pages/PlaylistsPage";
import SettingsPage    from "./pages/SettingsPage";
import NowPlayingPage  from "./pages/NowPlayingPage";
import SetupPage       from "./pages/SetupPage";
import usePlayerStore from "./hooks/usePlayerStore";
import { needsFirstRunSetup } from "./services/config";

function AudioEngine() {
  const audioRef = useRef(new Audio());
  const { currentTrack, isPlaying, volume, seekTarget, setProgress, setDuration, next } = usePlayerStore();

  // Load new track when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;
    audio.src = currentTrack.file_path;
    audio.load();
    audio.play().catch(() => {});
  }, [currentTrack?.file_path]);

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;
    if (isPlaying) audio.play().catch(() => {});
    else audio.pause();
  }, [isPlaying]);

  // Sync volume
  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

  // Seek when seekTarget changes
  useEffect(() => {
    if (seekTarget === null) return;
    const audio = audioRef.current;
    audio.currentTime = seekTarget * (audio.duration || 0);
    usePlayerStore.setState({ seekTarget: null });
  }, [seekTarget]);

  // Wire audio events → store
  useEffect(() => {
    const audio = audioRef.current;
    const onTime     = () => setProgress(audio.currentTime / (audio.duration || 1));
    const onDuration = () => setDuration(audio.duration || 0);
    const onEnded    = () => next();

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  return null;
}

export default function App() {
  // In Tauri desktop: redirect to setup if no server URL has been configured yet
  if (needsFirstRunSetup()) {
    return <SetupPage />;
  }

  return (
    <>
      <AudioEngine />
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/discover" replace />} />
          <Route path="discover"    element={<DiscoverPage />} />
          <Route path="library"     element={<LibraryPage />} />
          <Route path="playlists"   element={<PlaylistsPage />} />
          <Route path="settings"    element={<SettingsPage />} />
          <Route path="now-playing" element={<NowPlayingPage />} />
        </Route>
      </Routes>
    </>
  );
}
