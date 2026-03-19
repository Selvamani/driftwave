import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'app/router.dart';
import 'themes/theme_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: DriftwaveApp()));
}

class DriftwaveApp extends ConsumerWidget {
  const DriftwaveApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme  = ref.watch(flutterThemeProvider);
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title:         'Driftwave',
      theme:         theme,
      routerConfig:  router,
      debugShowCheckedModeBanner: false,
    );
  }
}
