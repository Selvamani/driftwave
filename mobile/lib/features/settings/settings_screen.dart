import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../themes/theme_provider.dart';
import '../../services/api_service.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final _apiCtrl      = TextEditingController();
  final _naviCtrl     = TextEditingController();
  final _userCtrl     = TextEditingController();
  final _passCtrl     = TextEditingController();
  bool  _loading      = false;
  bool  _saved        = false;

  @override
  void initState() {
    super.initState();
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _apiCtrl.text  = prefs.getString(kServerKey)    ?? 'http://192.168.1.x:8000';
      _naviCtrl.text = prefs.getString(kNavidromeKey) ?? 'http://192.168.1.x:4533';
      _userCtrl.text = prefs.getString('dw_username') ?? 'admin';
    });
  }

  Future<void> _save() async {
    setState(() { _loading = true; _saved = false; });
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(kServerKey,    _apiCtrl.text.trim());
      await prefs.setString(kNavidromeKey, _naviCtrl.text.trim());
      await prefs.setString('dw_username', _userCtrl.text.trim());
      if (_passCtrl.text.isNotEmpty) {
        await prefs.setString('dw_password', _passCtrl.text);
      }
      setState(() { _saved = true; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  void dispose() {
    _apiCtrl.dispose();
    _naviCtrl.dispose();
    _userCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c     = ref.watch(themeColorsProvider);
    final theme = ref.watch(themeProvider);

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Text('Settings',
                style: TextStyle(
                  fontFamily: 'Cormorant Garamond', fontSize: 32,
                  fontWeight: FontWeight.w300, color: c.text,
                ),
              ),
              const SizedBox(height: 4),
              Text('SERVER & APPEARANCE',
                style: TextStyle(fontFamily: 'DM Mono', fontSize: 8,
                    letterSpacing: 3, color: c.muted)),

              const SizedBox(height: 32),

              // ── Server ────────────────────────────────────
              _SectionHeader('Backend API', c),
              const SizedBox(height: 10),
              _Field('Driftwave API URL', _apiCtrl, c,
                  hint: 'http://192.168.1.x:8000'),
              const SizedBox(height: 12),

              _SectionHeader('Navidrome', c),
              const SizedBox(height: 10),
              _Field('Navidrome URL', _naviCtrl, c,
                  hint: 'http://192.168.1.x:4533'),
              const SizedBox(height: 12),

              _SectionHeader('Credentials', c),
              const SizedBox(height: 10),
              _Field('Username', _userCtrl, c, hint: 'admin'),
              const SizedBox(height: 12),
              _Field('Password', _passCtrl, c,
                  hint: 'leave blank to keep existing', obscure: true),

              const SizedBox(height: 28),

              // ── Theme ─────────────────────────────────────
              _SectionHeader('Theme', c),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: DriftwaveTheme.values.map((t) {
                  final isSelected = t == theme;
                  return GestureDetector(
                    onTap: () => ref.read(themeProvider.notifier).setTheme(t),
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        border: Border.all(
                          color: isSelected ? c.accent : c.border2,
                          width: isSelected ? 1.5 : 1,
                        ),
                        borderRadius: BorderRadius.circular(10),
                        color: isSelected
                            ? c.accent.withOpacity(0.08)
                            : c.surface,
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Color dots
                          ...t.previewColors.map((col) => Container(
                            width: 10, height: 10,
                            margin: const EdgeInsets.only(right: 4),
                            decoration: BoxDecoration(
                              color:  col,
                              shape:  BoxShape.circle,
                            ),
                          )),
                          const SizedBox(width: 6),
                          Text(t.displayName,
                            style: TextStyle(
                              fontFamily: 'Syne', fontSize: 13,
                              fontWeight: isSelected
                                  ? FontWeight.w700
                                  : FontWeight.w400,
                              color: isSelected ? c.accent : c.muted2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),

              const SizedBox(height: 36),

              // ── Save button ───────────────────────────────
              GestureDetector(
                onTap: _loading ? null : _save,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [c.accent, c.accent2]),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Center(
                    child: _loading
                        ? SizedBox(
                            width: 20, height: 20,
                            child: CircularProgressIndicator(
                                color: c.accentFg, strokeWidth: 2))
                        : Text(_saved ? 'Saved ✓' : 'Save Settings',
                            style: TextStyle(
                              fontFamily: 'Syne', fontSize: 16,
                              fontWeight: FontWeight.w700,
                              color: c.accentFg,
                            )),
                  ),
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String text;
  final DriftwaveColors c;
  const _SectionHeader(this.text, this.c);

  @override
  Widget build(BuildContext context) => Text(text.toUpperCase(),
    style: TextStyle(fontFamily: 'DM Mono', fontSize: 8,
        letterSpacing: 2.5, color: c.muted));
}

class _Field extends StatelessWidget {
  final String label;
  final TextEditingController ctrl;
  final DriftwaveColors c;
  final String hint;
  final bool obscure;
  const _Field(this.label, this.ctrl, this.c,
      {this.hint = '', this.obscure = false});

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label.toUpperCase(),
        style: TextStyle(fontFamily: 'DM Mono', fontSize: 8,
            letterSpacing: 2, color: c.muted)),
      const SizedBox(height: 6),
      Container(
        decoration: BoxDecoration(
          color:        c.surface,
          border:       Border.all(color: c.border2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: TextField(
          controller:  ctrl,
          obscureText: obscure,
          style:       TextStyle(color: c.text, fontFamily: 'Syne', fontSize: 14),
          decoration: InputDecoration(
            hintText:    hint,
            hintStyle:   TextStyle(color: c.muted),
            border:      InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding: const EdgeInsets.all(14),
          ),
        ),
      ),
    ],
  );
}
