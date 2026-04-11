

curl "https://api.groq.com/openai/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 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" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {
        "role": "user",
        "content": "Hello world"
      }
    ]
  }'