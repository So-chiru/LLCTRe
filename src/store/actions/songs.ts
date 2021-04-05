interface SongsTypes {
  load: boolean
  items: null | LLCTSongDataV2
}

const SongsDefault: SongsTypes = {
  load: false,
  items: null
}

interface SongsReducerAction {
  id: string
  type: string
  data?: Record<string, unknown>
  error?: unknown
}

const SongsReducer = (
  state = SongsDefault,
  action: SongsReducerAction
): SongsTypes => {
  switch (action.type) {
    case '@llct/api_lists/request':
      return Object.assign({}, state, {
        load: true
      })
    case '@llct/api_lists/success':
      return Object.assign({}, state, {
        load: true,
        items: action.data
      })
    case '@llct/api_lists/failed':
      return Object.assign({}, state, {
        load: true,
        error: action.error
      })
    default:
      return state
  }
}

export default SongsReducer
