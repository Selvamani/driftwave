import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../features/auth/setup_screen.dart';
import '../features/discover/discover_screen.dart';
import '../features/library/library_screen.dart';
import '../features/player/player_screen.dart';
import '../features/playlists/playlists_screen.dart';
import '../features/settings/settings_screen.dart';
import 'shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/discover',
    routes: [
      GoRoute(
        path:    '/setup',
        builder: (ctx, state) => const SetupScreen(),
      ),
      StatefulShellRoute.indexedStack(
        builder: (ctx, state, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(
              path:    '/discover',
              builder: (ctx, state) => const DiscoverScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path:    '/library',
              builder: (ctx, state) => const LibraryScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path:    '/playlists',
              builder: (ctx, state) => const PlaylistsScreen(),
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path:    '/settings',
              builder: (ctx, state) => const SettingsScreen(),
            ),
          ]),
        ],
      ),
      GoRoute(
        path:    '/player',
        builder: (ctx, state) => const PlayerScreen(),
      ),
    ],
  );
});
