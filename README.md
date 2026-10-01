# Tessera — site

Site público do **Tessera**, extensão para Chrome e Edge que reencontra seus favoritos pelo sentido:
**https://casheiro.github.io/tessera/** · [English](https://casheiro.github.io/tessera/en/)

Aqui ficam só a página de apresentação, o guia de uso e a política de privacidade, em português e inglês.
O código da extensão não é público e não faz parte deste repositório.

- Dúvidas, problemas e sugestões: [Issues](https://github.com/casheiro/tessera/issues) (não inclua dados pessoais nem chaves de API).
- © 2026 Tessera — todos os direitos reservados. Fontes: Fraunces e IBM Plex Sans (SIL Open Font License, em `assets/fonts/`).

## Editar

HTML e CSS estáticos, sem build. Para ver localmente: `python -m http.server` na raiz e abra `http://localhost:8000/`
(a página 404 usa caminhos `/tessera/`, então só funciona publicada).

Antes de cada commit roda `tools/guard.sh` (ative uma vez com `git config core.hooksPath .githooks`); o mesmo teste roda
no GitHub Actions. Ele recusa qualquer arquivo que pareça código ou pacote da extensão.
