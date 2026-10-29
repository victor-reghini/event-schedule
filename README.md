# Sincroniza • Agendador Coletivo Inteligente

Um sistema moderno inspirado no **Calendly** e no **Google Agenda**, focado em encontros presenciais, confraternizações de amigos, reuniões e eventos em grupo, com sugestão algorítmica de horários por quórum máximo.

## 🚀 Principais Funcionalidades

1. **Sugestões e Votação de Locais (Aprovar / Reprovar)**:
   - O administrador pode abrir ou fechar o campo de local para sugestões dos convidados.
   - Qualquer participante pode sugerir restaurantes, parques, coworkings ou salas (com nome, endereço e justificativa).
   - **Votação direta**: Todos os convidados podem sinalizar **Aprovar (👍)** ou **Reprovar (👎)** para cada local sugerido.
   - O administrador visualiza o placar e pode com 1 clique **"Definir como Local Oficial"** do evento.

2. **Cadastro de Disponibilidade no Estilo Google Agenda**:
   - **Visão de Mês**: Clique no dia para cadastrar intervalos de horários com precisão de minutos. Colunas com larguras rigorosamente idênticas (`repeat(7, minmax(0, 1fr))`) e células na mesma linha com altura sincronizada.
   - **Visão de Semana & Dia**: Clicar e arrastar (drag-to-select) na grade de horas com ajuste fino de minutos.
   - **Visão de Sugestões de Horários**: Permite cadastrar e votar diretamente em propostas de dias e horários.

3. **Período Flexível e Sugestões Abertas**:
   - Período contínuo sugerido pelo organizador ou dias específicos, sem limitar os convidados de proporem outras datas.

4. **Autenticação Segura (Sem Impersonação)**:
   - Login, cadastro e logout com senhas protegidas por hash SHA-256.
   - Contas de teste com preenchimento rápido exibidas exclusivamente em ambiente de desenvolvimento (`import.meta.env.DEV`).

5. **Algoritmo de Quórum Máximo & Integração com Agendas**:
   - Otimiza dias e horários com suporte a presença parcial.
   - Exportação em 1 clique para Google Agenda, Outlook e download `.ics` (Apple Calendar).

## 📦 Como Executar Localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse no navegador: `http://localhost:5173`
