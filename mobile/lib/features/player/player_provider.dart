import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:just_audio/just_audio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../models/track.dart';
import '../../services/api_service.dart';

class PlayerState {
  final Track?      currentTrack;
  final List<Track> queue;
  final int         queueIndex;
  final bool        isPlaying;
  final Duration    position;
  final Duration    duration;
  final double      volume;

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
    // Fetch Qdrant enrichment if cultural_meta is absent
    if (track.culturalMeta.isEmpty && track.subsonicId.isNotEmpty) {
      _fetchEnrichment(track.subsonicId);
    }
  }

  Future<void> playQueue(List<Track> queue, int index) async {
    if (index < 0 || index >= queue.length) return;
    final track = queue[index];
    state = state.copyWith(
      currentTrack: track,
      queue:        queue,
      queueIndex:   index,
    );
    await _loadAndPlay(track);
    if (track.culturalMeta.isEmpty && track.subsonicId.isNotEmpty) {
      _fetchEnrichment(track.subsonicId);
    }
  }

  Future<void> _loadAndPlay(Track track) async {
    if (track.subsonicId.isEmpty) return;
    final baseUrl = await _apiBaseUrl();
    final url     = '$baseUrl/stream/${track.subsonicId}';
    await _audio.setUrl(url);
    await _audio.play();
  }

  Future<void> _fetchEnrichment(String subsonicId) async {
    try {
      final api  = await ref.read(apiServiceProvider.future);
      final meta = await api.fetchTrackMeta(subsonicId);
      if (meta['found'] == true) mergeTrackMeta(meta);
    } catch (_) {}
  }

  void mergeTrackMeta(Map<String, dynamic> meta) {
    final track = state.currentTrack;
    if (track == null) return;
    final updated = track.copyWith(
      adapterType:  meta['adapter_type'] as String?,
      tempo:        (meta['tempo']  as num?)?.toDouble(),
      energy:       (meta['energy'] as num?)?.toDouble(),
      valence:      (meta['valence'] as num?)?.toDouble(),
      culturalMeta: meta['cultural_meta'] != null
          ? Map<String, dynamic>.from(meta['cultural_meta'] as Map)
          : null,
    );
    state = state.copyWith(currentTrack: updated);
  }

  Future<String> _apiBaseUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(kServerKey) ?? 'http://localhost:8000';
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
      if (q[idx].culturalMeta.isEmpty && q[idx].subsonicId.isNotEmpty) {
        _fetchEnrichment(q[idx].subsonicId);
      }
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
