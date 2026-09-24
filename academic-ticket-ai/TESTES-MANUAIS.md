# Testar chamados na mão

Abra um terminal na pasta `academic-ticket-ai` e execute:

```bash
npm run predict
```

Digite uma descrição de cada vez, com suas próprias palavras. O modelo sugere um setor;
quando encontra pouca evidência ou resultados próximos, pede mais contexto e mostra
uma sugestão provisória. As pontuações não são probabilidades de acerto.

- `/setores`: mostra os nomes e números válidos.
- `/ok`: marca a última sugestão como correta.
- `/corrigir Infraestrutura`: informa o setor correto para a última sugestão.
- `/corrigir 5`: faz o mesmo pelo número exibido em `/setores`.
- `/resultado`: mostra acertos, erros e descrições ainda não avaliadas.
- `/sair`: encerra e mostra o resultado da sessão.

Você pode corrigir uma avaliação anterior da última sugestão sem contá-la duas vezes.
Pedidos de contexto não são contados como acertos. Se avaliar uma sugestão provisória,
a contagem considera se ela estava correta, inclusive quando houver pedido de contexto.
As avaliações ficam somente na memória da sessão e não alteram o treinamento.

Para uma descrição isolada:

```bash
npm run predict -- "A tomada da sala parou de funcionar"
```

A primeira classificação pode demorar para carregar o modelo multilíngue local. Em uma
máquina nova, há download público dos pesos; depois eles ficam em cache. O texto do chamado
é processado na máquina, sem envio a uma API de IA.

Para medir qualidade real, use relatos inéditos cujo setor correto você já saiba e distribua
os testes entre os cinco setores. Não use somente exemplos que o sistema já acertou.
Frases vagas precisam de complemento: "preciso de ajuda" não identifica um setor.

Consulte `reports/aceitacao-ecc.md` para os resultados medidos e suas limitações.
