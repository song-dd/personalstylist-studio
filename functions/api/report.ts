export const onRequestPost = async (context: {
  request: Request
  env: { OPENAI_API_KEY?: string; OPENAI_MODEL?: string }
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

    const userText = `키: ${height}cm\n몸무게: ${weight}kg\n요청: 체형에 맞는 스타일 컨설팅 리포트를 한국어로 작성해줘. 체형 특징 요약, 추천 스타일, 피해야 할 포인트, 기본 아이템 리스트, 컬러 팔레트 제안을 포함해.`

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

    return new Response(JSON.stringify({ report: text || '' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Invalid request', detail: String(error) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
