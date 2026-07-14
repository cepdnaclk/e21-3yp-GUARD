import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ThresholdsPanel from '../ThresholdsPanel';
import { deviceApi } from '../../services/api';

// Mock the services/api module
vi.mock('../../services/api', () => ({
  deviceApi: {
    updateThresholds: vi.fn(),
  },
}));

describe('ThresholdsPanel', () => {
  const initialThresholds = {
    tempMin: 22,
    tempMax: 28,
    phMin: 6.5,
    phMax: 8.5,
    tdsMin: 200,
    tdsMax: 600,
    waterStopThreshold: 10,  // MinLabel: High (Stop)
    waterLevelThreshold: 80, // MaxLabel: Low (Dist)
    turbidityMax: 15,
  };

  const tankId = 'GUARD-001';
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders system thresholds header and all categories', () => {
    render(<ThresholdsPanel tankId={tankId} initialThresholds={initialThresholds} onUpdate={mockOnUpdate} />);

    expect(screen.getByText('System Thresholds')).toBeInTheDocument();
    expect(screen.getByText('Dual-range monitoring limits')).toBeInTheDocument();
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('pH Level')).toBeInTheDocument();
    expect(screen.getByText('TDS (Purity)')).toBeInTheDocument();
    expect(screen.getByText('Water Depth')).toBeInTheDocument();
    expect(screen.getByText('Turbidity')).toBeInTheDocument();
  });

  it('displays default range limits if initial thresholds are missing', () => {
    render(<ThresholdsPanel tankId={tankId} initialThresholds={{}} onUpdate={mockOnUpdate} />);
    
    // Check ph values default to 0 and 14
    expect(screen.getByText('Min: 0')).toBeInTheDocument();
    expect(screen.getByText('Max: 14')).toBeInTheDocument();
  });

  it('prevents crossover of min and max slider values', async () => {
    render(<ThresholdsPanel tankId={tankId} initialThresholds={initialThresholds} onUpdate={mockOnUpdate} />);

    const sliders = screen.getAllByRole('slider');
    const tempMinSlider = sliders[0];
    const tempMaxSlider = sliders[1];

    expect(tempMinSlider).toHaveValue('22');
    expect(tempMaxSlider).toHaveValue('28');

    // Attempting to set min greater than max (e.g. 29) should be ignored
    fireEvent.change(tempMinSlider, { target: { value: '29' } });
    expect(tempMinSlider).toHaveValue('22'); 

    // Attempting to set max less than min (e.g. 20) should be ignored
    fireEvent.change(tempMaxSlider, { target: { value: '20' } });
    expect(tempMaxSlider).toHaveValue('28');
  });

  it('updates state and submits the expected payload to deviceApi.updateThresholds', async () => {
    deviceApi.updateThresholds.mockResolvedValueOnce({ success: true });

    render(<ThresholdsPanel tankId={tankId} initialThresholds={initialThresholds} onUpdate={mockOnUpdate} />);

    const sliders = screen.getAllByRole('slider');
    const tempMinSlider = sliders[0];

    // Change tempMin from 22 to 24 (valid change as 24 < 28)
    fireEvent.change(tempMinSlider, { target: { value: '24' } });
    expect(tempMinSlider).toHaveValue('24');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: /Apply & Sync/i });
    fireEvent.click(submitButton);

    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Processing...');

    await waitFor(() => {
      expect(deviceApi.updateThresholds).toHaveBeenCalledWith(tankId, {
        ...initialThresholds,
        tempMin: 24,
      });
      expect(screen.getByText('Thresholds synced successfully!')).toBeInTheDocument();
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('displays an error message if the API sync fails', async () => {
    const apiError = new Error('Network timeout');
    deviceApi.updateThresholds.mockRejectedValueOnce(apiError);

    render(<ThresholdsPanel tankId={tankId} initialThresholds={initialThresholds} onUpdate={mockOnUpdate} />);

    const submitButton = screen.getByRole('button', { name: /Apply & Sync/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
      expect(submitButton).toHaveTextContent('Apply & Sync to Device');
    });
  });
});
