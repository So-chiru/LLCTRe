// TODO : 노래 목록 정리
interface LLCTSongDataV1 {
  [index: string]: unknown
}

interface MusicGroupMetadata {
  id: string
  name: string
  artists: string[]
  color: string
}

interface LLCTSongDataV2 {
  groups?: MusicGroupMetadata[]
  songs?: MusicMetadata[][]
}

interface MusicMetadata {
  title: string
  'title.ko'?: string
  artist: string | ArtistGroup
  image: string
}
