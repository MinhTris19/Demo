async function askAi(question) {
  const message = (question || '').toString().trim();
  if (!message) {
    throw new Error('Vui lòng nhập câu hỏi');
  }

  const token = getAuthToken();
  const response = await fetch('/api/ai/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ question: message })
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Lỗi khi gọi AI');
  }

  return data;
}
