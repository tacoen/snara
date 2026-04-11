
curl "https://api.poe.com/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-poe-nGDCSOhqgzx8ZJ5HHOkUheIxD0pTFRW-85AZUNwDaos" \
  -d '{
    "model": "snarabot-clm",
    "messages": [
      {
        "role": "user",
        "content": "Hello world"
      }
    ]
  }'
