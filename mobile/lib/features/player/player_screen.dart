import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../themes/theme_provider.dart';
import '../../models/track.dart';
import 'player_provider.dart';

class PlayerScreen extends ConsumerWidget {
  const PlayerScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c      = ref.watch(themeColorsProvider);
    final player = ref.watch(playerProvider);
    final track  = player.currentTrack;

    if (track == null) {
      return Scaffold(
        backgroundColor: c.bg,
        body: Center(
          child: Text('Nothing playing',
              style: TextStyle(color: c.muted, fontFamily: 'Cormorant Garamond', fontSize: 20)),
        ),
      );
    }

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => context.pop(),
                    child: Icon(Icons.keyboard_arrow_down, color: c.muted2, size: 28),
                  ),
                  const Spacer(),
                  Text('Now Playing',
                    style: TextStyle(
                      fontFamily: 'DM Mono', fontSize: 9,
                      letterSpacing: 2, color: c.muted,
                    )),
                  const Spacer(),
                  Icon(Icons.more_horiz, color: c.muted2, size: 24),
                ],
              ),
            ),

            // Album art
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: AspectRatio(
                aspectRatio: 1,
                child: Container(
                  decoration: BoxDecoration(
                    color:        c.surface,
                    borderRadius: BorderRadius.circular(20),
                    border:       Border.all(color: c.border),
                    boxShadow: [BoxShadow(
                      color:      c.accent.withOpacity(0.12),
                      blurRadius: 40,
                      offset:     const Offset(0, 16),
                    )],
                  ),
                  child: const Center(child: Text('🎵', style: TextStyle(fontSize: 96))),
                ),
              ),
            ),

            const SizedBox(height: 28),

            // Track info
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(track.title,
                          style: TextStyle(
                            fontFamily: 'Cormorant Garamond', fontSize: 28,
                            fontWeight: FontWeight.w600, color: c.text,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(track.artist.toUpperCase(),
                          style: TextStyle(
                            fontFamily: 'DM Mono', fontSize: 10,
                            letterSpacing: 1, color: c.muted2,
                          ),
                        ),
                        const SizedBox(height: 10),
                        // Badges
                        Wrap(spacing: 6, children: [
                          _Badge(track.adapterType.toUpperCase(), c),
                          if (track.tamileGenre.isNotEmpty) _Badge(track.tamileGenre.toUpperCase(), c),
                          if (track.tempo > 0) _Badge('${track.tempo.round()} BPM', c),
                        ]),
                      ],
                    ),
                  ),
                  Icon(Icons.favorite_border, color: c.muted2, size: 22),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Progress
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Column(
                children: [
                  SliderTheme(
                    data: SliderTheme.of(context).copyWith(
                      trackHeight:       3,
                      thumbShape:        const RoundSliderThumbShape(enabledThumbRadius: 6),
                      overlayShape:      const RoundSliderOverlayShape(overlayRadius: 14),
                      activeTrackColor:  c.accent,
                      inactiveTrackColor:c.border2,
                      thumbColor:        Colors.white,
                    ),
                    child: Slider(
                      value:    player.progress.clamp(0.0, 1.0),
                      onChanged: (v) => ref.read(playerProvider.notifier).seekTo(v),
                    ),
                  ),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(_fmt(player.position),
                        style: TextStyle(fontFamily: 'DM Mono', fontSize: 9, color: c.muted)),
                      Text(_fmt(player.duration),
                        style: TextStyle(fontFamily: 'DM Mono', fontSize: 9, color: c.muted)),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16),

            // Controls
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _CtrlBtn(icon: Icons.shuffle,       color: c.muted2, onTap: null),
                  _CtrlBtn(icon: Icons.skip_previous, color: c.text,   onTap: () => ref.read(playerProvider.notifier).prev()),
                  _PlayBtn(isPlaying: player.isPlaying, c: c,
                    onTap: () => ref.read(playerProvider.notifier).togglePlay()),
                  _CtrlBtn(icon: Icons.skip_next,     color: c.text,   onTap: () => ref.read(playerProvider.notifier).next()),
                  _CtrlBtn(icon: Icons.repeat,        color: c.muted2, onTap: null),
                ],
              ),
            ),

            const SizedBox(height: 20),

            // Volume
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Row(
                children: [
                  Icon(Icons.volume_down, color: c.muted, size: 18),
                  Expanded(
                    child: SliderTheme(
                      data: SliderTheme.of(context).copyWith(
                        trackHeight: 3,
                        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
                        activeTrackColor:  c.accent,
                        inactiveTrackColor: c.border2,
                        thumbColor: Colors.white,
                      ),
                      child: Slider(
                        value: player.volume,
                        onChanged: (v) => ref.read(playerProvider.notifier).setVolume(v),
                      ),
                    ),
                  ),
                  Icon(Icons.volume_up, color: c.muted, size: 18),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _fmt(Duration d) {
    final m = d.inMinutes;
    final s = d.inSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}

class _Badge extends StatelessWidget {
  final String text;
  final DriftwaveColors c;
  const _Badge(this.text, this.c);

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
    decoration: BoxDecoration(
      border:       Border.all(color: c.border2),
      borderRadius: BorderRadius.circular(4),
    ),
    child: Text(text,
      style: TextStyle(fontFamily: 'DM Mono', fontSize: 8, color: c.muted2, letterSpacing: 1)),
  );
}

class _CtrlBtn extends StatelessWidget {
  final IconData icon;
  final Color    color;
  final VoidCallback? onTap;
  const _CtrlBtn({required this.icon, required this.color, this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 40, height: 40,
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(10)),
      child: Icon(icon, color: onTap != null ? color : color.withOpacity(0.4), size: 22),
    ),
  );
}

class _PlayBtn extends StatelessWidget {
  final bool isPlaying;
  final DriftwaveColors c;
  final VoidCallback onTap;
  const _PlayBtn({required this.isPlaying, required this.c, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 60, height: 60,
      decoration: BoxDecoration(
        color:        c.accent,
        shape:        BoxShape.circle,
        boxShadow: [BoxShadow(
          color:      c.accent.withOpacity(0.35),
          blurRadius: 20, offset: const Offset(0, 6),
        )],
      ),
      child: Icon(
        isPlaying ? Icons.pause : Icons.play_arrow,
        color: c.accentFg, size: 28,
      ),
    ),
  );
}
