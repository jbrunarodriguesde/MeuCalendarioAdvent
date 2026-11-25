# Meu Calendário do Advento

Criador de calendários personalizados de dezembro com 31 lembranças, molduras variadas, enquadramento responsivo, prévia, impressão A4 e compartilhamento por link.

## Segurança e privacidade

- As fotos e os dados dos álbuns ficam em armazenamento privado R2, em uma instância separada do repositório de código.
- O link de edição é protegido por um token exclusivo. O link do presente exige um código secreto separado, gerado aleatoriamente e armazenado no servidor como hash.
- O servidor verifica a data em `America/Sao_Paulo` antes de liberar cada foto.
- Não coloque fotografias, códigos de acesso, tokens, credenciais ou dados de usuários neste repositório.

## Projeto

```text
worker/page.js       Interface do criador e do presente
worker/index.js      API, autorização e armazenamento R2
scripts/build.sh     Geração do Worker ESM
scripts/validate-artifact.mjs  Validação do artefato
.openai/hosting.json Configuração lógica de armazenamento
```

## Build local

Requer Node.js e Bash (no Windows, use Git Bash ou WSL).

```bash
npm run build
npm run validate
```

O resultado fica em `dist/server/index.js`. O Worker depende de uma vinculação de armazenamento R2 denominada `BUCKET`; configure-a no ambiente de hospedagem. O código não contém identificadores de álbuns nem credenciais. Para uma nova hospedagem, configure recursos próprios; o armazenamento da aplicação publicada não é copiado para o GitHub.

## Site publicado

[Meu Calendário do Advento](https://meu-calendario-advento.woodsy-lemon-5535.chatgpt.site/)

Este repositório é uma cópia versionada do código-fonte. A hospedagem existente não será alterada por este envio.
