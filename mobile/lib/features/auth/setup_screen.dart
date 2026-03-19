import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../themes/theme_provider.dart';

class SetupScreen extends ConsumerStatefulWidget {
  const SetupScreen({super.key});

  @override
  ConsumerState<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends ConsumerState<SetupScreen> {
  final _serverCtrl = TextEditingController(text: 'http://192.168.1.x:8000');
  final _userCtrl   = TextEditingController(text: 'admin');
  final _passCtrl   = TextEditingController();
  bool  _loading    = false;
  String? _error;

  Future<void> _connect() async {
    setState(() { _loading = true; _error = null; });
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('dw_server_url', _serverCtrl.text.trim());
      await prefs.setString('dw_username',   _userCtrl.text.trim());
      if (mounted) context.go('/discover');
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = ref.watch(themeColorsProvider);

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Spacer(),

              // Logo
              Container(
                width: 52, height: 52,
                decoration: BoxDecoration(
                  gradient: LinearGradient(colors: [c.accent, c.accent2]),
                  borderRadius: BorderRadius.circular(14),
                  boxShadow: [BoxShadow(
                    color: c.accent.withOpacity(0.3),
                    blurRadius: 20, offset: const Offset(0, 6),
                  )],
                ),
                child: const Center(child: Text('〜', style: TextStyle(fontSize: 22))),
              ),
              const SizedBox(height: 20),
              Text('Driftwave',
                style: TextStyle(fontFamily: 'Cormorant Garamond', fontSize: 36,
                  fontWeight: FontWeight.w600, color: c.text)),
              const SizedBox(height: 6),
              Text('CONNECT TO YOUR SERVER',
                style: TextStyle(fontFamily: 'DM Mono', fontSize: 9,
                  letterSpacing: 3, color: c.muted)),

              const Spacer(),

              // Fields
              _Field('Server URL', _serverCtrl, c, hint: 'http://192.168.1.x:8000'),
              const SizedBox(height: 12),
              _Field('Username', _userCtrl, c, hint: 'admin'),
              const SizedBox(height: 12),
              _Field('Password', _passCtrl, c, hint: '••••••••', obscure: true),

              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!, style: TextStyle(color: c.error, fontFamily: 'DM Mono', fontSize: 11)),
              ],

              const SizedBox(height: 24),

              // Connect button
              GestureDetector(
                onTap: _loading ? null : _connect,
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
                            child: CircularProgressIndicator(color: c.accentFg, strokeWidth: 2))
                        : Text('Connect →',
                            style: TextStyle(fontFamily: 'Syne', fontSize: 16,
                              fontWeight: FontWeight.w700, color: c.accentFg)),
                  ),
                ),
              ),
              const Spacer(),
            ],
          ),
        ),
      ),
    );
  }
}

class _Field extends StatelessWidget {
  final String label;
  final TextEditingController ctrl;
  final DriftwaveColors c;
  final String hint;
  final bool obscure;
  const _Field(this.label, this.ctrl, this.c, {this.hint = '', this.obscure = false});

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
          controller:   ctrl,
          obscureText:  obscure,
          style:        TextStyle(color: c.text, fontFamily: 'Syne', fontSize: 14),
          decoration: InputDecoration(
            hintText:   hint,
            hintStyle:  TextStyle(color: c.muted),
            border:     InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            contentPadding: const EdgeInsets.all(14),
          ),
        ),
      ),
    ],
  );
}
