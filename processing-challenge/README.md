</files>
</context>

Faça uma documentaçnao da arquitetura, dos patterns e de como executar, testear, buildar e usar essa aplicação

## Agent

# Documentação Completa - Sistema de Processamento de Eventos em Tempo Real

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Design Patterns](#design-patterns)
4. [Configuração e Instalação](#configuração-e-instalação)
5. [Como Executar](#como-executar)
6. [Como Testar](#como-testar)
7. [Como Usar a API](#como-usar-a-api)
8. [Monitoramento e Logs](#monitoramento-e-logs)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

Este projeto implementa um **sistema de processamento de eventos em tempo real** para e-commerce, capaz de receber, processar e armazenar milhares de eventos de interação de usuários de forma eficiente e resiliente.

### Principais Características

- ✅ **Alta Performance**: Processamento em lote para otimizar I/O
- ✅ **Escalabilidade Horizontal**: Arquitetura baseada em mensageria
- ✅ **Resiliência**: Dead Letter Queue e retry automático
- ✅ **Observabilidade**: Logs estruturados e métricas detalhadas
- ✅ **Transações ACID**: Garantia de consistência de dados
- ✅ **Containerização**: Deploy com Docker

### Stack Tecnológica

| Componente | Tecnologia | Versão |
|------------|------------|--------|
| **Framework** | NestJS | 11.0.1 |
| **Runtime** | Node.js | 18+ |
| **Database** | PostgreSQL | 15 |
| **Message Broker** | RabbitMQ | 3-management |
| **ORM** | TypeORM | 0.3.26 |
| **Container** | Docker | - |

---

## 🏗️ Arquitetura do Sistema

### Diagrama de Arquitetura

```mermaid
graph TB
    Client[Client Applications] --> API[REST API Controller]
    API --> RMQ[RabbitMQ Queue]
    RMQ --> Consumer[Events Consumer]
    Consumer --> BatchService[Batch Processing Service]
    BatchService --> DB[(PostgreSQL)]
    BatchService --> EventEmitter[Event Emitter]
    EventEmitter --> MetricsListener[Metrics Listener]

    RMQ --> DLQ[Dead Letter Queue]

    subgraph "NestJS Application"
        API
        Consumer
        BatchService
        EventEmitter
        MetricsListener
    end

    subgraph "Infrastructure"
        RMQ
        DB
        DLQ
    end
```

### Fluxo de Dados

1. **Recepção**: Cliente envia evento via HTTP POST
2. **Publicação**: Evento é publicado no RabbitMQ
3. **Consumo**: Consumer processa mensagem assincronamente
4. **Buffering**: Evento é adicionado ao buffer em memória
5. **Processamento**: Lote é processado quando atinge limite ou tempo
6. **Persistência**: Dados são salvos no PostgreSQL em transação
7. **Métricas**: Eventos internos disparam coleta de métricas

### Módulos da Aplicação

```processing-challenge/src/app.module.ts#L11-38
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: process.env.NODE_ENV === 'development',
      }),
    }),

    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),

    RabbitMQModule,
    EventsModule,
    BatchProcessingModule,
  ],
})
export class AppModule {}
```

#### **Events Module**
- **EventsController**: Endpoints REST para recepção de eventos
- **EventsConsumer**: Consumer do RabbitMQ para processamento assíncrono
- **CreateEventDto**: Validação e estrutura dos dados de entrada

#### **Batch Processing Module**
- **BatchProcessingService**: Gerenciamento de buffer e processamento em lote
- **UserInteraction Entity**: Modelo de dados para persistência
- **BatchMetricsListener**: Coleta e análise de métricas

#### **RabbitMQ Module**
- **RabbitMQService**: Gerenciamento de conexões e operações com RabbitMQ

---

## 🎨 Design Patterns

### Padrões de Criação

#### **1. Dependency Injection**
Inversão de controle para desacoplamento de componentes:

```processing-challenge/src/modules/batch-processing/batch-processing.service.ts#L16-22
constructor(
  @InjectRepository(UserInteraction)
  private userInteractionRepository: Repository<UserInteraction>,
  private dataSource: DataSource,
  private eventEmitter: EventEmitter2,
) {}
```

#### **2. Factory Pattern**
Criação dinâmica de configurações de módulos:

```processing-challenge/src/app.module.ts#L18-28
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get('DB_USERNAME'),
    password: configService.get('DB_PASSWORD'),
    database: configService.get('DB_DATABASE'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
```

### Padrões Estruturais

#### **3. Module Pattern**
Organização modular da aplicação:

```processing-challenge/src/modules/events/events.module.ts#L7-11
@Module({
  imports: [RabbitMQModule, BatchProcessingModule],
  controllers: [EventsController],
  providers: [EventsConsumer],
})
export class EventsModule {}
```

#### **4. Repository Pattern**
Abstração de acesso a dados:

```processing-challenge/src/modules/batch-processing/entities/user-interaction.entity.ts#L9-28
@Entity('user_interactions')
@Index(['userId', 'eventType'])
export class UserInteraction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  eventType: string;

  @Column('jsonb')
  eventData: any;

  @Column()
  sessionId: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ default: false })
  processed: boolean;
}
```

### Padrões Comportamentais

#### **5. Observer Pattern**
Sistema de eventos para comunicação entre componentes:

```processing-challenge/src/modules/batch-processing/batch-processing.service.ts#L88-95
this.eventEmitter.emit('batch.processed', {
  count: eventsToProcess.length,
  timestamp: new Date(),
  events: eventsToProcess.map((e) => ({
    userId: e.userId,
    eventType: e.eventType,
  })),
});
```

#### **6. Strategy Pattern**
Múltiplas estratégias para processamento de lote:

**Estratégia por Tamanho:**
```processing-challenge/src/modules/batch-processing/batch-processing.service.ts#L33-37
if (this.eventBuffer.length >= this.maxBatchSize) {
  this.logger.log('Maximum barch size reached, processing...');
  await this.processBatch();
}
```

**Estratégia por Tempo:**
```processing-challenge/src/modules/batch-processing/batch-processing.service.ts#L39-46
@Cron(CronExpression.EVERY_30_SECONDS)
async handleScheduledBatchProcessing() {
  if (this.eventBuffer.length > 0 && !this.isProcessing) {
    this.logger.log(
      `Schedule processing: ${this.eventBuffer.length} buffered events`,
    );
    await this.processBatch();
  }
}
```

### Padrões de Resiliência

#### **7. Retry Pattern**
Retry automático com limite de tentativas:

```processing-challenge/src/modules/events/events.consumer.ts#L115-138
const retryCount =
  (message.properties.headers?.['x-retry-count'] || 0) + 1;

if (retryCount <= this.maxRetries) {
  this.logger.warn(
    `Retrying message (attempt ${retryCount}/${this.maxRetries})`,
    { messageId: message.properties?.messageId },
  );

  channel.nack(message, false, true);
} else {
  this.logger.error('Retry limit exceeded, sending to DLQ', {
    messageId: message.properties?.messageId,
    retryCount,
  });

  channel.nack(message, false, false);
}
```

#### **8. Dead Letter Queue Pattern**
Tratamento de mensagens com falha:

```processing-challenge/src/modules/events/events.consumer.ts#L34-52
// Setup Dead Letter Exchange
await channel.assertExchange('dlx_exchange', 'direct', {
  durable: true,
});

await channel.assertQueue('user_interactions_dlq', {
  durable: true,
});

await channel.bindQueue(
  'user_interactions_dlq',
  'dlx_exchange',
  'dlq_routing_key',
);
```

### Padrões de Mensageria

#### **9. Publisher-Subscriber Pattern**
Comunicação assíncrona via RabbitMQ:

```processing-challenge/src/shared/rabbitmq/rabbitmq.service.ts#L47-60
async publishEvent(event: any): Promise<void> {
  try {
    await this.channelWrapper.sendToQueue(
      `${this.configService.get('RABBITMQ_QUEUE_NAME')}`,
      Buffer.from(JSON.stringify(event)),
    );
    this.logger.debug('Event publish in queue', {
      eventType: event.eventType,
    });
  } catch (error) {
    this.logger.error('Error when publish event', error);
    throw error;
  }
}
```

---

## ⚙️ Configuração e Instalação

### Pré-requisitos

- **Node.js** 18+
- **Docker** e **Docker Compose**
- **Git**

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=secret
DB_DATABASE=ecommerce_events

# RabbitMQ Configuration
RABBITMQ_URL=amqp://user:password@localhost:5672
RABBITMQ_QUEUE_NAME=user_interactions_queue

# Application Configuration
MAX_RETRY_ATTEMPTS=3
```

### Instalação das Dependências

```bash
# Clone o repositório
git clone <repository-url>
cd processing-challenge

# Instalar dependências
npm install
```

---

## 🚀 Como Executar

### Opção 1: Docker (Recomendado)

```bash
# Executar todos os serviços
docker compose up --build -d

# Verificar logs
docker compose logs -f app

# Parar serviços
docker compose down
```

### Opção 2: Desenvolvimento Local

```bash
# 1. Iniciar PostgreSQL e RabbitMQ (via Docker)
docker compose up db rabbitmq -d

# 2. Executar aplicação em modo desenvolvimento
npm run start:dev

# 3. Ou executar em modo de produção
npm run build
npm run start:prod
```

### Verificação dos Serviços

- **API**: http://localhost:3000
- **RabbitMQ Management**: http://localhost:15672 (user/password)
- **PostgreSQL**: localhost:5432

---

## 🧪 Como Testar

### Testes Unitários

```bash
# Executar todos os testes
npm run test

# Executar testes em modo watch
npm run test:watch

# Executar testes com cobertura
npm run test:cov
```

### Testes End-to-End

```bash
# Executar testes E2E
npm run test:e2e
```

### Teste Manual da API

Use o script fornecido para testar a API:

```bash
# Torna o script executável
chmod +x test-events.sh

# Executa o teste
./test-events.sh
```

Este script enviará 150 eventos simulados para testar o processamento em lote.

### Teste com cURL

```bash
# Enviar evento individual
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "eventType": "purchase",
    "eventData": {
      "product": "smartphone",
      "category": "electronics",
      "price": 999.99
    },
    "sessionId": "session_456"
  }'
```

### Collection Postman

Acesse a collection do Postman: [Collection](https://elements.getpostman.com/redirect?entityId=6666596-8f886c8a-ecb5-4fc3-b07a-4bbe59ac4774&entityType=collection)

---

## 📖 Como Usar a API

### Endpoint Principal

**POST** `/events` - Enviar evento para processamento

### Estrutura do Payload

```json
{
  "userId": "string",        // ID único do usuário (obrigatório)
  "eventType": "string",     // Tipo do evento (obrigatório)
  "eventData": {             // Dados adicionais (opcional)
    "product": "string",
    "category": "string",
    "price": 999.99,
    "customField": "value"
  },
  "sessionId": "string"      // ID da sessão (obrigatório)
}
```

### Tipos de Eventos Suportados

- `view` - Visualização de produto
- `purchase` - Compra realizada
- `add_to_cart` - Adição ao carrinho
- `remove_from_cart` - Remoção do carrinho
- `login` - Login do usuário
- `logout` - Logout do usuário
- `search` - Busca realizada

### Exemplo de Resposta

```json
{
  "message": "Event sent to processing",
  "status": "accepted"
}
```

### Códigos de Status

- **202 Accepted** - Evento aceito para processamento
- **400 Bad Request** - Dados inválidos
- **500 Internal Server Error** - Erro interno

### Exemplo de Uso JavaScript

```javascript
// Função para enviar evento
async function sendEvent(eventData) {
  try {
    const response = await fetch('http://localhost:3000/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();
    console.log('Evento enviado:', result);
  } catch (error) {
    console.error('Erro ao enviar evento:', error);
  }
}

// Enviar evento de compra
sendEvent({
  userId: 'user_789',
  eventType: 'purchase',
  eventData: {
    product: 'laptop',
    category: 'electronics',
    price: 1299.99,
    discount: 10
  },
  sessionId: 'session_abc123'
});
```

---

## 📊 Monitoramento e Logs

### Logs da Aplicação

```bash
# Logs em tempo real (Docker)
docker compose logs -f app

# Logs do RabbitMQ
docker compose logs -f rabbitmq

# Logs do PostgreSQL
docker compose logs -f db
```

### Estrutura dos Logs

```json
{
  "level": "log",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "context": "BatchProcessingService",
  "message": "=== BATCH METRICS ===",
  "data": {
    "loteAtual": 45,
    "totalLotesProcessados": 12,
    "totalEventosProcessados": 540,
    "tiposDeEventos": {
      "purchase": 15,
      "view": 30
    }
  }
}
```

### Métricas Disponíveis

O sistema coleta automaticamente:

- **Número de eventos processados**
- **Tamanho médio dos lotes**
- **Tempo de processamento**
- **Distribuição por tipo de evento**
- **Taxa de erro e retry**

### Monitoramento via RabbitMQ

Acesse o painel de gerenciamento:
- URL: http://localhost:15672
- User: `user`
- Password: `password`

Monitore:
- Mensagens na fila principal
- Mensagens na Dead Letter Queue
- Taxa de consumo
- Conexões ativas

### Health Check

```bash
# Verificar status dos containers
docker compose ps

# Verificar logs de erro
docker compose logs app | grep ERROR
```

---

## 🚢 Deployment

### Build para Produção

```bash
# Build da aplicação
npm run build

# Executar em produção
npm run start:prod
```

### Docker Build

```bash
# Build da imagem
docker build -t processing-challenge .

# Run do container
docker run -d \
  --name processing-app \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_HOST=your-db-host \
  -e RABBITMQ_URL=your-rabbitmq-url \
  processing-challenge
```

### Configurações de Produção

**Variáveis de Ambiente de Produção:**

```bash
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db
DB_PORT=5432
DB_USERNAME=app_user
DB_PASSWORD=secure_password
DB_DATABASE=ecommerce_events_prod
RABBITMQ_URL=amqp://user:password@rabbitmq-prod:5672
RABBITMQ_QUEUE_NAME=user_interactions_queue
MAX_RETRY_ATTEMPTS=5
```

### Considerações de Performance

1. **Database Pooling**: Configure connection pool adequado
2. **Memory Limits**: Defina limites de memória para containers
3. **Scaling**: Use múltiplas instâncias do consumer
4. **Monitoring**: Implemente métricas com Prometheus/Grafana

---

## 🔧 Troubleshooting

### Problemas Comuns

#### **1. Aplicação não conecta ao RabbitMQ**

```bash
# Verificar se RabbitMQ está rodando
docker compose ps rabbitmq

# Verificar logs do RabbitMQ
docker compose logs rabbitmq

# Testar conectividade
telnet localhost 5672
```

**Solução**: Aguarde RabbitMQ inicializar completamente antes de iniciar a aplicação.

#### **2. Erro de conexão com PostgreSQL**

```bash
# Verificar status do PostgreSQL
docker compose ps db

# Verificar logs
docker compose logs db

# Testar conexão
docker exec -it processing-challenge-db-1 psql -U postgres -d ecommerce_events
```

**Solução**: Verifique as credenciais e se o banco foi criado.

#### **3. Eventos não são processados**

```bash
# Verificar se há mensagens na fila
# Acesse: http://localhost:15672

# Verificar logs do consumer
docker compose logs app | grep EventsConsumer

# Verificar buffer do batch processing
docker compose logs app | grep BatchProcessingService
```

**Solução**: Verifique se o consumer está ativo e se não há erros de processamento.

#### **4. Performance degradada**

**Possíveis causas:**
- Buffer muito pequeno
- Transações muito grandes
- Índices faltando no banco

**Soluções:**
- Ajustar `maxBatchSize`
- Configurar `chunk` size menor
- Adicionar índices apropriados

### Logs de Debug

Habilite logs detalhados:

```bash
# No arquivo .env
LOG_LEVEL=debug

# Ou via Docker
docker compose up --build -d
docker compose logs -f app
```

### Comandos Úteis

```bash
# Resetar completamente o ambiente
docker compose down -v
docker compose up --build -d

# Acessar shell do container da aplicação
docker exec -it processing-challenge-app-1 /bin/bash

# Acessar PostgreSQL
docker exec -it processing-challenge-db-1 psql -U postgres -d ecommerce_events

# Verificar tabelas
\dt

# Ver dados processados
SELECT * FROM user_interactions ORDER BY timestamp DESC LIMIT 10;
```

### Limpeza do Ambiente

```bash
# Parar e remover containers
docker compose down

# Remover volumes (dados serão perdidos!)
docker compose down -v

# Remover imagens
docker rmi $(docker images -q processing-challenge*)
```

---

## 👥 Contribuição

### Estrutura do Projeto

```
processing-challenge/
├── src/
│   ├── config/              # Configurações
│   ├── modules/             # Módulos da aplicação
│   │   ├── events/          # Módulo de eventos
│   │   └── batch-processing/ # Módulo de processamento
│   ├── shared/              # Recursos compartilhados
│   │   ├── logger/          # Logger customizado
│   │   └── rabbitmq/        # Serviços RabbitMQ
│   ├── app.module.ts        # Módulo principal
│   └── main.ts              # Ponto de entrada
├── test/                    # Testes E2E
├── docker-compose.yml       # Configuração Docker
├── Dockerfile              # Imagem da aplicação
└── test-events.sh          # Script de teste
```

### Desenvolvimento

1. Fork o projeto
2. Crie uma branch para sua feature
3. Implemente os testes
4. Envie um Pull Request

---

## 📄 Licença

Este projeto está licenciado sob a [MIT License](https://github.com/nestjs/nest/blob/master/LICENSE).

---

## 📞 Contato

**Autor**: [Marcelo Sander](https://github.com/MaSander)

Para dúvidas ou sugestões, abra uma issue no repositório.

---

*Esta documentação foi gerada automaticamente e mantida atualizada com base na análise do código fonte.*
