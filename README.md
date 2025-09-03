Agenda Barber

Agenda Barber é um sistema web para gerenciamento de agendamentos de barbeiros, permitindo controle de horários, clientes e serviços de forma prática e eficiente.

📌 Funcionalidades

Cadastro de clientes e barbeiros.

Criação, edição e exclusão de agendamentos.

Visualização de agenda diária, semanal e mensal.

Notificações de agendamentos futuros.

Painel administrativo para gerenciamento de usuários e serviços.

Sistema responsivo, acessível de desktop e mobile.

🛠️ Tecnologias e Stacks Utilizadas

O projeto utiliza uma stack moderna e escalável:

Front-end

React: Biblioteca JavaScript para criação de interfaces de usuário.

Vite: Bundler rápido para desenvolvimento com React.

Twind: CSS-in-JS com classes utilitárias (alternativa ao Tailwind).

TypeScript: Superset de JavaScript com tipagem estática.

Back-end

Spring Boot (Groovy): Framework Java/Groovy para construção de APIs RESTful.

Gradle: Sistema de build e gerenciamento de dependências.

Spring Security: Autenticação e autorização de usuários.

Banco de Dados

MySQL ou PostgreSQL: Sistema de gerenciamento de banco de dados relacional.

Estrutura de tabelas para usuários, agendamentos, serviços e logs de atividades.

Ferramentas e Complementos

Git & GitHub: Controle de versão.

VSCode / IntelliJ IDEA: IDE recomendada para desenvolvimento.

Postman / Insomnia: Teste e documentação de APIs.

npm: Gerenciador de pacotes para front-end.

📁 Estrutura do Projeto
frontend/           # Código front-end React + Vite
  ├─ src/
  │   ├─ components/   # Componentes React
  │   ├─ pages/        # Páginas do sistema
  │   ├─ App.tsx       # Componente principal
  │   └─ main.tsx      # Entry point do Vite

backend/            # Código back-end Spring Boot (Groovy + Gradle)
  ├─ src/
  │   ├─ main/
  │   │   ├─ groovy/      # Código da aplicação (controllers, services, models)
  │   │   ├─ resources/   # application.yml, templates, arquivos estáticos
  │   └─ test/             # Testes unitários
  └─ build.gradle          # Configuração do Gradle