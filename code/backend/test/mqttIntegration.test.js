import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock external services before importing anything that depends on them
vi.mock('../src/lib/influx.js', () => ({
  writeApi: {
    writePoint: vi.fn(),
  },
}));

vi.mock('../src/services/emailService.js', () => ({
  sendAlertEmail: vi.fn(),
}));

vi.mock('../src/services/telegramService.js', () => ({
  sendTelegramMessage: vi.fn(),
}));

import { initMqtt, publishThresholdConfig } from '../src/services/mqttService.js';
import { publishThresholdsToDevice } from '../src/services/thresholdService.js';
import prisma from '../src/lib/prisma.js';
import mqtt from 'mqtt';

// Mock mqtt dependency
const mockMqttClient = {
  on: vi.fn(),
  subscribe: vi.fn(),
  publish: vi.fn(),
  end: vi.fn(),
  connected: true,
};

vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => mockMqttClient),
  },
}));

// Mock Prisma
vi.mock('../src/lib/prisma.js', () => ({
  default: {
    tank: {
      findUnique: vi.fn(),
    },
  },
}));

describe('MQTT Integration - ESP32 Threshold Sync', () => {
  let messageHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMqttClient.connected = true;

    // Stub mockMqttClient.publish to immediately fire callback (representing broker success)
    mockMqttClient.publish.mockImplementation((topic, message, options, callback) => {
      if (typeof options === 'function') {
        options();
      } else if (callback) {
        callback();
      }
    });

    // Capture the message handler registered during initMqtt
    mockMqttClient.on.mockImplementation((event, callback) => {
      if (event === 'message') {
        messageHandler = callback;
      }
    });

    // Initialize MQTT module
    initMqtt(null);
  });

  describe('Values coming to the ESP32 (publishThresholdConfig)', () => {
    it('should publish threshold configuration updates to the ESP32 with QoS 1 and Retain', async () => {
      const topic = 'device/GUARD-100/set/temp_min';
      const payload = '24.5';

      await publishThresholdConfig(topic, payload);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        topic,
        payload,
        { qos: 1, retain: true },
        expect.any(Function)
      );
    });

    it('should throw an error if trying to publish when broker is not connected', () => {
      mockMqttClient.connected = false;

      expect(() =>
        publishThresholdConfig('device/GUARD-100/set/temp_min', '24.5')
      ).toThrow('MQTT broker is not connected.');
    });
  });

  describe('Fetching values from the board (device/+/request_thresholds)', () => {
    it('should fetch thresholds from DB and publish them to ESP32 topics upon a request_thresholds trigger', async () => {
      expect(messageHandler).toBeDefined();

      const mockTank = {
        tankId: 'GUARD-100',
        tempMin: 23.5,
        tempMax: 27.8,
        tdsMin: 150,
        tdsMax: 450,
        waterLevelThreshold: 90,
        waterStopThreshold: 15,
      };

      vi.mocked(prisma.tank.findUnique).mockResolvedValue(mockTank);

      // Simulate ESP32 sending a request_thresholds message
      await messageHandler('device/GUARD-100/request_thresholds', Buffer.from(''), {});

      // Verify DB lookup
      expect(prisma.tank.findUnique).toHaveBeenCalledWith({
        where: { tankId: 'GUARD-100' },
      });

      // Verify all DB thresholds are published back to device
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'device/GUARD-100/set/temp_min',
        '23.5',
        { qos: 1, retain: true },
        expect.any(Function)
      );
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'device/GUARD-100/set/temp_max',
        '27.8',
        { qos: 1, retain: true },
        expect.any(Function)
      );
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'device/GUARD-100/set/tds_min',
        '150',
        { qos: 1, retain: true },
        expect.any(Function)
      );
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'device/GUARD-100/set/tds_max',
        '450',
        { qos: 1, retain: true },
        expect.any(Function)
      );
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'device/GUARD-100/set/water_level',
        '90',
        { qos: 1, retain: true },
        expect.any(Function)
      );
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'device/GUARD-100/set/water_stop',
        '15',
        { qos: 1, retain: true },
        expect.any(Function)
      );
    });

    it('should print warning log and NOT publish if requested tankId is not in MongoDB', async () => {
      vi.mocked(prisma.tank.findUnique).mockResolvedValue(null);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await messageHandler('device/GUARD-UNKNOWN/request_thresholds', Buffer.from(''), {});

      expect(prisma.tank.findUnique).toHaveBeenCalledWith({
        where: { tankId: 'GUARD-UNKNOWN' },
      });
      // Should not publish anything back
      expect(mockMqttClient.publish).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('requested thresholds but tank not found in DB')
      );

      warnSpy.mockRestore();
    });
  });
});
