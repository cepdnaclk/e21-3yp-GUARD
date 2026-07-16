import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateThresholds, getThresholds } from '../../code/backend/src/controllers/thresholdController.js';
import prisma from '../../code/backend/src/lib/prisma.js';
import { findAccessibleTank } from '../../code/backend/src/lib/tankAccess.js';
import { publishThresholdsToDevice } from '../../code/backend/src/services/thresholdService.js';
import { processAlert } from '../../code/backend/src/services/mqttService.js';
import { AppError } from '../../code/backend/src/lib/AppError.js';

// Mock all internal modules
vi.mock('../../code/backend/src/lib/prisma.js', () => ({
  default: {
    tank: {
      update: vi.fn(),
    },
  },
}));

vi.mock('../../code/backend/src/lib/tankAccess.js', () => ({
  findAccessibleTank: vi.fn(),
}));

vi.mock('../../code/backend/src/services/thresholdService.js', () => ({
  publishThresholdsToDevice: vi.fn(),
}));

vi.mock('../../code/backend/src/services/mqttService.js', () => ({
  processAlert: vi.fn(),
}));

describe('thresholdController', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  const mockTank = {
    id: '60c72b2f9b1d8a0015f8a001',
    tankId: 'GUARD-001',
    name: 'Main Tank',
    adminId: 'user-admin-1',
    workerIds: ['worker-1'],
    tempMin: 22,
    tempMax: 28,
    phMin: 6.5,
    phMax: 8.5,
    tdsMin: 200,
    tdsMax: 600,
    turbidityMax: 20,
    waterLevelThreshold: 80,
    waterStopThreshold: 10,
    lastTemp: 24,
    lastPh: 7.2,
    lastTds: 300,
    lastTurb: 10,
    lastWaterLevel: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      params: { tankId: 'GUARD-001' },
      body: {},
      user: { userId: 'user-admin-1', role: 'ADMIN' },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  describe('getThresholds', () => {
    it('should return thresholds if the user has access to the tank', async () => {
      vi.mocked(findAccessibleTank).mockResolvedValue(mockTank);

      await getThresholds(mockReq, mockRes, mockNext);

      expect(findAccessibleTank).toHaveBeenCalledWith('GUARD-001', mockReq.user);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        tankId: 'GUARD-001',
        thresholds: {
          tempMin: 22,
          tempMax: 28,
          phMin: 6.5,
          phMax: 8.5,
          tdsMin: 200,
          tdsMax: 600,
          turbidityMax: 20,
          waterLevelThreshold: 80,
          waterStopThreshold: 10,
        },
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should pass a 404 AppError to next if the tank is not found or inaccessible', async () => {
      vi.mocked(findAccessibleTank).mockResolvedValue(null);

      await getThresholds(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const errorPassed = mockNext.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(404);
      expect(errorPassed.message).toBe('Tank not found or access denied.');
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('updateThresholds', () => {
    it('should throw a 403 Forbidden error if user is a standard worker (USER role)', async () => {
      vi.mocked(findAccessibleTank).mockResolvedValue(mockTank);
      mockReq.user.role = 'USER';
      mockReq.body = { tempMin: 24 };

      await updateThresholds(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const errorPassed = mockNext.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(403);
      expect(errorPassed.message).toBe('Workers cannot update device thresholds.');
    });

    it('should reject unknown threshold fields', async () => {
      mockReq.body = { tempMin: 24, unknown_field: 99 };

      await updateThresholds(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const errorPassed = mockNext.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(400);
      expect(errorPassed.message).toContain('Unknown threshold fields: unknown_field');
    });

    it('should reject non-numeric threshold values', async () => {
      mockReq.body = { tempMin: 'invalid-number' };

      await updateThresholds(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const errorPassed = mockNext.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(400);
      expect(errorPassed.message).toContain('Invalid value for "tempMin"');
    });

    it('should enforce min < max boundary validation', async () => {
      mockReq.body = { tempMin: 30, tempMax: 25 };

      await updateThresholds(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      const errorPassed = mockNext.mock.calls[0][0];
      expect(errorPassed.statusCode).toBe(400);
      expect(errorPassed.message).toBe('Temperature Min must be less than Temperature Max.');
    });

    it('should update thresholds successfully in DB and trigger MQTT publish for supported keys', async () => {
      vi.mocked(findAccessibleTank).mockResolvedValue(mockTank);
      const updatedTank = {
        ...mockTank,
        tempMin: 24,
        tempMax: 29,
        phMin: 7.0,
      };
      vi.mocked(prisma.tank.update).mockResolvedValue(updatedTank);
      vi.mocked(publishThresholdsToDevice).mockResolvedValue(undefined);

      mockReq.body = { tempMin: 24, tempMax: 29, phMin: 7.0 };

      await updateThresholds(mockReq, mockRes, mockNext);

      expect(prisma.tank.update).toHaveBeenCalledWith({
        where: { tankId: 'GUARD-001' },
        data: { tempMin: 24, tempMax: 29, phMin: 7 },
      });

      expect(publishThresholdsToDevice).toHaveBeenCalledWith('GUARD-001', {
        temp_min: 24,
        temp_max: 29,
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Thresholds updated successfully.',
        thresholds: {
          tempMin: 24,
          tempMax: 29,
          phMin: 7.0,
          phMax: 8.5,
          tdsMin: 200,
          tdsMax: 600,
          turbidityMax: 20,
          waterLevelThreshold: 80,
          waterStopThreshold: 10,
        },
      });
    });

    it('should trigger proactive alerts immediately if current readings violate new thresholds', async () => {
      vi.mocked(findAccessibleTank).mockResolvedValue(mockTank);
      const updatedTank = {
        ...mockTank,
        lastTemp: 24,
        tempMin: 25,
        tempMax: 30,
      };
      vi.mocked(prisma.tank.update).mockResolvedValue(updatedTank);
      vi.mocked(publishThresholdsToDevice).mockResolvedValue(undefined);

      mockReq.body = { tempMin: 25, tempMax: 30 };

      await updateThresholds(mockReq, mockRes, mockNext);

      expect(processAlert).toHaveBeenCalledWith('GUARD-001', 'temperature', 'LOW', 24);
    });
  });
});
