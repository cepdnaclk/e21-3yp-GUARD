describe('Admin and User Management', () => {
  // Credentials from seed data
  const superAdmin = { user: 'superadmin', pass: 'ChangeMe123!' };
  const adminUser = { user: 'analytics_admin', pass: 'ChangeMe123!' };

  describe('Super Admin Operations', () => {
    beforeEach(() => {
      cy.login(superAdmin.user, superAdmin.pass);
      cy.visit('/users');
    });

    it('should validate admin creation inputs', () => {
      cy.contains('button', 'Add Admin').click();
      cy.get('input[type="text"]').eq(0).should('have.attr', 'required');
      cy.get('input[type="email"]').should('have.attr', 'required');
    });

    it('should add and then delete an admin', () => {
      const newAdmin = `admin_${Math.floor(Math.random() * 10000)}`;
      cy.contains('button', 'Add Admin').click();
      
      cy.get('input[type="text"]').eq(0).type(newAdmin);
      cy.get('input[type="email"]').type(`${newAdmin}@example.com`);
      cy.get('input[type="password"]').type('AdminPass123!');
      cy.get('input[type="text"]').eq(1).type('Test Admin FullName');
      
      cy.get('button[type="submit"]').contains('Create Admin').click();
      
      // Success message should appear
      cy.get('.profile-success-msg', { timeout: 10000 }).should('be.visible');
      
      // Close form/Clear success to see the list better
      cy.contains('button', 'Cancel').click();
      
      // Verify in admins table
      cy.contains('h3', 'Admins').scrollIntoView();
      cy.contains('tr', newAdmin).should('exist');
      
      // Delete
      cy.contains('tr', newAdmin).find('button.btn-danger').click();
      cy.on('window:confirm', () => true);
      
      cy.contains('tr', newAdmin).should('not.exist');
    });

    it('should add and then delete a device from inventory', () => {
      const deviceId = `GUARD-${Math.floor(Math.random() * 1000) + 2000}`;
      const productKey = 'ABCD-EFGH-IJKL-MNOP';
      
      cy.contains('button', 'Add Device').click();
      
      cy.get('input[placeholder="GUARD-201"]').type(deviceId);
      cy.get('input[placeholder="XXXX-XXXX-XXXX-XXXX"]').type(productKey);
      
      cy.get('button[type="submit"]').contains('Add to Inventory').click();
      
      cy.get('.profile-success-msg', { timeout: 10000 }).should('be.visible');
      
      // Verify in inventory list
      cy.contains('h3', 'Device Inventory').scrollIntoView();
      cy.contains('tr', deviceId).should('exist');
      
      // Delete
      cy.contains('tr', deviceId).find('button.btn-danger').click();
      cy.on('window:confirm', () => true);
      
      cy.contains('tr', deviceId).should('not.exist');
    });
  });

  describe('Admin Operations', () => {
    beforeEach(() => {
      cy.login(adminUser.user, adminUser.pass);
      cy.visit('/users');
    });

    it('should add and then delete a worker user', () => {
      const newUser = `worker_${Math.floor(Math.random() * 10000)}`;
      cy.contains('button', 'Add User').click();
      
      cy.get('input[type="text"]').eq(0).type(newUser);
      cy.get('input[type="email"]').type(`${newUser}@example.com`);
      cy.get('input[type="password"]').type('WorkerPass123!');
      cy.get('input[type="text"]').eq(1).type('Test Worker FullName');
      
      cy.get('button[type="submit"]').contains('Create User').click();
      
      cy.get('.profile-success-msg', { timeout: 10000 }).should('be.visible');
      
      // Verify in users table
      cy.contains('tr', newUser).should('exist');
      
      // Delete user
      cy.contains('tr', newUser).find('button.btn-danger').click();
      cy.get('button[type="submit"]').contains('Delete').click();
      cy.on('window:confirm', () => true);
      
      cy.contains('tr', newUser).should('not.exist');
    });
  });
});
