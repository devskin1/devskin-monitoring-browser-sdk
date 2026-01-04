# Browser SDK - Timing de Envio de Dados

## ⏱️ TEMPOS DE RETENÇÃO E ENVIO

### 📊 Eventos Regulares (Analytics, Erros, Network)

**Buffer**: Queue em memória
**Tamanho máximo**: 50 eventos
**Flush automático**: A cada **5 segundos**

```typescript
private readonly maxQueueSize = 50;
private readonly flushIntervalMs = 5000; // 5 segundos
```

**Quando envia**:
1. ✅ **A cada 5 segundos** automaticamente
2. ✅ **Quando queue atinge 50 eventos** (imediatamente)
3. ✅ **Quando usuário fecha/minimiza a aba** (visibilitychange)
4. ✅ **Quando página está sendo fechada** (beforeunload)

### 🎬 Gravação de Sessão (RRWeb Events)

**Buffer**: Array de eventos rrweb em memória
**Flush configurável**: A cada **10 segundos**
**Batch size**: 50+ eventos

```typescript
// Flush periódico a cada 10 segundos
this.flushInterval = window.setInterval(() => {
  if (this.hasFullSnapshot && this.events.length > 0) {
    this.flush();
  }
}, 10000); // 10 segundos
```

**Quando envia**:
1. ✅ **Imediatamente** quando captura FullSnapshot (tipo 2)
2. ✅ **A cada 50+ eventos** (após ter FullSnapshot)
3. ✅ **A cada 10 segundos** automaticamente
4. ✅ **Ao parar a gravação** (flush final)

**Snapshots completos periódicos**:
- A cada **5 minutos** (checkoutEveryNms: 5 * 60 * 1000)
- A cada **200 eventos** (checkoutEveryNth: 200)

### 🔄 Sessão e Identificação

**Envio**: ✅ **IMEDIATO** (não usa buffer)

```typescript
startSession(session: SessionData): void {
  // Send session start immediately
  this.sendToBackend('/v1/analytics/session', session);
}

identifyUser(user: UserData): void {
  // Send user identification immediately (don't queue)
  this.sendToBackend('/v1/analytics/identify', user);
}
```

## 📈 RESUMO DE TEMPOS

| Tipo de Dado | Tempo Máximo de Retenção | Condições de Envio |
|-------------|--------------------------|-------------------|
| **Session Start** | 0s (imediato) | Criação/resume de sessão |
| **User Identify** | 0s (imediato) | Identificação de usuário |
| **FullSnapshot** | 0s (imediato) | Primeira captura DOM completa |
| **Recording Events** | 10s ou 50 eventos | Após ter FullSnapshot |
| **Analytics Events** | 5s ou 50 eventos | Buffer cheio ou timer |
| **Errors** | 5s ou 50 eventos | Buffer cheio ou timer |
| **Network Requests** | 5s ou 50 eventos | Buffer cheio ou timer |
| **Performance Metrics** | 5s ou 50 eventos | Buffer cheio ou timer |
| **Heatmap Data** | 5s ou 50 eventos | Buffer cheio ou timer |

## 🎯 COMPORTAMENTO DETALHADO

### Cenário 1: Navegação Normal

```
t=0s   → Usuário entra na página
t=0s   → FullSnapshot capturado e enviado IMEDIATAMENTE ✅
t=0.5s → 10 eventos incrementais capturados
t=1s   → 20 eventos incrementais
t=2s   → 35 eventos incrementais
t=3s   → 50 eventos atingidos → ENVIO IMEDIATO ✅
t=8s   → 15 novos eventos capturados
t=10s  → Timer de 10s → ENVIO AUTOMÁTICO ✅
```

### Cenário 2: Navegação para Nova Página (Mesma Aba)

```
Página 1:
t=0s   → FullSnapshot enviado ✅
t=5s   → Eventos enviados ✅
t=8s   → Usuário clica em link

Durante navegação:
t=8.1s → pagehide event detectado
t=8.1s → Flush de todos os eventos pendentes ✅
t=8.1s → sessionStorage mantém session_id

Página 2:
t=8.2s → SDK inicializa
t=8.2s → Encontra session_id no sessionStorage
t=8.2s → REUTILIZA MESMA SESSÃO ✅
t=8.2s → FullSnapshot da nova página enviado ✅
t=8.2s → Mesmos timers reiniciam
```

### Cenário 3: Usuário Fecha Aba

```
t=0s   → Usuário navegando
t=5s   → Timer flush normal
t=10s  → Timer flush normal
t=12s  → Usuário clica X para fechar

Durante fechamento:
t=12.1s → pagehide event (isActualClose = true)
t=12.1s → Flush IMEDIATO de todos dados pendentes ✅
t=12.1s → Envia session end com duração ✅
t=12.1s → Limpa sessionStorage
t=12.1s → Usa sendBeacon para garantir envio
```

## 🚀 OTIMIZAÇÕES DE PERFORMANCE

### 1. Batching Inteligente

- **Pequenos payloads** (<100KB): Usa `fetch`
- **Grandes payloads** (>100KB): Usa `XMLHttpRequest` com timeout de 30s
- **Unload**: Usa `sendBeacon` para máxima confiabilidade

### 2. Retry Logic (Apenas Recording Events)

```typescript
const maxRetries = hasFullSnapshot ? 3 : 1;
// FullSnapshot é crítico → 3 tentativas
// Outros eventos → 1 tentativa
```

Delays entre retries:
- 1ª tentativa falha → aguarda 1s
- 2ª tentativa falha → aguarda 2s
- 3ª tentativa falha → desiste

### 3. Sampling de Mouse Movement

```typescript
sampling: {
  mousemove: Math.floor(100 / sampleRate), // Default: 50% dos movimentos
  scroll: 150, // Throttle a cada 150ms
  input: 'last', // Apenas último valor do input
}
```

## 📊 EXEMPLOS DE VOLUME DE DADOS

### Sessão Típica (5 minutos)

| Tipo | Quantidade | Tamanho | Envios |
|------|-----------|---------|--------|
| FullSnapshots | 2 | ~200KB cada | 2 imediatos |
| IncrementalSnapshots | ~500 | ~1KB cada | 10 batches (a cada 50 eventos) |
| Analytics Events | ~20 | ~500B cada | 4 batches (a cada 5s) |
| Network Requests | ~30 | ~1KB cada | 6 batches |
| Errors | 0-5 | ~2KB cada | 1 batch |

**Total aproximado**: ~700KB em 5 minutos (2.3KB/s)

### Sessão Multi-Página (3 páginas)

```
Página 1 (2 min):
├─ FullSnapshot: 200KB (imediato)
├─ Incremental: 200KB (4 batches)
└─ Analytics: 10KB (2 batches)

Navegação → Flush: 10KB pendente

Página 2 (2 min):
├─ FullSnapshot: 200KB (imediato)
├─ Incremental: 200KB (4 batches)
└─ Analytics: 10KB (2 batches)

Navegação → Flush: 15KB pendente

Página 3 (1 min):
├─ FullSnapshot: 200KB (imediato)
├─ Incremental: 100KB (2 batches)
└─ Analytics: 5KB (1 batch)

Fechamento → Flush final: 20KB

Total: ~1.2MB
Envios: ~18 requests
Média: 3.3KB/s
```

## ⚡ CONFIGURAÇÃO RECOMENDADA

Para diferentes cenários:

### Alta Performance (Menos dados)
```typescript
DevSkin.init({
  sessionRecording: {
    enabled: true,
    sampling: 0.3,              // 30% dos mouse movements
    checkoutEveryNms: 10 * 60 * 1000,  // FullSnapshot a cada 10min
    checkoutEveryNth: 500,              // Ou a cada 500 eventos
  }
});
```

### Alta Qualidade (Mais detalhes)
```typescript
DevSkin.init({
  sessionRecording: {
    enabled: true,
    sampling: 1.0,              // 100% dos mouse movements
    checkoutEveryNms: 2 * 60 * 1000,   // FullSnapshot a cada 2min
    checkoutEveryNth: 100,              // Ou a cada 100 eventos
    recordCanvas: true,                 // Gravar canvas
  }
});
```

### Balanceado (Default - Recomendado)
```typescript
DevSkin.init({
  sessionRecording: {
    enabled: true,
    sampling: 0.5,              // 50% dos mouse movements
    checkoutEveryNms: 5 * 60 * 1000,   // FullSnapshot a cada 5min
    checkoutEveryNth: 200,              // Ou a cada 200 eventos
  }
});
```

## 🔍 DEBUGGING

Para monitorar os envios em tempo real:

```typescript
DevSkin.init({
  debug: true,  // Ativa logs
  // ...
});
```

Logs que você verá:

```
[DevSkin] New session created: 1735689234-abc123
[DevSkin] RRWeb recording started for session: 1735689234-abc123
[DevSkin] Flushed 25 items to backend
[DevSkin] Data sent successfully: /v1/analytics/events
[DevSkin] Data sent successfully: /v1/rum/recordings
```

---

**Resumo**: Dados são enviados **a cada 5-10 segundos** ou quando o buffer atinge **50 eventos**. Sessões e FullSnapshots são enviados **imediatamente**.
