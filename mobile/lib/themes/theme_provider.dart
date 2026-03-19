import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app_theme.dart';
export 'app_theme.dart';

const _kThemeKey = 'dw_theme';

class ThemeNotifier extends Notifier<DriftwaveTheme> {
  @override
  DriftwaveTheme build() {
    _loadSaved();
    return DriftwaveTheme.ocean;
  }

  Future<void> _loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    final saved  = prefs.getString(_kThemeKey);
    if (saved != null) {
      final theme = DriftwaveTheme.values.firstWhere(
        (t) => t.id == saved,
        orElse: () => DriftwaveTheme.ocean,
      );
      state = theme;
    }
  }

  Future<void> setTheme(DriftwaveTheme theme) async {
    state = theme;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kThemeKey, theme.id);
  }
}

final themeProvider = NotifierProvider<ThemeNotifier, DriftwaveTheme>(
  ThemeNotifier.new,
);

final flutterThemeProvider = Provider<dynamic>((ref) {
  final theme = ref.watch(themeProvider);
  return buildFlutterTheme(theme);
});

final themeColorsProvider = Provider<DriftwaveColors>((ref) {
  final theme = ref.watch(themeProvider);
  return themeColors[theme]!;
});
