<div align="center">

<img src="public/logo.png" alt="nik-open" width="96" />

# nik-open

**Treine suas aberturas de xadrez contra uma CPU que joga como o Lichess.**

Os lances do adversário vêm do banco de partidas reais do Lichess, filtrados pelo seu rating, e cada lance seu é avaliado pelo Stockfish rodando direto no navegador.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss&logoColor=white)

</div>

---

## Como funciona

A cada partida, a CPU responde com lances sorteados **proporcionalmente à popularidade** deles no Lichess Explorer, considerando as faixas de rating mais próximas do seu nível. Assim você enfrenta as linhas que jogadores reais do seu nível realmente encontram.

A partida termina de uma destas formas:

- **Abertura concluída:** a posição saiu do "livro" (menos de 50 partidas no banco). Vitória.
- **Lance ruim:** o Stockfish detecta que seu lance custou caro. Dependendo do modo, a partida acaba (derrota) ou o tutor entra em ação.

## Funcionalidades

- **Dois modos de treino**
  - **Desafio:** um lance ruim encerra a partida, com tolerância maior.
  - **Tutor:** um lance ruim abre um modal com os melhores lances e a opção de tentar de novo (cada ajuda reduz o ganho de rating) ou encerrar.
- **Explicações com IA (opcional):** com uma chave do Gemini, o tutor explica o erro em linguagem natural, em português.
- **Sessões:** crie quantas quiser (ex.: "Siciliana", "Defesa Francesa"), cada uma com nome, modo, rating inicial, cor das peças e lance inicial da CPU.
- **Sistema de rating:** ganhe ou perca pontos por partida, com bônus de sequência de vitórias/derrotas (rating de 400 a 2800).
- **Premoves:** enfileire lances enquanto a CPU pensa, com validação em cadeia.
- **Jogue por clique:** selecione a peça e clique no destino, com destaque dos lances legais.
- **Histórico por sessão:** veja todas as partidas e abra qualquer uma na análise do Lichess.
- **Efeitos sonoros** sintetizados com a Web Audio API, sem arquivos de áudio.
- **Responsivo:** layout pensado para desktop e celular.
- **Tudo local:** sessões e configurações ficam no `localStorage` do navegador. Não há backend.

## Stack

| Área               | Tecnologia                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| UI                 | React 19, TypeScript, Tailwind CSS 4, lucide-react                                                               |
| Tabuleiro e regras | [react-chessboard](https://github.com/Clariity/react-chessboard), [chess.js](https://github.com/jhlywa/chess.js) |
| Engine             | Stockfish 19 (lite, single-thread) em Web Worker                                                                 |
| Aberturas          | [Lichess Opening Explorer](https://lichess.org/api#tag/Opening-Explorer)                                         |
| Explicações        | Google Gemini API (opcional)                                                                                     |
| Build              | Vite 8, ESLint                                                                                                   |

## Começando

### Requisitos

- Node.js `^20.19` ou `>=22.12`

### Instalação

```bash
git clone https://github.com/willian-pessoa/nik-open
cd nik-open
npm install
npm run dev
```

O servidor sobe com `--host`, então também dá para acessar pelo celular na mesma rede.

### Scripts

| Comando           | O que faz                             |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Servidor de desenvolvimento           |
| `npm run build`   | Checagem de tipos + build de produção |
| `npm run preview` | Serve o build localmente              |
| `npm run lint`    | Roda o ESLint                         |

### Arquivo do Stockfish

O worker carrega `/stockfish-19-lite-single.js`, então esse arquivo precisa estar na pasta `public/`.

## Configuração

Tudo é opcional e feito dentro do app, em **Configurações** (ícone de engrenagem). As chaves ficam salvas só no seu navegador.

| Chave            | Para quê                                                   | Onde criar                                                                 |
| ---------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| Token do Lichess | Evita limites de requisição no Explorer (sem nenhum scope) | [lichess.org/account/oauth/token](https://lichess.org/account/oauth/token) |
| Chave do Gemini  | Explicações em linguagem natural no modo tutor             | [aistudio.google.com/apikey](https://aistudio.google.com/apikey)           |

Como alternativa para o token do Lichess, defina `VITE_ACCESS_TOKEN` em um arquivo `.env` na raiz (já ignorado pelo git):

```env
VITE_ACCESS_TOKEN=lip_seu_token_aqui
```

## Como o lance é avaliado

1. Antes do seu lance, o Stockfish (depth 12, MultiPV) guarda a avaliação da posição.
2. Depois do lance, ele avalia a melhor resposta da CPU.
3. A diferença é convertida em **chance de vitória** com a mesma curva do Lichess.
4. O lance é considerado ruim se:
   - a chance de vitória caiu além do limite do modo (**6 pp** no tutor, **10 pp** no desafio); ou
   - a posição ficou abaixo do piso (**-0,70** no tutor, **-1,00** no desafio) e o lance perdeu pelo menos 3 pp.

Os tipos de erro são `mistake` (piorou a posição), `missed` (deixou escapar vantagem) e `drift` (acúmulo de imprecisões).

### Rating

- Base de **±15** pontos por partida.
- Bônus de sequência a partir da 3ª partida seguida: até **+10** em vitórias e **+5** em derrotas.
- No tutor, cada ajuda usada tira **1** ponto da vitória e zera o bônus de sequência.

## Estrutura do projeto

```
src/
├── components/   # Tabuleiro, lances, modais, header, formulários
├── hooks/        # useSessions, useSettings, useMoveExplanation
├── services/     # lichessApi, stockfishService, geminiService, storage
├── utils/        # rating, avaliação de lances, sons, helpers de UCI/SAN
├── const/        # lances iniciais da CPU, limites de análise
├── types/        # Tipos compartilhados
└── App.tsx       # Orquestra partida, sessões e modais
```

## Créditos

- Dados de aberturas: [Lichess](https://lichess.org)
- Engine: [Stockfish](https://stockfishchess.org)
