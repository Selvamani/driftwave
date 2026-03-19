import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../themes/theme_provider.dart';
import '../../services/api_service.dart';

const _emojis = ['🌊','☀️','🌙','🌸','🌿','🔥','💫','🎸','🎷','🌧️'];

class PlaylistsScreen extends ConsumerWidget {
  const PlaylistsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c         = ref.watch(themeColorsProvider);
    final playlists = ref.watch(_playlistsProvider);

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
          children: [
            Text.rich(TextSpan(children: [
              TextSpan(text: 'Your ', style: TextStyle(
                fontFamily: 'Cormorant Garamond', fontSize: 32,
                fontWeight: FontWeight.w300, color: c.text)),
              TextSpan(text: 'Playlists', style: TextStyle(
                fontFamily: 'Cormorant Garamond', fontSize: 32,
                fontWeight: FontWeight.w300, fontStyle: FontStyle.italic,
                color: c.accent)),
            ])),
            const SizedBox(height: 20),
            playlists.when(
              loading: () => Center(child: CircularProgressIndicator(color: c.accent)),
              error:   (e, _) => Text('Error: $e', style: TextStyle(color: c.error)),
              data: (list) => Column(
                children: [
                  ...list.asMap().entries.map((e) => Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color:        c.card,
                      border:       Border.all(color: c.border),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      children: [
                        Text(_emojis[e.key % _emojis.length],
                          style: const TextStyle(fontSize: 28)),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(e.value['name'] ?? '—',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: c.text),
                                maxLines: 1, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 3),
                              Text('${e.value['songCount'] ?? '—'} songs',
                                style: TextStyle(fontFamily: 'DM Mono', fontSize: 9, color: c.muted)),
                            ],
                          ),
                        ),
                        Icon(Icons.chevron_right, color: c.muted, size: 20),
                      ],
                    ),
                  )),
                  // Add new
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color:        c.surface,
                      border:       Border.all(color: c.border2, style: BorderStyle.solid),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add, color: c.muted, size: 20),
                        const SizedBox(width: 8),
                        Text('New Drift',
                          style: TextStyle(fontFamily: 'DM Mono', fontSize: 11,
                            letterSpacing: 1, color: c.muted)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final _playlistsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = await ref.read(apiServiceProvider.future);
  return api.getPlaylists();
});
