import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StreamLimitExceededModal } from '../StreamLimitExceededModal';

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue: string, params?: any) => {
      if (params) {
        let result = defaultValue;
        Object.keys(params).forEach((param) => {
          result = result.replace(`{{${param}}}`, String(params[param]));
        });
        return result;
      }
      return defaultValue;
    },
  }),
}));

const mockActiveDevices = [
  { device_id: 'device-1', device_name: 'iPhone 15 Pro', content_id: 'content-1' },
  { device_id: 'device-2', device_name: 'iPad Air', content_id: 'content-2' },
];

describe('StreamLimitExceededModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    render(
      <BrowserRouter>
        <StreamLimitExceededModal
          visible={true}
          maxStreams={2}
          activeStreams={2}
          activeDevices={mockActiveDevices}
          onClose={jest.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('Stream Limit Reached')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    const { container } = render(
      <BrowserRouter>
        <StreamLimitExceededModal
          visible={false}
          maxStreams={2}
          activeStreams={2}
          activeDevices={mockActiveDevices}
          onClose={jest.fn()}
        />
      </BrowserRouter>
    );

    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('should display correct stream limit in message', () => {
    render(
      <BrowserRouter>
        <StreamLimitExceededModal
          visible={true}
          maxStreams={4}
          activeStreams={4}
          activeDevices={mockActiveDevices}
          onClose={jest.fn()}
        />
      </BrowserRouter>
    );

    expect(
      screen.getByText(/You have reached the maximum number of concurrent streams \(4\)/)
    ).toBeInTheDocument();
  });

  it('should display active device count', () => {
    render(
      <BrowserRouter>
        <StreamLimitExceededModal
          visible={true}
          maxStreams={2}
          activeStreams={2}
          activeDevices={mockActiveDevices}
          onClose={jest.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText(/Currently streaming on 2 device\(s\):/)).toBeInTheDocument();
  });

  it('should render list of active devices', () => {
    render(
      <BrowserRouter>
        <StreamLimitExceededModal
          visible={true}
          maxStreams={2}
          activeStreams={2}
          activeDevices={mockActiveDevices}
          onClose={jest.fn()}
        />
      </BrowserRouter>
    );

    expect(screen.getByText('iPhone 15 Pro')).toBeInTheDocument();
    expect(screen.getByText('iPad Air')).toBeInTheDocument();
  });

  it('should display hint message', () => {
    render(
      <BrowserRouter>
        <StreamLimitExceededModal
          visible={true}
          maxStreams={2}
          activeStreams={2}
          activeDevices={mockActiveDevices}
          onClose={jest.fn()}
        />
      </BrowserRouter>
    );

    expect(
      screen.getByText(
        /Disconnect a device to free up a streaming slot, or upgrade your plan/
      )
    ).toBeInTheDocument();
  });

  it('should call onClose when Cancel button clicked', () => {
    const onClose = jest.fn();

    render(
      <BrowserRouter>
        <StreamLimitExceededModal
          visible={true}
          maxStreams={2}
          activeStreams={2}
          activeDevices={mockActiveDevices}
          onClose={onClose}
        />
      </BrowserRouter>
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should navigate to devices page when Manage Devices clicked', () => {
    const onClose = jest.fn();

    render(
      <BrowserRouter>
        <StreamLimitExceededModal
          visible={true}
          maxStreams={2}
          activeStreams={2}
          activeDevices={mockActiveDevices}
          onClose={onClose}
        />
      </BrowserRouter>
    );

    const manageButton = screen.getByText('Manage Devices');
    fireEvent.click(manageButton);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/profile?tab=devices');
  });

  describe('Device Icon Selection', () => {
    it('should show Smartphone icon for iPhone', () => {
      const { container } = render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={2}
            activeStreams={1}
            activeDevices={[
              { device_id: 'device-1', device_name: 'iPhone 15', content_id: 'content-1' },
            ]}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
      // Icon is rendered as SVG
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('should show Smartphone icon for Android', () => {
      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={2}
            activeStreams={1}
            activeDevices={[
              {
                device_id: 'device-1',
                device_name: 'Android Phone',
                content_id: 'content-1',
              },
            ]}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Android Phone')).toBeInTheDocument();
    });

    it('should show TV icon for Apple TV', () => {
      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={4}
            activeStreams={1}
            activeDevices={[
              { device_id: 'device-1', device_name: 'Apple TV 4K', content_id: 'content-1' },
            ]}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Apple TV 4K')).toBeInTheDocument();
    });

    it('should show Tablet icon for iPad', () => {
      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={2}
            activeStreams={1}
            activeDevices={[
              { device_id: 'device-1', device_name: 'iPad Pro', content_id: 'content-1' },
            ]}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('iPad Pro')).toBeInTheDocument();
    });

    it('should show Monitor icon for desktop browsers', () => {
      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={2}
            activeStreams={1}
            activeDevices={[
              {
                device_id: 'device-1',
                device_name: 'Chrome on Windows 11',
                content_id: 'content-1',
              },
            ]}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Chrome on Windows 11')).toBeInTheDocument();
    });
  });

  describe('Multiple Active Devices', () => {
    it('should render 4 devices for Family plan', () => {
      const fourDevices = [
        { device_id: '1', device_name: 'iPhone 15', content_id: 'c1' },
        { device_id: '2', device_name: 'iPad Air', content_id: 'c2' },
        { device_id: '3', device_name: 'Apple TV', content_id: 'c3' },
        { device_id: '4', device_name: 'MacBook Pro', content_id: 'c4' },
      ];

      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={4}
            activeStreams={4}
            activeDevices={fourDevices}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('iPhone 15')).toBeInTheDocument();
      expect(screen.getByText('iPad Air')).toBeInTheDocument();
      expect(screen.getByText('Apple TV')).toBeInTheDocument();
      expect(screen.getByText('MacBook Pro')).toBeInTheDocument();
    });

    it('should handle empty devices array', () => {
      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={2}
            activeStreams={0}
            activeDevices={[]}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText(/Currently streaming on 0 device\(s\):/)).toBeInTheDocument();
    });
  });

  describe('Subscription Tiers', () => {
    it('should display Basic plan limit (1 stream)', () => {
      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={1}
            activeStreams={1}
            activeDevices={mockActiveDevices.slice(0, 1)}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(
        screen.getByText(/You have reached the maximum number of concurrent streams \(1\)/)
      ).toBeInTheDocument();
    });

    it('should display Premium plan limit (2 streams)', () => {
      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={2}
            activeStreams={2}
            activeDevices={mockActiveDevices}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(
        screen.getByText(/You have reached the maximum number of concurrent streams \(2\)/)
      ).toBeInTheDocument();
    });

    it('should display Family plan limit (4 streams)', () => {
      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={4}
            activeStreams={4}
            activeDevices={mockActiveDevices}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(
        screen.getByText(/You have reached the maximum number of concurrent streams \(4\)/)
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have warning modal type', () => {
      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={2}
            activeStreams={2}
            activeDevices={mockActiveDevices}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      // GlassModal with type="warning" should be rendered
      expect(screen.getByText('Stream Limit Reached')).toBeInTheDocument();
    });

    it('should have accessible button labels', () => {
      render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={2}
            activeStreams={2}
            activeDevices={mockActiveDevices}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Manage Devices')).toBeInTheDocument();
    });

    it('should truncate long device names', () => {
      const longNameDevice = [
        {
          device_id: 'device-1',
          device_name: 'This is a very long device name that should be truncated',
          content_id: 'content-1',
        },
      ];

      const { container } = render(
        <BrowserRouter>
          <StreamLimitExceededModal
            visible={true}
            maxStreams={2}
            activeStreams={1}
            activeDevices={longNameDevice}
            onClose={jest.fn()}
          />
        </BrowserRouter>
      );

      const deviceNameElement = screen.getByText(
        'This is a very long device name that should be truncated'
      );

      expect(deviceNameElement).toBeInTheDocument();
      // numberOfLines={1} style should be applied
      expect(deviceNameElement).toHaveStyle({ flex: 1 });
    });
  });
});
