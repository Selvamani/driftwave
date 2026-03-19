import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../themes/theme_provider.dart';
import 'player_provider.dart';

class MiniPlayer extends ConsumerWidget {
  const MiniPlayer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c      = ref.watch(themeColorsProvider);
    final player = ref.watch(playerProvider);
    final track  = player.currentTrack;
    if (track == null) return const SizedBox.shrink();

    return GestureDetector(
      onTap: () => context.push('/player'),
      child: Container(
        margin:  const EdgeInsets.fromLTRB(12, 0, 12, 8),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color:        c.card,
          border:       Border.all(color: c.border2),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color:      c.accent.withOpacity(0.08),
              blurRadius: 20,
              offset:     const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            // Album art
            Container(
              width: 38, height: 38,
              decoration: BoxDecoration(
                color:        c.surface,
                borderRadius: BorderRadius.circular(8),
                border:       Border.all(color: c.border),
              ),
              child: const Center(child: Text('🎵', style: TextStyle(fontSize: 18))),
            ),
            const SizedBox(width: 10),

            // Track info
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize:       MainAxisSize.min,
                children: [
                  Text(
                    track.title,
                    style: TextStyle(
                      fontFamily:  'Syne',
                      fontSize:    12,
                      fontWeight:  FontWeight.w700,
                      color:       c.text,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    track.artist,
                    style: TextStyle(
                      fontFamily: 'DM Mono',
                      fontSize:   9,
                      color:      c.muted,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),

            // Playing indicator or pause
            if (player.isPlaying)
              _WaveIndicator(color: c.accent)
            else
              Icon(Icons.music_note, color: c.muted, size: 16),
            const SizedBox(width: 8),

            // Skip button
            GestureDetector(
              onTap: () => ref.read(playerProvider.notifier).next(),
              child: Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color:        c.accent,
                  borderRadius: BorderRadius.circular(50),
                ),
                child: Icon(Icons.skip_next, color: c.accentFg, size: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _WaveIndicator extends StatefulWidget {
  final Color color;
  const _WaveIndicator({required this.color});

  @override
  State<_WaveIndicator> createState() => _WaveIndicatorState();
}

class _WaveIndicatorState extends State<_WaveIndicator>
    with TickerProviderStateMixin {
  late final List<AnimationController> _controllers;
  late final List<Animation<double>> _anims;

  @override
  void initState() {
    super.initState();
    _controllers = List.generate(3, (i) => AnimationController(
      vsync:    this,
      duration: Duration(milliseconds: 600 + i * 100),
    )..repeat(reverse: true));
    _anims = _controllers.map((c) =>
      Tween<double>(begin: 4, end: 16).animate(
        CurvedAnimation(parent: c, curve: Curves.easeInOut))).toList();
  }

  @override
  void dispose() {
    for (final c in _controllers) { c.dispose(); }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 16, height: 18,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: List.generate(3, (i) => AnimatedBuilder(
          animation: _anims[i],
          builder: (_, __) => Container(
            width: 3,
            height: _anims[i].value,
            decoration: BoxDecoration(
              color:        widget.color,
              borderRadius: BorderRadius.circular(1.5),
            ),
          ),
        )),
      ),
    );
  }
}
