import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../themes/theme_provider.dart';
import '../features/player/player_provider.dart';
import '../features/player/mini_player.dart';

class AppShell extends ConsumerWidget {
  final StatefulNavigationShell shell;
  const AppShell({super.key, required this.shell});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c            = ref.watch(themeColorsProvider);
    final currentTrack = ref.watch(playerProvider).currentTrack;

    return Scaffold(
      backgroundColor: c.bg,
      body: Column(
        children: [
          Expanded(child: shell),
          if (currentTrack != null) const MiniPlayer(),
          NavigationBar(
            backgroundColor:  c.surface,
            indicatorColor:   c.accent.withOpacity(0.12),
            selectedIndex:    shell.currentIndex,
            onDestinationSelected: (i) => shell.goBranch(
              i,
              initialLocation: i == shell.currentIndex,
            ),
            destinations: [
              NavigationDestination(
                icon:         const Text('✨', style: TextStyle(fontSize: 20)),
                selectedIcon: Text('✨', style: TextStyle(fontSize: 20,
                    shadows: [Shadow(color: Color(0xFF38BDF8), blurRadius: 8)])),
                label: 'Drift',
              ),
              const NavigationDestination(
                icon:  Text('🎵', style: TextStyle(fontSize: 20)),
                label: 'Library',
              ),
              const NavigationDestination(
                icon:  Text('📋', style: TextStyle(fontSize: 20)),
                label: 'Playlists',
              ),
              const NavigationDestination(
                icon:  Text('⚙️', style: TextStyle(fontSize: 20)),
                label: 'Settings',
              ),
            ],
          ),
        ],
      ),
    );
  }
}
