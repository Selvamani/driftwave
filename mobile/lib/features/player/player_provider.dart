import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';
import '../../models/track.dart';

class PlayerState {
  final Track?  currentTrack;
  final List<Track> queue;
  final int     queueIndex;
  final bool    isPlaying;
  final Duration position;
  final Duration duration;
  final double  volume;

  const PlayerState({
    this.currentTrack,
    this.queue       = const [],
    this.queueIndex  = -1,
    this.isPlaying   = false,
    this.position    = Duration.zero,
    this.duration    = Duration.zero,
    this.volume      = 0.8,
  });

  PlayerState copyWith({
    Track?        currentTrack,
    List<Track>?  queue,
    int?          queueIndex,
    bool?         isPlaying,
    Duration?     position,
    Duration?     duration,
    double?       volume,
  }) => PlayerState(
    currentTrack: currentTrack ?? this.currentTrack,
    queue:        queue        ?? this.queue,
    queueIndex:   queueIndex   ?? this.queueIndex,
    isPlaying:    isPlaying    ?? this.isPlaying,
    position:     position     ?? this.position,
    duration:     duration     ?? this.duration,
    volume:       volume       ?? this.volume,
  );

  double get progress =>
      duration.inMilliseconds > 0
          ? position.inMilliseconds / duration.inMilliseconds
          : 0.0;
}

class PlayerNotifier extends Notifier<PlayerState> {
  late AudioPlayer _audio;

  @override
  PlayerState build() {
    _audio = AudioPlayer();
    _audio.positionStream.listen((pos) {
      state = state.copyWith(position: pos);
    });
    _audio.durationStream.listen((dur) {
      if (dur != null) state = state.copyWith(duration: dur);
    });
    _audio.playingStream.listen((playing) {
      state = state.copyWith(isPlaying: playing);
    });
    _audio.setVolume(0.8);
    ref.onDispose(() => _audio.dispose());
    return const PlayerState();
  }

  Future<void> playTrack(Track track, {List<Track> queue = const []}) async {
    final q   = queue.isEmpty ? [track] : queue;
    final idx = q.indexWhere((t) => t.filePath == track.filePath);
    state = state.copyWith(
      currentTrack: track,
      queue:        q,
      queueIndex:   idx >= 0 ? idx : 0,
    );
    await _loadAndPlay(track);
  }

  Future<void> _loadAndPlay(Track track) async {
    if (track.subsonicId.isEmpty) return;
    // Stream URL via API proxy
    final prefs = await _getPrefs();
    final url   = '${prefs}/stream/${track.subsonicId}';
    await _audio.setUrl(url);
    await _audio.play();
  }

  Future<String> _getPrefs() async {
    // TODO: pull from settings provider
    return 'http://localhost:8000';
  }

  Future<void> togglePlay() async {
    state.isPlaying ? await _audio.pause() : await _audio.play();
  }

  Future<void> next() async {
    final q   = state.queue;
    final idx = state.queueIndex + 1;
    if (idx < q.length) {
      state = state.copyWith(currentTrack: q[idx], queueIndex: idx);
      await _loadAndPlay(q[idx]);
    }
  }

  Future<void> prev() async {
    if (state.position.inSeconds > 3) {
      await _audio.seek(Duration.zero);
      return;
    }
    final idx = state.queueIndex - 1;
    if (idx >= 0) {
      final track = state.queue[idx];
      state = state.copyWith(currentTrack: track, queueIndex: idx);
      await _loadAndPlay(track);
    }
  }

  Future<void> seekTo(double progress) async {
    final ms = (progress * state.duration.inMilliseconds).round();
    await _audio.seek(Duration(milliseconds: ms));
  }

  Future<void> setVolume(double v) async {
    await _audio.setVolume(v);
    state = state.copyWith(volume: v);
  }
}

final playerProvider = NotifierProvider<PlayerNotifier, PlayerState>(
  PlayerNotifier.new,
);
