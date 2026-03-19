import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/track.dart';

const _kServerKey = 'dw_server_url';

class DriftwaveApiService {
  final Dio _dio;
  final String baseUrl;

  DriftwaveApiService(this.baseUrl)
      : _dio = Dio(BaseOptions(
          baseUrl:        baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 30),
        ));

  // ── Search ────────────────────────────────────────────

  Future<List<Track>> search({
    required String prompt,
    int limit       = 20,
    String? langFilter,
    double textWeight = 0.6,
    double clapWeight = 0.4,
  }) async {
    final r = await _dio.post('/search', data: {
      'prompt':      prompt,
      'limit':       limit,
      'lang_filter': langFilter,
      'text_weight': textWeight,
      'clap_weight': clapWeight,
    });
    final tracks = r.data['tracks'] as List;
    return tracks.map((t) => Track.fromJson(t as Map<String, dynamic>)).toList();
  }

  // ── Playlists ─────────────────────────────────────────

  Future<Map<String, dynamic>> generateAndPush({
    required String prompt,
    String? name,
    int limit = 20,
    String? langFilter,
  }) async {
    final r = await _dio.post('/playlist/generate-and-push', data: {
      'prompt':      prompt,
      'name':        name,
      'limit':       limit,
      'lang_filter': langFilter,
    });
    return r.data as Map<String, dynamic>;
  }

  Future<List<Map<String, dynamic>>> getPlaylists() async {
    final r = await _dio.get('/playlist/list');
    return List<Map<String, dynamic>>.from(r.data['playlists'] as List);
  }

  // ── Library ───────────────────────────────────────────

  Future<List<Map<String, dynamic>>> getArtists() async {
    final r = await _dio.get('/library/artists');
    return List<Map<String, dynamic>>.from(r.data['artists'] as List);
  }

  Future<Map<String, dynamic>> searchLibrary(String q) async {
    final r = await _dio.get('/library/search', queryParameters: {'q': q});
    return r.data as Map<String, dynamic>;
  }

  // ── Index ─────────────────────────────────────────────

  Future<Map<String, dynamic>> getIndexStatus() async {
    final r = await _dio.get('/index/status');
    return r.data as Map<String, dynamic>;
  }

  // ── Auth ──────────────────────────────────────────────

  Future<String> login(String username, String password) async {
    final r = await _dio.post('/auth/token', data: {
      'username': username,
      'password': password,
    });
    return r.data['access_token'] as String;
  }
}

// ── Provider ──────────────────────────────────────────

final apiServiceProvider = FutureProvider<DriftwaveApiService>((ref) async {
  final prefs     = await SharedPreferences.getInstance();
  final serverUrl = prefs.getString(_kServerKey) ?? 'http://localhost:8000';
  return DriftwaveApiService(serverUrl);
});
