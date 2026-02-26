type Env = {
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  OPENAI_IMAGE_MODEL?: string
}

const HAIR_SPLIT_MARKER = '---HAIR_RECOMMENDATIONS---'

const dataUrlToBlob = (dataUrl: string) => {
  const [meta, base64] = dataUrl.split(',')
  if (!meta || !base64) {
    throw new Error('Invalid image data URL')
  }

  const mimeMatch = meta.match(/data:(.*);base64/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return new Blob([bytes], { type: mimeType })
}

export const onRequestPost = async (context: {
  request: Request
  env: Env
}) => {
  try {
    const { height, weight, photoDataUrl } = await context.request.json<{
      height?: string
      weight?: string
      photoDataUrl?: string
    }>()

    if (!context.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing OPENAI_API_KEY' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!height || !weight) {
      return new Response(
        JSON.stringify({ error: 'height and weight are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const userText = `키: ${height}cm\n몸무게: ${weight}kg\n요청: 체형에 맞는 스타일 컨설팅 리포트를 한국어로 작성해줘. 체형 특징 요약, 추천 스타일, 피해야 할 포인트, 기본 아이템 리스트, 컬러 팔레트 제안을 포함해.\n마지막에는 반드시 아래 구분자를 그대로 출력하고, 그 아래에 헤어스타일 추천 9가지를 한 줄씩 작성해줘.\n${HAIR_SPLIT_MARKER}\n-`

    const content: Array<{ type: 'input_text' | 'input_image'; text?: string; image_url?: string }> = [
      { type: 'input_text', text: userText },
    ]

    if (photoDataUrl) {
      content.push({ type: 'input_image', image_url: photoDataUrl })
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: context.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              '너는 퍼스널 스타일리스트다. 사용자의 체형과 사진이 있으면 참고해 맞춤 컨설팅을 제공한다. 과장 없이 실용적으로 답한다.',
          },
          {
            role: 'user',
            content,
          },
        ],
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      return new Response(
        JSON.stringify({ error: 'OpenAI error', detail: errorText }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const data = await openaiResponse.json()
    const text = (data.output ?? [])
      .flatMap((item: { content?: Array<{ type: string; text?: string }> }) => item.content ?? [])
      .filter((part: { type: string }) => part.type === 'output_text')
      .map((part: { text?: string }) => part.text ?? '')
      .join('\n')
      .trim()

    const [reportText, hairTextRaw] = text.split(HAIR_SPLIT_MARKER)
    const report = (reportText ?? '').trim()
    const hairText = (hairTextRaw ?? '').trim()

    let hairImageDataUrl = ''
    if (photoDataUrl) {
      const form = new FormData()
      form.append('model', context.env.OPENAI_IMAGE_MODEL ?? 'gpt-image-1.5')
      form.append(
        'prompt',
        '너는 최고의 헤어스타일리스트야. 3x3 그리드로, 각 칸에 어떤 헤어스타일인지 짧은 라벨을 포함해. 첨부한 사진 속 사람의 얼굴은 절대 바꾸지 말고 기존 얼굴 그대로 유지하고 헤어스타일만 바꿔. 얼굴형/이목구비/피부톤/조명/배경은 최대한 유지해.'
      )
      form.append('image', dataUrlToBlob(photoDataUrl), 'photo.png')
      form.append('input_fidelity', 'high')
      form.append('size', '1024x1024')
      form.append('quality', 'auto')
      form.append('background', 'auto')
      form.append('n', '1')

      const imageResponse = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${context.env.OPENAI_API_KEY}`,
        },
        body: form,
      })

      if (imageResponse.ok) {
        const imageData = await imageResponse.json()
        const b64 = imageData?.data?.[0]?.b64_json
        if (b64) {
          hairImageDataUrl = `data:image/png;base64,${b64}`
        }
      }
    }

    return new Response(
      JSON.stringify({
        report: report || text || '',
        hairText,
        hairImage: hairImageDataUrl,
      }),
      {
      headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', detail: String(error) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
