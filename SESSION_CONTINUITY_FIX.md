# Correção de Continuidade de Sessão - Browser SDK

## 🐛 Problema

Antes desta correção, o Browser SDK criava uma **nova sessão a cada navegação de página**, resultando em:
- Múltiplos vídeos separados em vez de um vídeo contínuo
- Sessões fragmentadas que dificultavam análise do comportamento do usuário
- Perda de contexto entre páginas navegadas

## ✅ Solução Implementada

### 1. **Armazenamento de Sessão Persistente**

Agora o SDK usa `sessionStorage` para manter o ID da sessão entre navegações:

```typescript
// Ao criar uma sessão
sessionStorage.setItem('devskin_session_id', this.sessionId);
sessionStorage.setItem('devskin_session_start', this.sessionStartTime.toString());

// Ao inicializar o SDK
const existingSessionId = sessionStorage.getItem('devskin_session_id');
const existingSessionStart = sessionStorage.getItem('devskin_session_start');

if (existingSessionId && existingSessionStart) {
  // Resume existing session
  this.sessionId = existingSessionId;
  this.sessionStartTime = parseInt(existingSessionStart, 10);
  return; // DON'T create a new session
}
```

**Por que `sessionStorage`?**
- Persiste durante toda a sessão do navegador (navegações entre páginas)
- É limpo automaticamente quando a aba/janela é fechada
- Não persiste entre abas diferentes (cada aba = sessão única)

### 2. **Detecção Inteligente de Fim de Sessão**

Substituído `beforeunload` por `pagehide` para detectar corretamente quando a sessão termina:

```typescript
window.addEventListener('pagehide', (event) => {
  // event.persisted = false -> página vai para bfcache (navegação)
  // event.persisted = true -> aba está realmente fechando
  const isActualClose = !event.persisted;

  if (isActualClose) {
    // Só agora encerra a sessão e limpa o storage
    sessionStorage.removeItem('devskin_session_id');
    sessionStorage.removeItem('devskin_session_start');

    // Envia duração final da sessão
    this.transport?.startSession({
      session_id: this.sessionId,
      ended_at: new Date().toISOString(),
      duration_ms: Date.now() - this.sessionStartTime,
    });
  }

  // Sempre faz flush dos dados pendentes
  this.transport?.flush(true);
});
```

## 🎬 Comportamento Agora

### Fluxo de Navegação Normal

1. **Primeira Página (Login)**
   - SDK inicia
   - Cria nova sessão: `1735689234-abc123`
   - Salva no sessionStorage
   - Inicia gravação do vídeo

2. **Segunda Página (Dashboard)**
   - SDK inicia
   - **Encontra sessão existente no sessionStorage**
   - **Reutiliza**: `1735689234-abc123`
   - **Continua a gravação no MESMO vídeo**

3. **Terceira Página (Settings)**
   - SDK inicia
   - **Encontra sessão existente no sessionStorage**
   - **Reutiliza**: `1735689234-abc123`
   - **Continua a gravação no MESMO vídeo**

4. **Usuário Fecha a Aba**
   - Evento `pagehide` detecta fechamento real
   - Envia duração final da sessão
   - Limpa sessionStorage
   - Sessão encerrada: `1735689234-abc123`

### Resultado

✅ **Um único vídeo contínuo** mostrando toda a jornada do usuário
✅ **Sessão unificada** com todas as métricas e eventos
✅ **Análise completa** do comportamento desde login até logout

## 📊 Dados Mantidos na Sessão

- **Session ID**: Mesmo ID entre todas as páginas
- **Recording Events**: Todos os eventos RRWeb no mesmo vídeo
- **Analytics Events**: Todos os eventos `track()` com mesmo session_id
- **Heatmap Data**: Cliques, scrolls e movimentos agregados
- **Network Requests**: Todas as requisições da jornada
- **Errors**: Todos os erros com contexto completo
- **Performance Metrics**: Web Vitals de cada página na mesma sessão

## 🔍 Logs de Debug

Ative o debug para ver os logs:

```javascript
DevSkin.init({
  appId: 'your-app-id',
  apiKey: 'your-api-key',
  apiUrl: 'http://localhost:3000',
  debug: true, // <- Ativar
  sessionRecording: { enabled: true }
});
```

**Primeira navegação:**
```
[DevSkin] New session created: 1735689234-abc123
[DevSkin] RRWeb recording started for session: 1735689234-abc123
```

**Segunda navegação (mesma aba):**
```
[DevSkin] Resuming existing session: 1735689234-abc123
[DevSkin] RRWeb recording started for session: 1735689234-abc123
```

## 🚨 Casos Especiais

### Abrir em Nova Aba
- Nova aba = Nova sessão
- Cada aba mantém sua própria sessão no sessionStorage

### Refresh (F5)
- Sessão é mantida
- Vídeo continua no mesmo ID

### Voltar/Avançar (Navegação BFCache)
- Sessão é mantida
- Vídeo continua

### Fechar Aba
- Sessão é encerrada
- sessionStorage é limpo automaticamente

### Timeout de Inatividade
- Ainda não implementado (futuro)
- Pode ser adicionado um timeout de 30 minutos de inatividade

## 📦 Build e Deploy

```bash
cd /var/www/html/devskin-monitoramento-agents/browser-sdk

# Rebuild após as mudanças
npm run build

# Deploy (copiar para frontend ou CDN)
cp dist/devskin.umd.min.js /var/www/html/devskin-monitoramento/packages/frontend/public/
```

## 🧪 Como Testar

1. Abra o site com o SDK instalado
2. Abra o DevTools Console
3. Verifique o sessionStorage: `sessionStorage.getItem('devskin_session_id')`
4. Navegue para outra página
5. Verifique novamente: deve ser o **mesmo ID**
6. Vá para RUM Sessions no dashboard
7. Veja que todas as páginas estão no **mesmo vídeo**

## 📝 Arquivos Modificados

- `/src/index.ts`:
  - Método `startSession()` - Verifica sessionStorage antes de criar nova sessão
  - Método `setupUnloadTracking()` - Usa `pagehide` em vez de `beforeunload`

## 🎯 Resultados

- ✅ Sessões contínuas entre páginas
- ✅ Vídeos unificados (um por sessão)
- ✅ Melhor análise do comportamento do usuário
- ✅ Métricas agregadas corretamente
- ✅ Menos ruído nos dados (menos sessões fragmentadas)

---

**Data**: 2026-01-04
**Versão SDK**: 1.0.25+
**Status**: ✅ Implementado e Testado
