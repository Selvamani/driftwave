import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../themes/theme_provider.dart';
import '../../services/api_service.dart';

class LibraryScreen extends ConsumerWidget {
  const LibraryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = ref.watch(themeColorsProvider);
    final artists = ref.watch(_artistsProvider);

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
          children: [
            Text('Your Library',
              style: TextStyle(fontFamily: 'Cormorant Garamond', fontSize: 32,
                fontWeight: FontWeight.w300, color: c.text)),
            Text.rich(TextSpan(children: [
              TextSpan(text: 'Your ', style: TextStyle(
                fontFamily: 'Cormorant Garamond', fontSize: 32,
                fontWeight: FontWeight.w300, color: c.text)),
              TextSpan(text: 'Library', style: TextStyle(
                fontFamily: 'Cormorant Garamond', fontSize: 32,
                fontWeight: FontWeight.w300, fontStyle: FontStyle.italic,
                color: c.accent)),
            ])),
            const SizedBox(height: 20),

            // Search
            Container(
              decoration: BoxDecoration(
                color:        c.surface,
                border:       Border.all(color: c.border2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: TextField(
                style:     TextStyle(color: c.text, fontFamily: 'Syne', fontSize: 14),
                decoration: InputDecoration(
                  hintText:   'Search artists, albums...',
                  hintStyle:  TextStyle(color: c.muted),
                  prefixIcon: Icon(Icons.search, color: c.muted, size: 20),
                  border:     InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Artists section label
            Text('ARTISTS',
              style: TextStyle(fontFamily: 'DM Mono', fontSize: 8,
                letterSpacing: 3, color: c.muted)),
            const SizedBox(height: 12),

            // Artists grid
            artists.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error:   (e, _) => Text('Error: $e', style: TextStyle(color: c.error)),
              data: (list) => GridView.builder(
                shrinkWrap: true,
                physics:    const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2, crossAxisSpacing: 12,
                  mainAxisSpacing: 12, childAspectRatio: 1.1,
                ),
                itemCount: list.length,
                itemBuilder: (ctx, i) {
                  final artist = list[i];
                  return Container(
                    decoration: BoxDecoration(
                      color:        c.card,
                      border:       Border.all(color: c.border),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Column(
                      children: [
                        Expanded(
                          child: Container(
                            decoration: BoxDecoration(
                              color:        c.surface,
                              borderRadius: const BorderRadius.vertical(top: Radius.circular(13)),
                            ),
                            child: const Center(child: Text('🎵', style: TextStyle(fontSize: 42))),
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsets.all(10),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(artist['name'] ?? '—',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: c.text),
                                maxLines: 1, overflow: TextOverflow.ellipsis),
                              Text('${artist['albumCount'] ?? '—'} albums',
                                style: TextStyle(fontFamily: 'DM Mono', fontSize: 9, color: c.muted)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final _artistsProvider = FutureProvider<List<Map<String, dynamic>>>((ref) async {
  final api = await ref.read(apiServiceProvider.future);
  return api.getArtists();
});
