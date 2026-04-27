Cypress.Commands.add('login', (username, password) => {
  cy.visit('/login');
  cy.get('input[type="text"]').type(username);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  // Ensure we are logged in (URL changes from /login)
  cy.url().should('not.include', '/login');
});
