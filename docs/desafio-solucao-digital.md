                                    SOLUÇÕES DIGITAIS - DESENVOLVEDOR(A)
                                             FULLSTACK PLENO

                                     Case Prático: Desenvolvedor(a) Fullstack Pleno

Projeto: UniFECAF Student Hub – MVP da Página Home

1. Contexto do Desafio
O objetivo deste teste é avaliar suas competências técnicas na construção de uma interface robusta, escalável e bem estruturada. Você
deverá desenvolver a Página Inicial (Home) do novo Portal do Aluno da UniFECAF, consolidando informações acadêmicas, financeiras e
de agenda em um único dashboard funcional.

2. Stack Tecnológica Obrigatória
Para estar alinhado com as tecnologias utilizadas em nossas equipes, você deve utilizar:
    Frontend: React.js ou Next.js (com TypeScript).
    Backend: Python com fastApi
    Validação de Dados: Pydantic (para schemas de entrada e saída).
    Infraestrutura: Docker e Docker Compose.
    Estilização: Tailwind CSS, Styled Components ou CSS Modules (Foco em Responsividade/Mobile-First).

3. Requisitos da Página Home (O que desenvolver)
A página deve ser alimentada por uma API própria (com dados mockados) e conter os seguintes módulos:
A. Dashboard Acadêmico & Financeiro
    Header de Identificação: Nome do aluno, RA, Curso e uma Barra de Progresso do Curso (% concluída).
    Resumo de Notas: Card com as principais disciplinas do semestre, exibindo Média e % de Faltas.
       Regra de Negócio: Disciplinas com faltas acima de 20% devem exibir um alerta visual (ex: borda ou ícone em vermelho).
    Widget Financeiro: Exibição do valor e data do próximo boleto a vencer, com indicação clara do status (Pendente/Pago).
B. Funcionalidades de Interface (UI/UX)
    Agenda do Dia: Listagem da próxima aula (Matéria, Horário e Local/Sala).
    Central de Notificações: Um componente de "Sininho" que liste avisos lidos e não lidos.
    Menu de Ações Rápidas: Botões funcionais para "Baixar Declaração", "Carteirinha Digital" e "Histórico".
C. Backend & Infraestrutura (Hard Code)
    API REST: Endpoints que entreguem o JSON mockado (fornecido abaixo).
    Segurança: Implementação de uma lógica de rota protegida via JWT.
    Docker: O projeto deve ser executado completamente (Front + Back) através do comando docker-compose up.




                                                               Boa sorte!
                                         Time de Recrutamento e Seleção - UniFECAF e Colégio SER.
                                     SOLUÇÕES DIGITAIS - DESENVOLVEDOR(A)
                                              FULLSTACK PLENO

                                      Case Prático: Desenvolvedor(a) Fullstack Pleno

4. Mock de Dados (Base para a sua API)
Utilize este objeto como base para o retorno dos seus endpoints:
JSON
{
 "student": {
 "name": "Candidato(a) Pleno Teste",
 "ra": "20240988",
 "course": "Análise e Desenvolvimento de Sistemas",
 "total_progress": 45
 },
 "today_classes": [
 { "subject": "Desenvolvimento Web Fullstack", "time": "19:00", "room": "Sala 302 - Bloco A" }
 ],
 "notifications": [
 { "id": 1, "text": "Sua nota de Banco de Dados foi publicada.", "read": false },
 { "id": 2, "text": "Lembrete: Renovação de matrícula disponível.", "read": true }
 ],
 "academic_summary": [
 { "subject": "Desenvolvimento Web Fullstack", "grade": 8.5, "absences": 12 },
 { "subject": "Banco de Dados NoSQL", "grade": 5.0, "absences": 26 }
 ],
 "financial_summary": {
 "next_due_date": "2026-02-10",
 "value": 450.00,
 "status": "PENDING"
 }
}
5. Critérios de Avaliação
     Arquitetura: Organização das pastas, separação de responsabilidades e componentização.
     TypeScript: Qualidade da tipagem e definição de interfaces.
     Docker: Facilidade e sucesso na execução do ambiente.
     Responsividade: Comportamento e adaptação do layout em dispositivos móveis.
     README: Clareza nas instruções de como rodar o projeto e justificativa das decisões técnicas.

6. Entrega
    Enviar o link do repositório público (ou acesso liberado) no GitHub.
    Prazo: Em até 3 dias úteis após o recebimento desse arquivo.



Dica do Gestor: Na equipe de Soluções Digitais, valorizamos código limpo e soluções que pensem na experiência do nosso aluno. Boa
sorte!

Identidade Visual:




                                                                 Boa sorte!
                                           Time de Recrutamento e Seleção - UniFECAF e Colégio SER.
