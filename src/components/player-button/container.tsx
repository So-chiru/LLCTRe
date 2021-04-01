import { RootState } from '@/store'
import { useSelector } from 'react-redux'

import PlayerButtonComponent from './component'

const PlayerButtonContainer = () => {
  const playing = useSelector((state: RootState) => state.playing)

  // TODO : pass what is playing to PlayerButtonComponent

  // TODO : change hardcoded music argument to playing data

  return (
    <PlayerButtonComponent
      music={{
        title: 'testMusic',
        artist: '아티스트',
        image: `https://picsum.photos/seed/${Math.random() * 10000}/200`
      }}
    ></PlayerButtonComponent>
  )
}

export default PlayerButtonContainer
