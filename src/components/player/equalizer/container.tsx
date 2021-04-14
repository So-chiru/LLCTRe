import EqualizerComponent from './component'

interface EqualizerContainerProps {
  supportEffects: boolean
}

const EqualizerContainer = ({ supportEffects }: EqualizerContainerProps) => {
  if (!supportEffects) {
    return (
      <div className='no-eq-support'>
        현재 선택된 오디오 스택은 음향 효과를 지원하지 않습니다.
      </div>
    )
  }

  return <EqualizerComponent effects={supportEffects}></EqualizerComponent>
}

export default EqualizerContainer