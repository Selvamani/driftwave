import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../themes/theme_provider.dart';
import '../../models/track.dart';
import 'player_provider.dart';

class PlayerScreen extends ConsumerStatefulWidget {
  const PlayerScreen({super.key});

  @override
  ConsumerState<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends ConsumerState<PlayerScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
      body: Stack(
        children: [
          // ── Blurred background ──────────────────────────────
          if (track.coverUrl.isNotEmpty) ...[
            Positioned.fill(
              child: Image.network(track.coverUrl, fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => const SizedBox()),
            ),
            Positioned.fill(
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 50, sigmaY: 50),
                child: Container(color: c.bg.withOpacity(0.75)),
              ),
            ),
          ] else
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end:   Alignment.bottomCenter,
                    colors: [c.accent.withOpacity(0.15), c.bg],
                  ),
                ),
              ),
            ),

          // ── Main content ────────────────────────────────────
          SafeArea(
            child: Column(
              children: [
                // Header
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  child: Row(
                    children: [
                      GestureDetector(
                        onTap: () => context.pop(),
                        child: Icon(Icons.keyboard_arrow_down, color: c.muted2, size: 28),
                      ),
                      const Spacer(),
                      Text('NOW PLAYING',
                          style: TextStyle(fontFamily: 'DM Mono', fontSize: 9,
                              letterSpacing: 2, color: c.muted)),
                      const Spacer(),
                      const SizedBox(width: 28),
                    ],
                  ),
                ),

                // Scrollable player content
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Album art
                        Center(
                          child: Container(
                            width: double.infinity,
                            constraints: const BoxConstraints(maxWidth: 320),
                            child: AspectRatio(
                              aspectRatio: 1,
                              child: Container(
                                decoration: BoxDecoration(
                                  color:        c.surface,
                                  borderRadius: BorderRadius.circular(20),
                                  border:       Border.all(color: c.border),
                                  boxShadow: [BoxShadow(
                                    color:      c.accent.withOpacity(0.18),
                                    blurRadius: 48,
                                    offset:     const Offset(0, 20),
                                  )],
                                ),
                                clipBehavior: Clip.antiAlias,
                                child: track.coverUrl.isNotEmpty
                                    ? Image.network(track.coverUrl, fit: BoxFit.cover,
                                        errorBuilder: (_, __, ___) =>
                                            const Center(child: Text('🎵', style: TextStyle(fontSize: 80))))
                                    : const Center(child: Text('🎵', style: TextStyle(fontSize: 80))),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 28),

                        // Title
                        Text(track.title,
                          style: TextStyle(
                            fontFamily: 'Cormorant Garamond', fontSize: 28,
                            fontWeight: FontWeight.w600, color: c.text, height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),

                        // Artist
                        Text(track.artist.toUpperCase(),
                          style: TextStyle(fontFamily: 'DM Mono', fontSize: 10,
                              letterSpacing: 1.5, color: c.muted2),
                        ),

                        // Composer / lyricist
                        if (track.composer.isNotEmpty || track.lyricist.isNotEmpty) ...[
                          const SizedBox(height: 6),
                          if (track.composer.isNotEmpty)
                            _MetaRow(icon: '🎼', text: track.composer, c: c),
                          if (track.lyricist.isNotEmpty)
                            _MetaRow(icon: '✍', text: track.lyricist, c: c),
                        ],

                        const SizedBox(height: 10),

                        // Badges
                        Wrap(spacing: 6, runSpacing: 4, children: [
                          _Badge(track.adapterType.toUpperCase(), c),
                          if (track.tamileGenre.isNotEmpty)
                            _Badge(track.tamileGenre.toUpperCase(), c),
                          if (track.tempo > 0)
                            _Badge('${track.tempo.round()} kbps', c),
                        ]),

                        // Film info card
                        if (track.filmName.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          _FilmCard(track: track, c: c),
                        ],

                        const SizedBox(height: 24),

                        // Progress slider
                        SliderTheme(
                          data: SliderTheme.of(context).copyWith(
                            trackHeight:        3,
                            thumbShape:         const RoundSliderThumbShape(enabledThumbRadius: 6),
                            overlayShape:       const RoundSliderOverlayShape(overlayRadius: 14),
                            activeTrackColor:   c.accent,
                            inactiveTrackColor: c.border2,
                            thumbColor:         Colors.white,
                          ),
                          child: Slider(
                            value:     player.progress.clamp(0.0, 1.0),
                            onChanged: (v) => ref.read(playerProvider.notifier).seekTo(v),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(_fmt(player.position),
                                  style: TextStyle(fontFamily: 'DM Mono', fontSize: 9, color: c.muted)),
                              Text(_fmt(player.duration),
                                  style: TextStyle(fontFamily: 'DM Mono', fontSize: 9, color: c.muted)),
                            ],
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Controls
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _CtrlBtn(icon: Icons.shuffle,       color: c.muted2, onTap: null),
                            _CtrlBtn(icon: Icons.skip_previous, color: c.text,
                                onTap: () => ref.read(playerProvider.notifier).prev()),
                            _PlayBtn(isPlaying: player.isPlaying, c: c,
                                onTap: () => ref.read(playerProvider.notifier).togglePlay()),
                            _CtrlBtn(icon: Icons.skip_next, color: c.text,
                                onTap: () => ref.read(playerProvider.notifier).next()),
                            _CtrlBtn(icon: Icons.repeat, color: c.muted2, onTap: null),
                          ],
                        ),

                        const SizedBox(height: 16),

                        // Volume
                        Row(
                          children: [
                            Icon(Icons.volume_down, color: c.muted, size: 18),
                            Expanded(
                              child: SliderTheme(
                                data: SliderTheme.of(context).copyWith(
                                  trackHeight:        3,
                                  thumbShape:         const RoundSliderThumbShape(enabledThumbRadius: 5),
                                  activeTrackColor:   c.accent,
                                  inactiveTrackColor: c.border2,
                                  thumbColor:         Colors.white,
                                ),
                                child: Slider(
                                  value:     player.volume,
                                  onChanged: (v) => ref.read(playerProvider.notifier).setVolume(v),
                                ),
                              ),
                            ),
                            Icon(Icons.volume_up, color: c.muted, size: 18),
                          ],
                        ),

                        const SizedBox(height: 8),

                        // Tab bar: Queue / Lyrics
                        TabBar(
                          controller:         _tabs,
                          indicatorColor:     c.accent,
                          labelColor:         c.accent,
                          unselectedLabelColor: c.muted,
                          labelStyle:         const TextStyle(
                              fontFamily: 'DM Mono', fontSize: 9, letterSpacing: 2),
                          tabs: [
                            Tab(text: 'QUEUE · ${player.queue.length}'),
                            const Tab(text: 'LYRICS'),
                          ],
                        ),

                        const SizedBox(height: 8),

                        // Tab content — fixed height, scrollable internally
                        SizedBox(
                          height: 320,
                          child: TabBarView(
                            controller: _tabs,
                            children: [
                              // ── Queue ──
                              player.queue.isEmpty
                                  ? Center(
                                      child: Text('Queue empty',
                                          style: TextStyle(color: c.muted, fontSize: 13,
                                              fontStyle: FontStyle.italic)),
                                    )
                                  : ListView.builder(
                                      itemCount: player.queue.length,
                                      itemBuilder: (_, i) {
                                        final t          = player.queue[i];
                                        final isCurrent  = i == player.queueIndex;
                                        final isPast     = i <  player.queueIndex;
                                        return GestureDetector(
                                          onTap: () => ref
                                              .read(playerProvider.notifier)
                                              .playQueue(player.queue, i),
                                          child: Opacity(
                                            opacity: isPast ? 0.4 : 1.0,
                                            child: Container(
                                              margin: const EdgeInsets.symmetric(vertical: 2),
                                              padding: const EdgeInsets.symmetric(
                                                  horizontal: 10, vertical: 8),
                                              decoration: BoxDecoration(
                                                color: isCurrent
                                                    ? c.accent.withOpacity(0.1)
                                                    : Colors.transparent,
                                                border: Border.all(
                                                  color: isCurrent
                                                      ? c.accent.withOpacity(0.3)
                                                      : Colors.transparent,
                                                ),
                                                borderRadius: BorderRadius.circular(10),
                                              ),
                                              child: Row(
                                                children: [
                                                  SizedBox(
                                                    width: 24,
                                                    child: isCurrent && player.isPlaying
                                                        ? _WaveBars(c: c)
                                                        : Text('${i + 1}',
                                                            textAlign: TextAlign.right,
                                                            style: TextStyle(
                                                                fontFamily: 'DM Mono',
                                                                fontSize: 9,
                                                                color: c.muted)),
                                                  ),
                                                  const SizedBox(width: 10),
                                                  if (t.coverUrl.isNotEmpty)
                                                    Container(
                                                      width: 36, height: 36,
                                                      margin: const EdgeInsets.only(right: 10),
                                                      decoration: BoxDecoration(
                                                        borderRadius: BorderRadius.circular(6),
                                                        color: c.surface,
                                                      ),
                                                      clipBehavior: Clip.antiAlias,
                                                      child: Image.network(t.coverUrl,
                                                          fit: BoxFit.cover,
                                                          errorBuilder: (_, __, ___) =>
                                                              const Center(child: Text('🎵', style: TextStyle(fontSize: 16)))),
                                                    ),
                                                  Expanded(
                                                    child: Column(
                                                      crossAxisAlignment: CrossAxisAlignment.start,
                                                      children: [
                                                        Text(t.title,
                                                          maxLines: 1,
                                                          overflow: TextOverflow.ellipsis,
                                                          style: TextStyle(
                                                            fontSize: 12,
                                                            fontWeight: isCurrent
                                                                ? FontWeight.w700
                                                                : FontWeight.w600,
                                                            color: isCurrent ? c.accent : c.text,
                                                          ),
                                                        ),
                                                        Text(t.artist,
                                                          maxLines: 1,
                                                          overflow: TextOverflow.ellipsis,
                                                          style: TextStyle(
                                                              fontFamily: 'DM Mono',
                                                              fontSize: 8,
                                                              color: c.muted),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                  if (t.duration > 0)
                                                    Text(t.durationFormatted,
                                                        style: TextStyle(
                                                            fontFamily: 'DM Mono',
                                                            fontSize: 8,
                                                            color: c.muted)),
                                                ],
                                              ),
                                            ),
                                          ),
                                        );
                                      },
                                    ),

                              // ── Lyrics ──
                              track.lyrics.isEmpty
                                  ? Center(
                                      child: Text('No lyrics',
                                          style: TextStyle(color: c.muted, fontSize: 13,
                                              fontStyle: FontStyle.italic)),
                                    )
                                  : SingleChildScrollView(
                                      child: Text(
                                        track.lyrics,
                                        style: TextStyle(
                                          fontFamily: 'Syne', fontSize: 13,
                                          color: c.text, height: 1.8,
                                        ),
                                      ),
                                    ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _fmt(Duration d) {
    final m = d.inMinutes;
    final s = d.inSeconds % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}

// ── Film info card ───────────────────────────────────────

class _FilmCard extends StatelessWidget {
  final Track track;
  final DriftwaveColors c;
  const _FilmCard({required this.track, required this.c});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color:        c.surface.withOpacity(0.8),
      border:       Border.all(color: c.border),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          const Text('🎬', style: TextStyle(fontSize: 13)),
          const SizedBox(width: 6),
          Expanded(
            child: Text(track.filmName,
              style: TextStyle(fontFamily: 'DM Mono', fontSize: 9,
                  letterSpacing: 1.5, color: c.muted,
                  textBaseline: TextBaseline.alphabetic),
            ),
          ),
        ]),
        if (track.filmDirector.isNotEmpty) ...[
          const SizedBox(height: 6),
          Text('Dir. ${track.filmDirector}',
            style: TextStyle(fontSize: 12, color: c.muted2)),
        ],
        if (track.filmCast.isNotEmpty) ...[
          const SizedBox(height: 4),
          Text(track.filmCast.take(4).join(' · '),
            style: TextStyle(fontFamily: 'DM Mono', fontSize: 9,
                color: c.muted, height: 1.6)),
        ],
        if (track.imdbUrl.isNotEmpty) ...[
          const SizedBox(height: 8),
          GestureDetector(
            onTap: () async {
              final uri = Uri.parse(track.imdbUrl);
              if (await canLaunchUrl(uri)) launchUrl(uri);
            },
            child: Text('IMDb ↗',
              style: TextStyle(fontFamily: 'DM Mono', fontSize: 9,
                  letterSpacing: 1, color: c.accent,
                  decoration: TextDecoration.underline,
                  decorationColor: c.accent)),
          ),
        ],
      ],
    ),
  );
}

// ── Small helpers ────────────────────────────────────────

class _MetaRow extends StatelessWidget {
  final String icon;
  final String text;
  final DriftwaveColors c;
  const _MetaRow({required this.icon, required this.text, required this.c});

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 3),
    child: Text('$icon $text',
      style: TextStyle(fontFamily: 'DM Mono', fontSize: 9,
          letterSpacing: 1, color: c.muted)),
  );
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
      style: TextStyle(fontFamily: 'DM Mono', fontSize: 8,
          color: c.muted2, letterSpacing: 1)),
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
      child: Icon(icon,
          color: onTap != null ? color : color.withOpacity(0.4), size: 22),
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
        color:     c.accent,
        shape:     BoxShape.circle,
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

class _WaveBars extends StatefulWidget {
  final DriftwaveColors c;
  const _WaveBars({required this.c});

  @override
  State<_WaveBars> createState() => _WaveBarsState();
}

class _WaveBarsState extends State<_WaveBars> with TickerProviderStateMixin {
  late final List<AnimationController> _ctrls;

  @override
  void initState() {
    super.initState();
    _ctrls = List.generate(3, (i) {
      final c = AnimationController(
        vsync: this,
        duration: Duration(milliseconds: 500 + i * 120),
      )..repeat(reverse: true);
      return c;
    });
  }

  @override
  void dispose() {
    for (final c in _ctrls) c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    crossAxisAlignment: CrossAxisAlignment.end,
    children: List.generate(3, (i) => AnimatedBuilder(
      animation: _ctrls[i],
      builder: (_, __) => Container(
        width: 3,
        height: 6 + _ctrls[i].value * 10,
        margin: const EdgeInsets.symmetric(horizontal: 1),
        decoration: BoxDecoration(
          color:        widget.c.accent,
          borderRadius: BorderRadius.circular(2),
        ),
      ),
    )),
  );
}
