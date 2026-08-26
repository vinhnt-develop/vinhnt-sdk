---
title: NestJS Integration
description: Full-stack agent with NestJS
lang: en
type: "guide"
category: "Guides"
sidebarPosition: 10
---

# NestJS Integration

Build a production-ready AI agent backend using NestJS with vinhnt-sdk.

## Architecture

```mermaid
graph TB
    Client[Client App] --> Controller[REST Controller]
    Client --> WS[WebSocket Gateway]
    Controller --> AgentService[AgentService]
    WS --> AgentService
    AgentService --> Kernel[AgentKernel]
    Kernel --> Tools[Tool Registry]
    Kernel --> LLM[LLM Provider]
    Auth[ApiKeyGuard] --> Controller
    Auth --> WS
```

## Installation

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express
npm install @nestjs/websockets @nestjs/platform-socket.io
npm install @nestjs/swagger class-validator class-transformer
npm install vinhnt-sdk
```

## Project Structure

```
src/
├── app.module.ts
├── main.ts
├── agent/
│   ├── agent.module.ts
│   ├── agent.service.ts
│   ├── agent.controller.ts
│   ├── agent.gateway.ts
│   ├── dto/
│   │   ├── invoke.dto.ts
│   │   └── chat.dto.ts
│   └── guards/
│       └── api-key.guard.ts
```

## AgentService

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AgentKernel, Tool } from 'vinhnt-sdk';

@Injectable()
export class AgentService implements OnModuleInit, OnModuleDestroy {
  private kernel: AgentKernel;

  async onModuleInit() {
    this.kernel = new AgentKernel({
      model: process.env.LLM_MODEL || 'gpt-4',
      apiKey: process.env.LLM_API_KEY,
      systemPrompt: 'You are a helpful AI assistant.'
    });
  }

  async onModuleDestroy() {
    await this.kernel.destroy();
  }

  async invoke(prompt: string, context?: Record<string, any>) {
    return this.kernel.invoke(prompt, context);
  }

  async *stream(prompt: string, context?: Record<string, any>) {
    yield* this.kernel.stream(prompt, context);
  }

  registerTool(tool: Tool) {
    this.kernel.registerTool(tool);
  }
}
```

## REST Controller with SSE

```typescript
import { Controller, Post, Body, Sse, MessageEvent, Param, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AgentService } from './agent.service';
import { InvokeDto, ChatDto } from './dto';
import { Observable, Subject } from 'rxjs';

@ApiTags('Agent')
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('invoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invoke agent with a prompt' })
  async invoke(@Body() dto: InvokeDto) {
    const result = await this.agentService.invoke(dto.prompt, dto.context);
    return { result };
  }

  @Sse('stream/:conversationId')
  @ApiOperation({ summary: 'Stream agent response' })
  stream(@Param('conversationId') id: string, @Body() dto: ChatDto): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();
    (async () => {
      try {
        for await (const chunk of this.agentService.stream(dto.prompt, { conversationId: id })) {
          subject.next({ data: chunk, type: 'message' });
        }
        subject.complete();
      } catch (error) {
        subject.error(error);
      }
    })();
    return subject.asObservable();
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
```

## WebSocket Gateway

```typescript
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AgentService } from './agent.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/agent' })
export class AgentGateway {
  @WebSocketServer()
  server: Server;

  constructor(private readonly agentService: AgentService) {}

  @SubscribeMessage('invoke')
  async handleInvoke(@ConnectedSocket() client: Socket, @MessageBody() data: { prompt: string }) {
    try {
      const result = await this.agentService.invoke(data.prompt);
      client.emit('invoke:result', { success: true, data: result });
    } catch (error) {
      client.emit('invoke:error', { success: false, error: error.message });
    }
  }

  @SubscribeMessage('stream')
  async handleStream(@ConnectedSocket() client: Socket, @MessageBody() data: { prompt: string; conversationId?: string }) {
    try {
      for await (const chunk of this.agentService.stream(data.prompt, { conversationId: data.conversationId })) {
        client.emit('stream:chunk', { data: chunk });
      }
      client.emit('stream:complete', { success: true });
    } catch (error) {
      client.emit('stream:error', { success: false, error: error.message });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    client.emit('pong', { timestamp: Date.now() });
  }
}
```

## ApiKeyGuard

```typescript
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];
    if (apiKey !== this.configService.get<string>('API_KEY')) {
      throw new UnauthorizedException('Invalid API key');
    }
    return true;
  }
}
```

## DTOs

```typescript
import { IsString, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvokeDto {
  @ApiProperty({ example: 'What is the capital of France?' })
  @IsString() @MinLength(1) @MaxLength(10000)
  prompt: string;

  @ApiPropertyOptional()
  @IsOptional() @IsObject()
  context?: Record<string, any>;
}

export class ChatDto {
  @ApiProperty({ example: 'Tell me a joke' })
  @IsString() @MinLength(1) @MaxLength(10000)
  prompt: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  conversationId?: string;
}
```

## Swagger Bootstrap

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('vinhnt-sdk Agent API')
    .setDescription('AI Agent backend powered by vinhnt-sdk')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .build();

  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
  await app.listen(3000);
}
bootstrap();
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agent/invoke` | Send prompt, get complete response |
| SSE | `/agent/stream/:conversationId` | Stream response chunks |
| GET | `/agent/health` | Health check endpoint |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `invoke` | Client → Server | Send prompt for processing |
| `invoke:result` | Server → Client | Complete response result |
| `invoke:error` | Server → Client | Error response |
| `stream` | Client → Server | Start streaming request |
| `stream:chunk` | Server → Client | Individual response chunk |
| `stream:complete` | Server → Client | Stream finished |
| `stream:error` | Server → Client | Stream error |
| `ping` | Client → Server | Connection keepalive |
| `pong` | Server → Client | Keepalive response |