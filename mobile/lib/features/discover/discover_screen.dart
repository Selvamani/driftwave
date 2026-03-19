import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../themes/theme_provider.dart';
import '../../models/track.dart';
import '../../services/api_service.dart';
import '../player/player_provider.dart';

const _moods = [
  '🌙 Late Night', '☀️ Morning', '🌧️ Rainy',
  '🏃 Workout',    '📚 Focus',   '💔 Heartbreak',
  '🎉 Party',      '🛣️ Road Trip','🧘 Chill',
];

const _langs = ['All', 'Tamil', 'Hindi', 'Korean', 'Arabic', 'Telugu'];

final _searchProvider = StateProvider<List<Track>>((ref) => []);
final _loadingProvider = StateProvider<bool>((ref) => false);

class DiscoverScreen extends ConsumerStatefulWidget {
  const DiscoverScreen({super.key});

  @override
  ConsumerState<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends ConsumerState<DiscoverScreen> {
  final _ctrl   = TextEditingController();
  String? _chip;
  String  _lang = 'All';
  double  _energy  = 0.3;
  double  _tempo   = 0.45;
  double  _valence = 0.4;

  Future<void> _search() async {
    final q = [_ctrl.text.trim(), _chip?.replaceAll(RegExp(r'^[^ ]+ '), '') ?? '']
        .where((s) => s.isNotEmpty).join(', ');
    if (q.isEmpty) return;

    ref.read(_loadingProvider.notifier).state = true;
    try {
      final api = await ref.read(apiServiceProvider.future);
      final results = await api.search(
        prompt:     q,
        langFilter: _lang == 'All' ? null : _lang.toLowerCase(),
      );
      ref.read(_searchProvider.notifier).state = results;
    } catch (e) {
      debugPrint('Search error: $e');
    } finally {
      ref.read(_loadingProvider.notifier).state = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c       = ref.watch(themeColorsProvider);
    final tracks  = ref.watch(_searchProvider);
    final loading = ref.watch(_loadingProvider);
    final current = ref.watch(playerProvider).currentTrack;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
          children: [

            // Heading
            Text('What will you\ndrift to?',
              style: TextStyle(
                fontFamily: 'Cormorant Garamond', fontSize: 34,
                fontWeight: FontWeight.w300, color: c.text, height: 1.15,
              ),
            ),
            const SizedBox(height: 4),
            Text('DESCRIBE YOUR MOOD',
              style: TextStyle(fontFamily: 'DM Mono', fontSize: 9,
                letterSpacing: 2, color: c.muted),
            ),
            const SizedBox(height: 20),

            // Prompt bar
            Container(
              decoration: BoxDecoration(
                color:        c.surface,
                borderRadius: BorderRadius.circular(16),
                border:       Border.all(color: c.border2),
              ),
              child: Row(
                children: [
                  const Padding(
                    padding: EdgeInsets.only(left: 14),
                    child: Text('🎵', style: TextStyle(fontSize: 18)),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _ctrl,
                      onSubmitted: (_) => _search(),
                      style:     TextStyle(color: c.text, fontFamily: 'Syne', fontSize: 14),
                      decoration: InputDecoration(
                        hintText:     'melancholic AR Rahman, late night...',
                        hintStyle:    TextStyle(color: c.muted),
                        border:       InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
                      ),
                    ),
                  ),
                  GestureDetector(
                    onTap: _search,
                    child: Container(
                      margin: const EdgeInsets.all(6),
                      width: 36, height: 36,
                      decoration: BoxDecoration(
                        color:        c.accent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Center(
                        child: Text('→', style: TextStyle(
                          color: c.accentFg, fontSize: 18, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Mood chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _moods.map((mood) {
                  final active = _chip == mood;
                  return GestureDetector(
                    onTap: () => setState(() => _chip = active ? null : mood),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      decoration: BoxDecoration(
                        color:        active ? c.accent.withOpacity(0.1) : c.surface,
                        border:       Border.all(color: active ? c.accent : c.border2),
                        borderRadius: BorderRadius.circular(100),
                      ),
                      child: Text(mood, style: TextStyle(
                        fontSize: 12, fontWeight: FontWeight.w600,
                        color: active ? c.accent : c.muted2,
                      )),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 14),

            // Lang filter
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _langs.map((lang) {
                  final active = _lang == lang;
                  return GestureDetector(
                    onTap: () => setState(() => _lang = lang),
                    child: Container(
                      margin: const EdgeInsets.only(right: 6),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color:        active ? c.accent.withOpacity(0.08) : c.surface,
                        border:       Border.all(color: active ? c.accent : c.border),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(lang, style: TextStyle(
                        fontFamily: 'DM Mono', fontSize: 10,
                        letterSpacing: 1,
                        color: active ? c.accent : c.muted2,
                      )),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 16),

            // Sliders
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color:        c.card,
                border:       Border.all(color: c.border),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  _Slider('Energy',  _energy,  (v) => setState(() => _energy  = v), c),
                  const SizedBox(height: 8),
                  _Slider('Tempo',   _tempo,   (v) => setState(() => _tempo   = v), c),
                  const SizedBox(height: 8),
                  _Slider('Valence', _valence, (v) => setState(() => _valence = v), c),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Generate button
            GestureDetector(
              onTap: _search,
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [c.accent, c.accent2]),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [BoxShadow(
                    color: c.accent.withOpacity(0.25),
                    blurRadius: 20, offset: const Offset(0, 6),
                  )],
                ),
                child: Center(
                  child: Text('✨  Generate Playlist',
                    style: TextStyle(
                      fontFamily: 'Syne', fontSize: 15, fontWeight: FontWeight.w700,
                      color: c.accentFg,
                    )),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Results
            if (loading)
              Center(child: CircularProgressIndicator(color: c.accent))
            else if (tracks.isNotEmpty) ...[
              Row(
                children: [
                  Text('Generated Playlist',
                    style: TextStyle(
                      fontFamily: 'Cormorant Garamond', fontSize: 20,
                      fontWeight: FontWeight.w400, color: c.text,
                    )),
                  const Spacer(),
                  GestureDetector(
                    onTap: () => ref.read(playerProvider.notifier).playTrack(tracks.first, queue: tracks),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color:        c.accent,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text('▶ Play All',
                        style: TextStyle(fontFamily: 'DM Mono', fontSize: 9,
                          letterSpacing: 1, color: c.accentFg)),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ...tracks.asMap().entries.map((e) => _TrackRow(
                track:     e.value,
                index:     e.key,
                isPlaying: current?.filePath == e.value.filePath,
                c:         c,
                onTap:     () => ref.read(playerProvider.notifier)
                                    .playTrack(e.value, queue: tracks),
              )),
            ],
          ],
        ),
      ),
    );
  }
}

class _Slider extends StatelessWidget {
  final String label;
  final double value;
  final ValueChanged<double> onChange;
  final DriftwaveColors c;
  const _Slider(this.label, this.value, this.onChange, this.c);

  @override
  Widget build(BuildContext context) => Row(
    children: [
      SizedBox(
        width: 52,
        child: Text(label,
          style: TextStyle(fontFamily: 'DM Mono', fontSize: 8,
            letterSpacing: 1, color: c.muted2)),
      ),
      Expanded(
        child: SliderTheme(
          data: SliderTheme.of(context).copyWith(
            trackHeight: 3,
            thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
            activeTrackColor: c.accent,
            inactiveTrackColor: c.border2,
            thumbColor: Colors.white,
            overlayShape: const RoundSliderOverlayShape(overlayRadius: 12),
          ),
          child: Slider(value: value, onChanged: onChange),
        ),
      ),
      SizedBox(
        width: 28,
        child: Text('${(value * 100).round()}',
          textAlign: TextAlign.right,
          style: TextStyle(fontFamily: 'DM Mono', fontSize: 9, color: c.accent)),
      ),
    ],
  );
}

class _TrackRow extends StatelessWidget {
  final Track  track;
  final int    index;
  final bool   isPlaying;
  final DriftwaveColors c;
  final VoidCallback onTap;
  const _TrackRow({required this.track, required this.index, required this.isPlaying, required this.c, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      margin:  const EdgeInsets.only(bottom: 2),
      decoration: BoxDecoration(
        color:        isPlaying ? c.accent.withOpacity(0.06) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          SizedBox(
            width: 24,
            child: Text('${index + 1}',
              textAlign: TextAlign.right,
              style: TextStyle(fontFamily: 'DM Mono', fontSize: 10,
                color: isPlaying ? c.accent : c.muted)),
          ),
          const SizedBox(width: 10),
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              color:        c.card,
              borderRadius: BorderRadius.circular(6),
              border:       Border.all(color: c.border),
            ),
            child: const Center(child: Text('🎵', style: TextStyle(fontSize: 16))),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(track.title,
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600,
                    color: isPlaying ? c.accent : c.text),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
                Text('${track.artist} · ${track.year}',
                  style: TextStyle(fontFamily: 'DM Mono', fontSize: 9, color: c.muted),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
          const SizedBox(width: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              border: Border.all(color: c.border2),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(track.adapterType.toUpperCase(),
              style: TextStyle(fontFamily: 'DM Mono', fontSize: 7,
                letterSpacing: 1, color: c.muted2)),
          ),
        ],
      ),
    ),
  );
}
