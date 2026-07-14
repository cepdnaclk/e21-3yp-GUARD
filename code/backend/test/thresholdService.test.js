import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publishThresholdsToDevice } from '../src/services/thresholdService.js';
import { publishThresholdConfig } from '../src/services/mqttService.js';

// Mock mqttService
vi.mock('../src/services/mqttService.js', () => ({
  publishThresholdConfig: vi.fn(),
}));

describe('thresholdService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publishThresholdsToDevice', () => {
    it('should correctly format thresholds to float-strings and publish to proper MQTT topics', async () => {
      vi.mocked(publishThresholdConfig).mockResolvedValue(undefined);

      const tankId = 'GUARD-100';
      const thresholds = {
        temp_min: 22.5,
        temp_max: 28,
        tds_min: 200,
        tds_max: 600.75,
      };

      await publishThresholdsToDevice(tankId, thresholds);

      expect(publishThresholdConfig).toHaveBeenCalledTimes(4);

      expect(publishThresholdConfig).toHaveBeenCalledWith('device/GUARD-100/set/temp_min', '22.5');
      expect(publishThresholdConfig).toHaveBeenCalledWith('device/GUARD-100/set/temp_max', '28');
      expect(publishThresholdConfig).toHaveBeenCalledWith('device/GUARD-100/set/tds_min', '200');
      expect(publishThresholdConfig).toHaveBeenCalledWith('device/GUARD-100/set/tds_max', '600.75');
    });

    it('should propagate errors if publishThresholdConfig fails', async () => {
      const errorMsg = 'MQTT Broker Offline';
      vi.mocked(publishThresholdConfig).mockRejectedValue(new Error(errorMsg));

      const tankId = 'GUARD-100';
      const thresholds = {
        temp_min: 22.5,
      };

      await expect(publishThresholdsToDevice(tankId, thresholds)).rejects.toThrow(errorMsg);
    });
  });
});
