# Global Energy Transition Dashboard

Este challenge segue a seguinte lógica estrutural:

- `index.html`
- `css/style.css`
- `js/*.js`
- `data/*.csv` e `data/*.json`
- `process_data.py`

## Tratamento de dados

O ficheiro original usado como dataset  é o  `owid-energy-data.csv`.

O script `process_data.py`:

- lê o CSV original;
- converte as colunas relevantes para numérico;
- remove agregados regionais sem `iso_code`;
- remove entradas históricas/legadas como `Czechoslovakia`, `East Germany` e `Serbia and Montenegro`;
- preserva a série `World` para as tendências globais;
- fixa `2024` como último ano comparável completo, porque `2025` existe no ficheiro mas está incompleto em várias colunas de shares energéticas.

## Ficheiros criados

- `data/summary.json`
- `data/world_energy_mix.csv`
- `data/latest_country_metrics.csv`
- `data/top_energy_countries.csv`
- `data/top_renewable_countries.csv`
- `data/lowest_carbon_countries.csv`
- `data/peer_trends.csv`

## Visualizações

Cada secção da dashboard tem um único gráfico principal, para evitar sobreposição visual e tornar a leitura mais clara.

1. `Executive Summary`
   Esta secção combina dois níveis de leitura. Primeiro mostra KPIs de contexto, para dar uma visão imediata da escala do dataset, do último ano comparável usado e do posicionamento de Portugal face ao valor mundial. Depois apresenta um gráfico temporal global que permite alternar entre quota renovável, quota fóssil e intensidade carbónica da eletricidade. O objetivo é perceber a direção geral da transição energética ao longo do tempo e ver como a leitura do sistema muda quando se troca a métrica observada.

   ![Grafico 1](/Challenge/images/Grafico1.png)

2. `Country Comparison`
   Este gráfico de barras horizontal funciona como um ranking comparativo entre países no último ano completo. A interação permite alternar entre três perspetivas diferentes: escala do consumo energético, peso relativo das renováveis e intensidade carbónica da eletricidade. A escolha do formato horizontal ajuda a ler melhor nomes de países longos e facilita a comparação direta entre posições no ranking.

   ![Grafico 2](/Challenge/images/Grafico2.png)

3. `Renewables vs Carbon`
   O scatterplot foi pensado para cruzar duas dimensões importantes da transição energética: no eixo X está a quota renovável no mix energético e no eixo Y a intensidade carbónica da eletricidade. O tamanho das bolhas representa a escala do consumo energético, o que permite distinguir países com bons indicadores mas pouca dimensão de países estruturalmente mais relevantes. Ao selecionar uma bolha, o painel lateral mostra mais detalhe sobre esse país e ajuda a interpretar a sua posição relativa.

   ![Grafico 3](/Challenge/images/Grafico3.png)

4. `Portugal in Context`
   Esta visualização temporal multi-série foi desenhada para colocar Portugal em contexto com Espanha, França, Alemanha e o agregado mundial. Em vez de olhar apenas para um retrato estático, o gráfico mostra evolução ao longo do tempo e permite alternar entre quota renovável, quota fóssil e intensidade carbónica. Isso ajuda a perceber se Portugal está a convergir com os seus pares ou se está a construir uma trajetória diferenciada.

   ![Grafico 4](/Challenge/images/Grafico4.png)

5. `Country Energy Mix`
   O donut chart mostra a composição do mix energético de um país específico no último ano comparável. A seleção por `dropdown` permite mudar rapidamente entre países e o clique numa slice ou na legenda serve para destacar um componente concreto do mix. Este gráfico é útil para observar a estrutura interna do sistema energético de cada país e perceber rapidamente o peso relativo de fontes fósseis, solar, eólica e restantes fontes de baixo carbono.

   ![Grafico 5](/Challenge/images/Grafico5.png)

6. `Peer Heatmap`
   O heatmap temporal traduz séries temporais em intensidade de cor, o que facilita a leitura de padrões de convergência, estabilidade ou mudança abrupta entre países comparáveis. A interação permite trocar a métrica observada e focar uma linha específica, tornando a leitura menos dependente da comparação ponto a ponto e mais orientada à deteção visual de padrões globais ao longo dos anos.

   ![Grafico 6](/Challenge/images/Grafico6.png)

7. `Country Profile Radar`
   O radar chart resume várias dimensões energéticas ao mesmo tempo: quota renovável, quota low-carbon, peso da solar, peso da eólica, escala energética e intensidade carbónica. Em vez de comparar um único indicador, esta visualização constrói um perfil relativo para cada país e ajuda a perceber que tipos de pontos fortes ou fracos estruturais existem em cada caso. O destaque selecionável permite concentrar a leitura num país específico dentro do conjunto.

   ![Grafico 7](/Challenge/images/Grafico7.png)

8. `Treemap of Major Consumers`
   O treemap representa os maiores consumidores energéticos em 2024 usando área para codificar escala e cor para codificar desempenho relativo em renováveis. Este formato é útil quando o objetivo não é apenas ordenar, mas também perceber visualmente o peso relativo de cada país dentro do conjunto dos maiores consumidores. O clique num retângulo atualiza o painel de detalhe e permite explorar cada caso sem perder a noção de distribuição global.

   ![Grafico 8](/Challenge/images/Grafico8.png)

9. `Data Treatment`
   A secção final documenta o tratamento de dados e deixa explícita a lógica metodológica usada na construção da dashboard. Para além de apresentar contagens ligadas à qualidade dos dados, regista a razão principal para a escolha de 2024 como último ano comparável completo: o ficheiro já contém 2025, mas esse ano ainda não tem cobertura consistente em várias colunas críticas para comparação entre países.

   ![Grafico 9](/Challenge/images/Grafico9.png)


## Como correr

Na pasta `Challenge`:

```bash
python3 process_data.py
python3 -m http.server 8000
```

Depois abrir:

```text
http://127.0.0.1:8000/
```
