describe('Authentication and Input Validation', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should show validation error for empty fields', () => {
    // Attempt login with empty fields
    cy.get('button[type="submit"]').click();
    
    // Check for HTML5 required validation
    cy.get('input[type="text"]').should('have.attr', 'required');
    cy.get('input[type="password"]').should('have.attr', 'required');
  });

  it('should show error for invalid credentials', () => {
    cy.get('input[type="text"]').type('wronguser');
    cy.get('input[type="password"]').type('wrongpass');
    cy.get('button[type="submit"]').click();
    
    cy.get('.error-msg').should('be.visible').and('not.be.empty');
  });

  it('should successfully log in with correct credentials', () => {
    // Assuming superadmin:ChangeMe123! from our seeding
    cy.get('input[type="text"]').type('superadmin');
    cy.get('input[type="password"]').type('ChangeMe123!');
    cy.get('button[type="submit"]').click();
    
    // Super Admin redirects to /users by default as per App.jsx
    cy.url().should('include', '/users');
  });
});
