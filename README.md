## DroneFarm — Simulação e Agricultura de Precisão com Drones

### Concurso Agrinho 2026

- **Categoria:** Programação / Robótica
- **Tema Central:** *Agro forte, futuro sustentável: equilíbrio entre produção e meio ambiente*
- **Projeto:** [DroneFarm](https://agrinhoprogramaca02026.vercel.app)
- **Tecnologias:** HTML5, CSS3 e JavaScript

---

## Sobre o DroneFarm

O **DroneFarm** é um jogo de simulação e gerenciamento agrícola interativo (*idle game*) desenvolvido para demonstrar na prática como a **agricultura de precisão** e a automação podem otimizar a produção de alimentos de forma 100% sustentável. 

No controle de uma fazenda tecnológica representada por um mapa em grade (grid), a missão do jogador é gerenciar uma frota de drones inteligentes de tarefas especializadas para automatizar os ciclos de plantio, irrigação, proteção contra pragas e colheita — garantindo o desperdício zero de insumos e promovendo o equilíbrio ambiental absoluto.

---

## Alinhamento com o Tema Agrinho 2026

O projeto foi inteiramente estruturado para refletir questões sociais, ambientais e tecnológicas cruciais para o campo moderno:

- **Equilíbrio Ecológico e Desperdício Zero:** Diferente de métodos tradicionais de pulverização e irrigação uniforme, a automação com os drones de DroneFarm implementa a aplicação direcionada de insumo sob demanda. Apenas plantas que realmente precisam recebem irrigação e controle de pragas, reduzindo drasticamente o impacto no ecossistema e preservando recursos hídricos.
- **Tecnologia Aplicada à Sustentabilidade:** O jogo introduz de forma lúdica conceitos modernos como energia limpa (com as estações de recarga solar de baterias para a frota) e economia circular (com as refinarias industrializando a matéria-prima crua em alimentos refinados de alto valor).
- **Educação Científica em Programação:** Demonstrar aos jovens que a programação e o desenvolvimento de software (HTML/CSS/JS) são ferramentas fundamentais que produzem soluções sustentáveis reais para o campo.

---

## Prompts Utilizados no Desenvolvimento (Engenharia de Prompts)

O desenvolvimento técnico do jogo foi realizado em colaboração interativa com assistentes de Inteligência Artificial (Claude 3.5 Sonnet / 4.6). A seguir, estão descritos **todos os prompts de comando reais** enviados cronologicamente para ditar as regras, programar as mecânicas, criar os testes físicos e consertar problemas de lógica de código

### 1. Prompt de Alinhamento e Integração Inicial
Para iniciar a parceria de programação e apresentar seu código base estruturado em HTML e CSS, você utilizou o seguinte comando:
> "eu tenho um site ja feito, so preciso de ajuda na programação."

### 2. Prompt de Criação e Refinamento do Clima e Limite de Upgrades
Para criar desafios climáticos imersivos para as plantações e proteger a estabilidade computacional do jogo, você solicitou modificações profundas no loops lógica através do diálogo:
> **Você:** "mudei o codigo, ele ta assim [...]"
> 
> **Perguntas de alinhamento da IA:** 
> - *P: Qual limite de upgrades você quer por tipo?*
> - *P: Quais mecânicas você quer melhorar?*
> 
> **Sua resposta e diretiva:**
> - *"Deixa você decidir"* (para o limite)
> - *"Sistema de clima com mais impacto"* (para a mecânica)

- **Resultado técnico:** A IA implementou um limite inteligente de 5 upgrades por módulo de performance, acompanhado de uma escala exponencial de preços em moedas. O sistema de clima foi reprogramado para conter 8 condições atmosféricas reais (Calmo, Calor Extremo, Vento Forte, Seca, Tempestade, Chuva Ácida, Geada e Nublado) que modificavam dinamicamente a taxa de umidade, pragas e o crescimento geral dos vegetais.

### 3. Prompt de Implementação de Culturas e Colheita Manual
Para ampliar a diversidade biológica da fazenda e permitir ação imediata do jogador para colheita rápida, o seguinte comando direto foi executado:
> "implementar as três coisas no script.js:
> - 3 culturas (Trigo, Milho, Soja) — cada uma com crescimento, valor e necessidade de água diferentes.
> - Rotas fixas para coletores (define origem e destino manualmente, sem busca aleatória).
> - Clicar numa tile madura coleta na hora."

- **Resultado técnico:** Criação do dicionário de dados `CROPS` de Trigo (crescimento veloz, baixo consumo hídrico, valor moderado), Milho (crescimento balanceado) e Soja (crescimento estratégico e alta valorização). Integração da captura estática de coordenadas no cursor para coleta imediata via clique simples do usuário.

### 4. Prompt de Roteamento Avançado para os Drones Coletores e Refinarias
A fim de otimizar o processamento matemático das rotas dinâmicas de renderização de cada drone, evitando bugs de movimentos aleatórios (*lag* gráfico), você enviou a seguinte instrução:
> "Botão 'Definir rota de coletor' no painel de refinarias. Você escolhe um coletor, define de qual tile ele colhe e pra qual refinaria ele leva. Drone com rota fica com borda laranja e ignora o resto do mapa. Botão 'Remover rota' desfaz a rota de qualquer coletor. Isso elimina a busca aleatória por tile e deixa o jogo mais leve."

- **Resultado técnico:** Programação das funções `placeCharger` e `placeRefinery` utilizando seletores de interface de rota manual e manipulação no array de atribuições `drones.targetX` e `drones.targetY`, gerando um circuito de transporte automatizado de alto desempenho com retorno logístico focado nas indústrias.

### 5. Prompt de Depuração de Código (Debugging) e Integração de Sementes
Durante os testes práticos, quando o comportamento dos drones e carregadores apresentou desalinhamentos visuais pós-mecanização, você efetuou o seguinte prompt de ajuste de estado para o processador de tarefas (`findBestTask`):
> "Vi um bug no meu código! Na função applyTileEffects linha do conector tem um 'update' solto que vai dar erro. Preciso que o drone plantador configure sua própria cultura de sementes (`drone.cropType`) ao invés de resetar de forma aleatória nas atualizações visuais das tiles."

- **Resultado técnico:** Depuração e remoção do termo sintático inadequado `update` antes de `updateTileVisual(tile)`, além do encadeamento correto da variável de controle `selectedCrop` diretamente atrelada ao comportamento inicial do drone plantador recém-comprado.

---

## Principais Mecânicas e Funcionalidades

O simulador roda um loop lógico em tempo real gerenciando as seguintes frentes:

### Frota de Drones Especialistas
- **Drone Plantador (Planter):** Identifica solos vazios e realiza a semeadura das culturas selecionadas (`Trigo`, `Milho` ou `Soja`).
- **Drone Irrigador (Water):** Monitora a umidade e as necessidades hídricas das plantas em crescimento, aplicando água apenas onde as taxas estão baixas.
- **Drone Aplicador (Pesticide):** Identifica focos de infestação de pragas agrícolas e aplica o defensivo de forma cirúrgica e segura no bloco afetado.
- **Drone Coletor (Collector):** Recolhe de forma autônoma as matérias-primas agrícolas maduras e as transporta de maneira ágil para a refinaria.

### Infraestrutura da Fazenda
- **Estações de Recarga:** Pontos estratégicos de bateria onde os drones recarregam sua energia elétrica de painéis solares quando este indicador atinge níveis críticos.
- **Refinarias:** Estruturas que recebem as culturas colhidas e industrializam a matéria-prima crua em alimentos refinados, potencializando a taxa de lucro do produtor.
- **Painel de Melhorias (Upgrades):** Permite investir as moedas recebidas para evoluir a velocidade de movimentação da frota, expandir a capacidade de bateria e ampliar a área da fazenda (*Grid*).
