class Track {
  final String filePath;
  final String subsonicId;
  final String mbid;
  final String title;
  final String artist;
  final String album;
  final String year;
  final String genre;
  final int    duration;
  final double tempo;
  final double energy;
  final double valence;
  final String key;
  final String adapterType;
  final String language;
  final String description;
  final String lyrics;
  final Map<String, dynamic> culturalMeta;
  final double score;
  final String coverUrl;

  const Track({
    required this.filePath,
    this.subsonicId  = '',
    this.mbid        = '',
    required this.title,
    this.artist      = '',
    this.album       = '',
    this.year        = '',
    this.genre       = '',
    this.duration    = 0,
    this.tempo       = 0,
    this.energy      = 0,
    this.valence     = 0,
    this.key         = '',
    this.adapterType = 'default',
    this.language    = 'en',
    this.description = '',
    this.lyrics      = '',
    this.culturalMeta = const {},
    this.score       = 0,
    this.coverUrl    = '',
  });

  factory Track.fromJson(Map<String, dynamic> j) => Track(
    filePath:     j['file_path']    ?? '',
    subsonicId:   j['subsonic_id']  ?? '',
    mbid:         j['mbid']         ?? '',
    title:        j['title']        ?? 'Unknown',
    artist:       j['artist']       ?? '',
    album:        j['album']        ?? '',
    year:         j['year']         ?? '',
    genre:        j['genre']        ?? '',
    duration:     (j['duration']    ?? 0).toInt(),
    tempo:        (j['tempo']       ?? 0).toDouble(),
    energy:       (j['energy']      ?? 0).toDouble(),
    valence:      (j['valence']     ?? 0).toDouble(),
    key:          j['key']          ?? '',
    adapterType:  j['adapter_type'] ?? 'default',
    language:     j['language']     ?? 'en',
    description:  j['description']  ?? '',
    lyrics:       j['lyrics']       ?? '',
    culturalMeta: Map<String, dynamic>.from(j['cultural_meta'] ?? {}),
    score:        (j['score']       ?? 0).toDouble(),
    coverUrl:     j['cover_url']    ?? '',
  );

  Track copyWith({
    String? adapterType,
    double? tempo,
    double? energy,
    double? valence,
    Map<String, dynamic>? culturalMeta,
    String? coverUrl,
  }) => Track(
    filePath:     filePath,
    subsonicId:   subsonicId,
    mbid:         mbid,
    title:        title,
    artist:       artist,
    album:        album,
    year:         year,
    genre:        genre,
    duration:     duration,
    tempo:        tempo       ?? this.tempo,
    energy:       energy      ?? this.energy,
    valence:      valence     ?? this.valence,
    key:          key,
    adapterType:  adapterType ?? this.adapterType,
    language:     language,
    description:  description,
    lyrics:       lyrics,
    culturalMeta: culturalMeta ?? this.culturalMeta,
    score:        score,
    coverUrl:     coverUrl    ?? this.coverUrl,
  );

  String get durationFormatted {
    final m = duration ~/ 60;
    final s = duration % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  // cultural_meta convenience getters
  String get composer    => culturalMeta['composer']    as String? ?? '';
  String get lyricist    => culturalMeta['lyricist']    as String? ?? '';
  String get filmName    => culturalMeta['film_name']   as String? ?? '';
  String get tamileGenre => culturalMeta['tamil_genre'] as String? ?? '';

  Map<String, dynamic> get filmMeta =>
      (culturalMeta['film_meta'] as Map?)?.cast<String, dynamic>() ?? {};

  String       get filmDirector => filmMeta['director'] as String? ?? '';
  List<String> get filmCast     =>
      (filmMeta['cast'] as List?)?.map((e) => e.toString()).toList() ?? [];
  String       get imdbUrl      => filmMeta['imdb_url'] as String? ?? '';
}
