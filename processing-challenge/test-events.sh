echo "Testando API de eventos..."

# Função para enviar evento
send_event() {
  local user_id=$1
  local event_type=$2
  local session_id=$3

  curl -X POST http://localhost:3000/events \
    -H "Content-Type: application/json" \
    -d "{
      \"userId\": \"$user_id\",
      \"eventType\": \"$event_type\",
      \"eventData\": {
        \"product\": \"produto-$RANDOM\",
        \"category\": \"categoria-exemplo\",
        \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\"
      },
      \"sessionId\": \"$session_id\"
    }"
  echo ""
}

# Enviar múltiplos eventos para testar o lote
for i in {1..49}; do
  user_id="user_$((i % 10 + 1))"
  event_type=$([ $((i % 3)) -eq 0 ] && echo "purchase" || echo "view")
  session_id="session_$((i % 5 + 1))"

  send_event "$user_id" "$event_type" "$session_id"

  # Pequeno delay para simular tráfego real
  sleep 0.1
done

echo "Teste concluído! Verifique os logs da aplicação para ver o processamento em lotes."
