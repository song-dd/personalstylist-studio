import { useEffect, useState, type ChangeEvent } from 'react'
import './App.css'

type Measurements = {
  height: string
  weight: string
}

function App() {
  const [measurements, setMeasurements] = useState<Measurements>({
    height: '',
    weight: '',
  })
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')

  useEffect(() => {
    if (!photo) {
      setPhotoUrl('')
      return
    }

    const url = URL.createObjectURL(photo)
    setPhotoUrl(url)

    return () => URL.revokeObjectURL(url)
  }, [photo])

  const handleMeasurementChange = (field: keyof Measurements) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setMeasurements((prev) => ({
        ...prev,
        [field]: event.target.value,
      }))
    }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setPhoto(file)
  }

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Personal Stylist</p>
        <h1>나만의 스타일리스트</h1>
        <p className="subtitle">
          키, 몸무게, 사진을 입력하면 당신에게 맞는 스타일을 준비합니다.
        </p>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>기본 정보 입력</h2>
          <p>정확한 추천을 위해 먼저 정보를 알려주세요.</p>
        </div>

        <form className="form" onSubmit={(e) => e.preventDefault()}>
          <label className="field">
            <span>키 (cm)</span>
            <input
              type="number"
              inputMode="numeric"
              min="120"
              max="230"
              placeholder="예: 170"
              value={measurements.height}
              onChange={handleMeasurementChange('height')}
            />
          </label>

          <label className="field">
            <span>몸무게 (kg)</span>
            <input
              type="number"
              inputMode="numeric"
              min="30"
              max="200"
              placeholder="예: 60"
              value={measurements.weight}
              onChange={handleMeasurementChange('weight')}
            />
          </label>

          <label className="field file-field">
            <span>본인 사진</span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
            />
            <small>정면 전신 사진을 추천해요.</small>
          </label>
        </form>

        <div className="preview">
          {photoUrl ? (
            <img src={photoUrl} alt="업로드한 사진 미리보기" />
          ) : (
            <div className="placeholder">
              <span>사진 미리보기</span>
              <p>이미지를 업로드하면 여기에서 확인할 수 있어요.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default App
