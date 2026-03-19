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
  );

  String get durationFormatted {
    final m = duration ~/ 60;
    final s = duration % 60;
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  String get composer => culturalMeta['composer'] as String? ?? '';
  String get filmName  => culturalMeta['film_name'] as String? ?? '';
  String get tamileGenre => culturalMeta['tamil_genre'] as String? ?? '';
}
