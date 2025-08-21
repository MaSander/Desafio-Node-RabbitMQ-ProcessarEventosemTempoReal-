src/
├── main.ts                 # Ponto de entrada da aplicação
|
├── app.module.ts           # Módulo raiz
|
├── config/                 # Lógica de configuração
│   └── index.ts
|
├── shared/                 # Módulos e serviços compartilhados
│   ├── logger/             # Módulo de logging customizado
│   └── rabbitmq/           # Módulo para abstrair a conexão com RabbitMQ
|
└── modules/                # Módulos de funcionalidades de negócio
    ├── events/             # Módulo para receber e injetar eventos
    │   ├── dto/
    │   │   └── create-event.dto.ts
    │   ├── events.controller.ts # API para injetar eventos
    │   ├── events.consumer.ts   # Consumidor da fila RabbitMQ [cite: 12]
    │   └── events.module.ts
    |
    └── batch-processing/     # Módulo para processar lotes
        ├── entities/
        │   └── user-interaction.entity.ts
        ├── listeners/
        │   └── batch-metrics.listener.ts # Ouvinte do padrão Observer
        ├── batch-processing.service.ts # Lógica de lote
        └── batch-processing.module.ts
