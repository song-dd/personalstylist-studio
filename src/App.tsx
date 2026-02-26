import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import './App.css'

type Measurements = {
  height: string
  weight: string
}

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

function App() {
  const [measurements, setMeasurements] = useState<Measurements>({
    height: '',
    weight: '',
  })
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState('')
  const [report, setReport] = useState('')
  const [hairImage, setHairImage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setReport('')
    setHairImage('')

    if (!measurements.height || !measurements.weight) {
      setError('키와 몸무게를 입력해 주세요.')
      return
    }

    setIsLoading(true)
    try {
      const photoDataUrl = photo ? await readFileAsDataUrl(photo) : undefined
      const response = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          height: measurements.height,
          weight: measurements.weight,
          photoDataUrl,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || '리포트 생성 실패')
      }

      setReport(data.report || '리포트를 생성했지만 내용이 비어 있습니다.')
      setHairImage(data.hairImage || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <p className="eyebrow">Personal Stylist</p>
        <h1>나만의 스타일리스트</h1>
        <p className="subtitle">
          키, 몸무게, 사진을 입력하면 당신에게 맞는 스타일 리포트를 제공합니다.
        </p>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>기본 정보 입력</h2>
          <p>정확한 추천을 위해 먼저 정보를 알려주세요.</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
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

          <button className="primary" type="submit" disabled={isLoading}>
            {isLoading ? '리포트 생성 중...' : '스타일 컨설팅 받기'}
          </button>

          {error ? <p className="error">{error}</p> : null}
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

      <section className="panel report">
        <div className="panel-header">
          <h2>스타일 컨설팅 리포트</h2>
          <p>AI가 요약한 추천 내용을 확인하세요.</p>
        </div>
        <div className="report-body">
          {report ? <pre>{report}</pre> : <p>리포트를 생성하면 여기에 표시됩니다.</p>}
        </div>
        {hairImage ? (
          <div className="hair-image">
            <h3>헤어스타일 제안 (3x3)</h3>
            <img src={hairImage} alt="추천 헤어스타일 9가지 그리드" />
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default App
