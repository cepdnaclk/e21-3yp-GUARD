import { jest } from '@jest/globals';

// Create fake Prisma functions
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();

// Replace the real Prisma module with a fake Prisma module
jest.unstable_mockModule('../src/lib/prisma.js', () => ({
  default: {
    tank: {
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
    },
  },
}));

// Import after mocking Prisma
const { findAccessibleTank } = await import('../src/lib/tankAccess.js');

describe('findAccessibleTank - Equivalence Partitioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('EP1: SUPER_ADMIN can access an existing tank', async () => {
    const tank = {
      tankId: 'tank-1',
      adminId: 'admin-1',
      workerIds: ['user-1'],
    };

    mockFindUnique.mockResolvedValue(tank);

    const user = {
      userId: 'root',
      role: 'SUPER_ADMIN',
    };

    const result = await findAccessibleTank('tank-1', user);

    expect(result).toEqual(tank);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        tankId: 'tank-1',
      },
    });
  });

  test('EP2: ADMIN who owns the tank can access it', async () => {
    const tank = {
      tankId: 'tank-1',
      adminId: 'admin-1',
      workerIds: [],
    };

    mockFindFirst.mockResolvedValue(tank);

    const user = {
      userId: 'admin-1',
      role: 'ADMIN',
    };

    const result = await findAccessibleTank('tank-1', user);

    expect(result).toEqual(tank);

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        tankId: 'tank-1',
        adminId: 'admin-1',
      },
    });
  });

  test('EP3: ADMIN who does not own the tank is denied', async () => {
    mockFindFirst.mockResolvedValue(null);

    const user = {
      userId: 'admin-2',
      role: 'ADMIN',
    };

    const result = await findAccessibleTank('tank-1', user);

    expect(result).toBeNull();
  });

  test('EP4: USER assigned to the tank can access it', async () => {
    const tank = {
      tankId: 'tank-1',
      adminId: 'admin-1',
      workerIds: ['user-1'],
    };

    mockFindFirst.mockResolvedValue(tank);

    const user = {
      userId: 'user-1',
      role: 'USER',
    };

    const result = await findAccessibleTank('tank-1', user);

    expect(result).toEqual(tank);

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: {
        tankId: 'tank-1',
        workerIds: {
          has: 'user-1',
        },
      },
    });
  });

  test('EP5: USER not assigned to the tank is denied', async () => {
    mockFindFirst.mockResolvedValue(null);

    const user = {
      userId: 'user-2',
      role: 'USER',
    };

    const result = await findAccessibleTank('tank-1', user);

    expect(result).toBeNull();
  });

  test('EP6: unknown role is denied without querying database', async () => {
    const user = {
      userId: 'guest-1',
      role: 'GUEST',
    };

    const result = await findAccessibleTank('tank-1', user);

    expect(result).toBeNull();
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockFindFirst).not.toHaveBeenCalled();
  });
});

describe('findAccessibleTank - Boundary and Negative Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('BVA1: exact tankId is passed to Prisma', async () => {
    mockFindUnique.mockResolvedValue({
      tankId: 'tank-1',
    });

    const user = {
      userId: 'root',
      role: 'SUPER_ADMIN',
    };

    await findAccessibleTank('tank-1', user);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: {
        tankId: 'tank-1',
      },
    });
  });

  test('BVA2: nonexistent tank returns null', async () => {
    mockFindUnique.mockResolvedValue(null);

    const user = {
      userId: 'root',
      role: 'SUPER_ADMIN',
    };

    const result = await findAccessibleTank('tank-999', user);

    expect(result).toBeNull();
  });

  test('ERR1: database error is passed to the caller', async () => {
    mockFindUnique.mockRejectedValue(
      new Error('Database connection failed')
    );

    const user = {
      userId: 'root',
      role: 'SUPER_ADMIN',
    };

    await expect(
      findAccessibleTank('tank-1', user)
    ).rejects.toThrow('Database connection failed');
  });
});