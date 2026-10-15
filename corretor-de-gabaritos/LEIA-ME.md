# Corretor de Gabaritos

App Android gratuito que corrige provas de múltipla escolha pela câmera do celular.

**Criado pelo Prof. Artur**, professor de Filosofia da E.E. Monsenhor Joaquim Honório, Guamaré/RN.
Feito para circular entre professores. Não está na Play Store.

## O que o app faz

- Cria provas de 1 a 50 questões (alternativas A a E) com gabarito oficial. O gabarito pode ser marcado na tela ou lido de uma folha preenchida pelo professor.
- Permite anular questões: o app desconsidera a questão para todos.
- Gera a folha de respostas em PDF, com o nome da escola e da prova.
- Lê a foto da folha **sem internet**: identifica ano/série (6º ao 9º ano, 1ª a 3ª série), turma (A a E), turno (manhã, tarde, noite), número de chamada e as respostas.
- Mostra a leitura para conferência antes de salvar, destacando marcações fracas ou duplas.
- Guarda tudo no celular e monta a lista de resultados **separada por turma**.
- Relatórios: média da turma, percentual de acerto por questão, questões mais erradas (com a alternativa errada mais marcada) e ranking dos alunos.
- Exporta em PDF e planilha Excel, ou envia direto pelo WhatsApp.
- Não guarda o nome dos alunos, só turma e número de chamada.
- Cópia de segurança para trocar de celular sem perder os dados.

## Como gerar o APK (grátis, pelo GitHub, sem instalar nada)

1. Crie uma conta em <https://github.com> (gratuita).
2. Clique em **New repository**. Nome sugerido: `corretor-de-gabaritos`.
   Marque **Public** se quiser que outros professores baixem o APK por um link. Clique em **Create repository**.
3. Na página do repositório, clique em **uploading an existing file** (ou **Add file › Upload files**).
4. Descompacte o arquivo `.zip` que você recebeu e arraste **todo o conteúdo da pasta** para a página. Clique em **Commit changes**.
5. Confira se a pasta `.github/workflows` subiu (ela começa com ponto e alguns computadores a escondem).
   Se não aparecer: **Add file › Create new file**, digite o nome `.github/workflows/gerar-apk.yml`, cole o conteúdo do arquivo de mesmo nome que está no zip e clique em **Commit changes**.
6. Abra a aba **Actions**. A tarefa **Gerar APK** começa sozinha e leva uns 5 a 10 minutos.
   (Se pedir, clique em **I understand my workflows, go ahead and enable them**.)
7. Quando terminar (sinal verde), abra **Releases** no lado direito da página do repositório e baixe `corretor-de-gabaritos.apk`.

Toda vez que um arquivo for alterado no GitHub, um APK novo é gerado automaticamente.

## Como instalar no celular

1. Envie o arquivo `corretor-de-gabaritos.apk` pelo WhatsApp (ou baixe direto pelo link do Releases).
2. Toque no arquivo. O Android vai pedir para **permitir a instalação de fontes desconhecidas**: permita.
3. Na primeira foto, permita o uso da câmera.

Versões novas instalam por cima da antiga sem apagar os dados, desde que sejam geradas pelo mesmo repositório (o arquivo `android/app/corretor.keystore` garante isso; **não apague esse arquivo**).

## Como usar

1. Toque em **Nome da escola** e escreva o nome que vai na folha.
2. **Nova prova**: dê um nome, escolha o número de questões e marque o gabarito oficial.
3. **Gerar folhas para imprimir**: imprima em **tamanho real (100%)**, sem "ajustar à página".
4. Os alunos preenchem a bolinha inteira, com caneta azul ou preta, e marcam série, turma, turno e número.
5. **Escanear folha de aluno**: fotografe a folha inteira, de cima, com boa luz e os 4 quadrados pretos aparecendo.
6. Confira a leitura (linhas amarelas pedem atenção) e toque em **Salvar e próxima**.
7. Veja **Resultados por turma** e **Relatórios**, e envie pelo WhatsApp.

## Para quem for mexer no código

| Arquivo | O que faz |
|---|---|
| `www/js/layout.js` | Medidas da folha em milímetros. A folha impressa e a leitura usam o mesmo arquivo. |
| `www/js/omr.js` | Leitura da foto: acha os cantos, corrige a perspectiva, mede cada bolinha. |
| `www/js/sheet-pdf.js` | Desenha a folha de respostas em PDF. |
| `www/js/store.js` | Guarda provas e resultados no celular. |
| `www/js/reports.js` | Cálculo dos relatórios. |
| `www/js/export.js` | PDF e planilha de resultados. |
| `www/js/platform.js` | Câmera, salvar e compartilhar (WhatsApp). |
| `www/js/app.js` | Telas do app. |
| `test/` | Testes da leitura com fotos simuladas (gera folha, preenche, entorta e confere). |

Feito com HTML/JavaScript e empacotado com Capacitor. Bibliotecas: jsPDF, jsPDF-AutoTable e SheetJS.

Atenção: mudar posições em `layout.js` faz as folhas já impressas pararem de ser lidas.
