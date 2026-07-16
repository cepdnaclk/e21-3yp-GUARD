import { accessibleTanks } from '../src/accessibleTanks.js';

// Function under test: accessibleTanks(user, allTanks)
// No external dependency to mock -- pure function over already-fetched data.

const allTanks = [
  { id: 't1', organizationId: 'org1' },
  { id: 't2', organizationId: 'org1' },
  { id: 't3', organizationId: 'org2' },
  { id: 't4', organizationId: 'org2' },
];

describe('accessibleTanks - Equivalence Partitioning', () => {
  test('EP1: SUPER_ADMIN sees every tank regardless of organization', () => {
    const user = { role: 'SUPER_ADMIN' };
    expect(accessibleTanks(user, allTanks)).toHaveLength(4);
  });

  test('EP2: ADMIN sees only tanks in their own organization', () => {
    const user = { role: 'ADMIN', organizationId: 'org1' };
    const result = accessibleTanks(user, allTanks);
    expect(result).toEqual([
      { id: 't1', organizationId: 'org1' },
      { id: 't2', organizationId: 'org1' },
    ]);
  });

  test('EP3: WORKER sees only tanks explicitly assigned to them', () => {
    const user = { role: 'WORKER', assignedTankIds: ['t3'] };
    const result = accessibleTanks(user, allTanks);
    expect(result).toEqual([{ id: 't3', organizationId: 'org2' }]);
  });

  test('EP4: unknown role throws RangeError', () => {
    const user = { role: 'GUEST' };
    expect(() => accessibleTanks(user, allTanks)).toThrow(RangeError);
  });
});

describe('accessibleTanks - Boundary Value Analysis', () => {
  test('BVA1: WORKER with zero assigned tanks gets an empty array (not an error)', () => {
    const user = { role: 'WORKER', assignedTankIds: [] };
    expect(accessibleTanks(user, allTanks)).toEqual([]);
  });

  test('BVA2: WORKER assigned exactly one tank out of many gets exactly that one', () => {
    const user = { role: 'WORKER', assignedTankIds: ['t1'] };
    expect(accessibleTanks(user, allTanks)).toHaveLength(1);
  });

  test('BVA3: WORKER assigned every tank ID gets all of them (upper boundary)', () => {
    const user = { role: 'WORKER', assignedTankIds: ['t1', 't2', 't3', 't4'] };
    expect(accessibleTanks(user, allTanks)).toHaveLength(4);
  });

  test('BVA4: ADMIN whose organization has zero matching tanks gets an empty array', () => {
    const user = { role: 'ADMIN', organizationId: 'org-does-not-exist' };
    expect(accessibleTanks(user, allTanks)).toEqual([]);
  });

  test('BVA5: empty allTanks list returns empty array for SUPER_ADMIN', () => {
    const user = { role: 'SUPER_ADMIN' };
    expect(accessibleTanks(user, [])).toEqual([]);
  });
});

describe('accessibleTanks - Error / Negative Cases', () => {
  test('ERR1: null user throws TypeError', () => {
    expect(() => accessibleTanks(null, allTanks)).toThrow(TypeError);
  });

  test('ERR2: user missing role throws RangeError', () => {
    expect(() => accessibleTanks({}, allTanks)).toThrow(RangeError);
  });

  test('ERR3: allTanks not an array throws TypeError', () => {
    const user = { role: 'SUPER_ADMIN' };
    expect(() => accessibleTanks(user, null)).toThrow(TypeError);
  });

  test('ERR4: ADMIN without an organizationId throws TypeError', () => {
    const user = { role: 'ADMIN' };
    expect(() => accessibleTanks(user, allTanks)).toThrow(TypeError);
  });

  test('ERR5: WORKER with assignedTankIds not an array is treated as no assignments', () => {
    const user = { role: 'WORKER', assignedTankIds: 'not-an-array' };
    expect(accessibleTanks(user, allTanks)).toEqual([]);
  });
});