import 'package:flutter/material.dart';

/// Driftwave theme IDs — must match web theme IDs
enum DriftwaveTheme { ocean, aurora, sunset, midnight, sakura, paper }

extension DriftwaveThemeExt on DriftwaveTheme {
  String get id => name;
  String get displayName => switch (this) {
    DriftwaveTheme.ocean    => 'Ocean',
    DriftwaveTheme.aurora   => 'Aurora',
    DriftwaveTheme.sunset   => 'Sunset',
    DriftwaveTheme.midnight => 'Midnight',
    DriftwaveTheme.sakura   => 'Sakura',
    DriftwaveTheme.paper    => 'Paper',
  };
  List<Color> get previewColors => switch (this) {
    DriftwaveTheme.ocean    => [const Color(0xFF38BDF8), const Color(0xFF818CF8)],
    DriftwaveTheme.aurora   => [const Color(0xFF34D399), const Color(0xFF6EE7B7)],
    DriftwaveTheme.sunset   => [const Color(0xFFFB923C), const Color(0xFFFBBF24)],
    DriftwaveTheme.midnight => [const Color(0xFFA78BFA), const Color(0xFFC4B5FD)],
    DriftwaveTheme.sakura   => [const Color(0xFFE11D6A), const Color(0xFFF43F8E)],
    DriftwaveTheme.paper    => [const Color(0xFFC2410C), const Color(0xFFEA580C)],
  };
}

class DriftwaveColors {
  final Color bg;
  final Color surface;
  final Color card;
  final Color border;
  final Color border2;
  final Color text;
  final Color muted;
  final Color muted2;
  final Color accent;
  final Color accent2;
  final Color accentFg;
  final Color positive;
  final Color warning;
  final Color error;

  const DriftwaveColors({
    required this.bg,
    required this.surface,
    required this.card,
    required this.border,
    required this.border2,
    required this.text,
    required this.muted,
    required this.muted2,
    required this.accent,
    required this.accent2,
    required this.accentFg,
    this.positive = const Color(0xFF34D399),
    this.warning  = const Color(0xFFFBBF24),
    this.error    = const Color(0xFFF87171),
  });
}

final Map<DriftwaveTheme, DriftwaveColors> themeColors = {
  DriftwaveTheme.ocean: const DriftwaveColors(
    bg:       Color(0xFF080A0E),
    surface:  Color(0xFF0D1117),
    card:     Color(0xFF111722),
    border:   Color(0xFF1C2535),
    border2:  Color(0xFF243045),
    text:     Color(0xFFE8EDF5),
    muted:    Color(0xFF4A5568),
    muted2:   Color(0xFF6B7A94),
    accent:   Color(0xFF38BDF8),
    accent2:  Color(0xFF818CF8),
    accentFg: Color(0xFF000000),
  ),
  DriftwaveTheme.aurora: const DriftwaveColors(
    bg:       Color(0xFF060D0A),
    surface:  Color(0xFF0A1410),
    card:     Color(0xFF0F1E17),
    border:   Color(0xFF1A2E22),
    border2:  Color(0xFF22402E),
    text:     Color(0xFFE4F0EB),
    muted:    Color(0xFF3D5248),
    muted2:   Color(0xFF5E7A6A),
    accent:   Color(0xFF34D399),
    accent2:  Color(0xFF6EE7B7),
    accentFg: Color(0xFF000000),
  ),
  DriftwaveTheme.sunset: const DriftwaveColors(
    bg:       Color(0xFF0E0805),
    surface:  Color(0xFF160E08),
    card:     Color(0xFF1E1208),
    border:   Color(0xFF2E1C0E),
    border2:  Color(0xFF3E2614),
    text:     Color(0xFFF5EDE4),
    muted:    Color(0xFF5C3E28),
    muted2:   Color(0xFF8A6040),
    accent:   Color(0xFFFB923C),
    accent2:  Color(0xFFFBBF24),
    accentFg: Color(0xFF000000),
  ),
  DriftwaveTheme.midnight: const DriftwaveColors(
    bg:       Color(0xFF000000),
    surface:  Color(0xFF080808),
    card:     Color(0xFF0F0F0F),
    border:   Color(0xFF1A1A1A),
    border2:  Color(0xFF252525),
    text:     Color(0xFFF0F0F5),
    muted:    Color(0xFF404040),
    muted2:   Color(0xFF606060),
    accent:   Color(0xFFA78BFA),
    accent2:  Color(0xFFC4B5FD),
    accentFg: Color(0xFF000000),
  ),
  DriftwaveTheme.sakura: const DriftwaveColors(
    bg:       Color(0xFFFDF6F8),
    surface:  Color(0xFFFFF0F3),
    card:     Color(0xFFFFFFFF),
    border:   Color(0xFFF5D0D8),
    border2:  Color(0xFFF0B8C4),
    text:     Color(0xFF2D1820),
    muted:    Color(0xFFC4869A),
    muted2:   Color(0xFFA06478),
    accent:   Color(0xFFE11D6A),
    accent2:  Color(0xFFF43F8E),
    accentFg: Color(0xFFFFFFFF),
  ),
  DriftwaveTheme.paper: const DriftwaveColors(
    bg:       Color(0xFFF7F4EF),
    surface:  Color(0xFFEDE9E2),
    card:     Color(0xFFFFFFFF),
    border:   Color(0xFFDDD8CF),
    border2:  Color(0xFFCCC6BA),
    text:     Color(0xFF1A1815),
    muted:    Color(0xFF9A9288),
    muted2:   Color(0xFF7A7268),
    accent:   Color(0xFFC2410C),
    accent2:  Color(0xFFEA580C),
    accentFg: Color(0xFFFFFFFF),
  ),
};

ThemeData buildFlutterTheme(DriftwaveTheme theme) {
  final c = themeColors[theme]!;
  final isDark = theme != DriftwaveTheme.sakura && theme != DriftwaveTheme.paper;

  return ThemeData(
    brightness:       isDark ? Brightness.dark : Brightness.light,
    scaffoldBackgroundColor: c.bg,
    colorScheme: ColorScheme(
      brightness:   isDark ? Brightness.dark : Brightness.light,
      primary:      c.accent,
      onPrimary:    c.accentFg,
      secondary:    c.accent2,
      onSecondary:  c.accentFg,
      surface:      c.surface,
      onSurface:    c.text,
      error:        c.error,
      onError:      Colors.white,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: c.surface,
      foregroundColor: c.text,
      elevation:       0,
      centerTitle:     false,
      titleTextStyle: TextStyle(
        fontFamily: 'Syne', fontSize: 18,
        fontWeight: FontWeight.w700, color: c.text,
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor:     c.surface,
      indicatorColor:      c.accent.withOpacity(0.15),
      labelTextStyle:      WidgetStatePropertyAll(
        TextStyle(fontFamily: 'DM Mono', fontSize: 9, letterSpacing: 1),
      ),
    ),
    cardTheme: CardThemeData(
      color:        c.card,
      elevation:    0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: c.border),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled:           true,
      fillColor:        c.surface,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: c.border2),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: c.border2),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: c.accent, width: 2),
      ),
      hintStyle: TextStyle(color: c.muted, fontFamily: 'Syne'),
    ),
    useMaterial3: true,
  );
}
