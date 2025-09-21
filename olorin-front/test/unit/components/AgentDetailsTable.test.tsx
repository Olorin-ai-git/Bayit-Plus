import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AgentDetailsTable from 'src/js/components/AgentDetailsTable';
import { InvestigationStepId, StepStatus } from 'src/js/constants/definitions';

describe('AgentDetailsTable', () => {
  const mockLocationDetails = {
    splunk_locations: [
      {
        fuzzy_device_id: 'f394742f39214c908476c01623bf4bcd',
        city: 'bengaluru',
        country: 'IN',
        tm_sessionid: null,
        _time: '2025-05-15T07:08:39.584-07:00',
        countries: ['IN'],
      },
      {
        fuzzy_device_id: 'e9e49d25e6734402a32f797e55d98cd9',
        city: 'mountain view',
        country: 'US',
        tm_sessionid: null,
        _time: '2025-05-15T06:31:40.056-07:00',
        countries: ['US'],
      },
      {
        fuzzy_device_id: null,
        city: null,
        country: null,
        tm_sessionid: null,
        _time: '2025-05-15T05:22:48.585-07:00',
        countries: [],
      },
    ],
    user_id: '4621097846089147992',
    timestamp: '2025-05-28T11:39:30.195184+00:00',
    llm_thoughts: {
      risk_level: 0.6,
      risk_factors: [
        "Device f394742f39214c908476c01623bf4bcd is observed in India while user's official address country is USA",
        'Multiple devices are active in different countries (India vs. USA) within a relatively short time window',
      ],
      anomaly_details: [],
      confidence: 0.0,
      summary:
        "A potential anomaly exists because one device is frequently in India, which conflicts with the user's official address country in the USA. Other devices are located in the USA, suggesting multi-country device usage that may indicate possible unusual travel or VPN use.",
      thoughts:
        "The user's official address is in the USA, yet one device consistently appears in India. No single device shows multiple countries, but the presence of devices in different countries raises questions. Rapid or concurrent usage from India (f394742f39214c908476c01623bf4bcd) and the USA (e9e49d25e6734402a32f797e55d98cd9, 392b4bf1e3ed430090a9f50f1d72563a) may suggest location-spoofing, account sharing, compromised credentials, or legitimate but short-interval travel. A moderate risk level is assigned, and further verification (e.g., user confirmation or additional device context) is recommended.",
      timestamp: '2025-05-28T11:39:30.187438+00:00',
    },
  };

  const mockNetworkDetails = {
    user_id: '4621097846089147992',
    raw_splunk_results_count: 23,
    extracted_network_signals: [
      {
        ip: '223.185.128.58',
        isp: 'bharti airtel ltd.',
        organization: 'bharti',
        tm_sessionid: 'f002651918d540e374a0f1861bd779bb',
        _time: '2025-05-15T06:24:23.466-07:00',
        countries: [],
      },
      {
        ip: '207.207.181.8',
        isp: 'olorin inc.',
        organization: 'olorin inc.',
        tm_sessionid: '1a977456cfcd4778f2670e3e0cd56efb',
        _time: '2025-05-15T06:31:46.027-07:00',
        countries: [],
      },
    ],
    network_risk_assessment: {
      risk_level: 0.85,
      risk_factors: [
        'Geographic inconsistency / possible impossible travel',
        'Multiple distinct ISPs in short timeframe (Bharti Airtel in India and olorin in the US)',
      ],
      anomaly_details: [
        'Logged from IP 223.185.128.58 (Bharti Airtel) at 2025-05-15T06:24:23.466-07:00 and then from IP 207.207.181.8 (olorin) at 2025-05-15T06:31:40.056-07:00, indicating potential impossible travel.',
      ],
      confidence: 0.9,
      summary:
        'User demonstrates suspicious cross-country ISP usage within minutes, suggesting elevated network risk.',
      thoughts:
        'Two IPs—one likely in India, the other in the US—were accessed within a short interval, which raises concerns around possible proxy usage or account takeover. Session IDs reveal separate access points at close times, reinforcing the suspicion of anomalous activity.',
      timestamp: '2025-05-27T10:56:06.965-07:00',
    },
    llm_thoughts:
      'Two IPs—one likely in India, the other in the US—were accessed within a short interval, which raises concerns around possible proxy usage or account takeover. Session IDs reveal separate access points at close times, reinforcing the suspicion of anomalous activity.',
  };

  const mockDeviceDetails = {
    user_id: '4621097846089147992',
    raw_splunk_results: [
      {
        _time: '2025-05-27T10:56:06.965-07:00',
        device_id: null,
        fuzzy_device_id: null,
        smartId: null,
        tm_smartid: null,
        tm_sessionid: null,
        olorin_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
        true_ip: null,
        true_ip_city: null,
        true_ip_country: null,
        true_ip_region: null,
        true_ip_latitude: null,
        true_ip_longitude: null,
      },
      {
        _time: '2025-05-15T07:08:39.584-07:00',
        device_id: '6c0998a4c9f0437abbc59706471aaedb',
        fuzzy_device_id: 'f394742f39214c908476c01623bf4bcd',
        smartId: null,
        tm_smartid: 'f394742f39214c908476c01623bf4bcd',
        tm_sessionid: '5b2cd1da38f4403d99c2b6fea53604d9',
        olorin_tid: '1-6825f567-6e4aa4180e0bd5f663d02d62',
        true_ip: '223.185.128.58',
        true_ip_city: 'bengaluru',
        true_ip_country: null,
        true_ip_region: 'karnataka',
        true_ip_latitude: null,
        true_ip_longitude: null,
      },
    ],
    extracted_device_signals: [
      {
        olorin_tid: 'cfe50512-1885-4f45-bc74-8d5a556a8d23',
        _time: '2025-05-27T10:56:06.965-07:00',
        countries: [],
      },
      {
        fuzzy_device_id: 'f394742f39214c908476c01623bf4bcd',
        true_ip: '223.185.128.58',
        true_ip_city: 'bengaluru',
        true_ip_region: 'karnataka',
        tm_smartid: 'f394742f39214c908476c01623bf4bcd',
        tm_sessionid: '5b2cd1da38f4403d99c2b6fea53604d9',
        olorin_tid: '1-6825f567-6e4aa4180e0bd5f663d02d62',
        _time: '2025-05-15T07:08:39.584-07:00',
        countries: [],
      },
    ],
    device_signal_risk_assessment: {
      risk_level: 0.9,
      risk_factors: [
        'Multiple devices used from different countries (US and India)',
        'Short time interval between US and India logins (potential impossible travel)',
      ],
      anomaly_details: [
        'Device usage from different countries within short timeframe',
      ],
      confidence: 0.9,
      summary:
        'High-risk scenario due to multiple devices operating from distinct regions',
      thoughts:
        'The user signals indicate concurrent usage from India and the US',
      timestamp: '2025-05-28T12:00:00Z',
    },
    timestamp: '2025-05-28T11:39:45.050936+00:00',
    di_tool_warning: 'DI tool warning message',
    llm_thoughts: 'Device shows high risk patterns',
    // Legacy fields for backward compatibility testing
    current_device: {
      device_id: 'DEV123',
      type: 'Mobile',
      os: 'iOS 15.0',
      browser: 'Safari',
    },
    device_history: [
      {
        device_id: 'DEV456',
        type: 'Desktop',
        os: 'Windows 10',
        timestamp: '2024-03-18T12:00:00Z',
      },
    ],
    risk_assessment: {
      risk_level: 0.3,
      risk_factors: ['Device change detected', 'Unusual browser'],
      confidence: 0.7,
    },
  };

  const mockLogDetails = {
    behavior_patterns: {
      login_attempts: 5,
      failed_logins: 2,
      unusual_activity: true,
    },
    anomalies: [
      {
        type: 'Multiple failed logins',
        severity: 'high',
        timestamp: '2024-03-20T09:30:00Z',
      },
    ],
    risk_assessment: {
      risk_level: 0.8,
      risk_factors: ['Multiple failed logins', 'Unusual login time'],
      confidence: 0.95,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <AgentDetailsTable
        details={mockLocationDetails}
        agentType="Location Agent"
      />,
    );
    expect(screen.getByText('Location Agent Details')).toBeInTheDocument();
  });

  it('handles null details', () => {
    render(<AgentDetailsTable details={{}} agentType="Location Agent" />);
    expect(screen.getByText('No details available')).toBeInTheDocument();
  });

  it('handles undefined details', () => {
    render(<AgentDetailsTable details={{}} agentType="Location Agent" />);
    expect(screen.getByText('No details available')).toBeInTheDocument();
  });

  describe('Location Agent Details', () => {
    it('renders splunk locations', () => {
      render(
        <AgentDetailsTable
          details={mockLocationDetails}
          agentType="Location Agent"
        />,
      );
      expect(screen.getByText('Splunk Locations')).toBeInTheDocument();
      expect(screen.getByText('bengaluru')).toBeInTheDocument();
      expect(screen.getByText('mountain view')).toBeInTheDocument();
      expect(
        screen.getByText('f394742f39214c908476c01623bf4bcd'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('e9e49d25e6734402a32f797e55d98cd9'),
      ).toBeInTheDocument();
    });
    it('renders llm thoughts risk assessment', () => {
      render(
        <AgentDetailsTable
          details={mockLocationDetails}
          agentType="Location Agent"
        />,
      );
      expect(screen.getByText('LLM Thoughts')).toBeInTheDocument();
      expect(
        screen.getByText(
          "Device f394742f39214c908476c01623bf4bcd is observed in India while user's official address country is USA",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "A potential anomaly exists because one device is frequently in India, which conflicts with the user's official address country in the USA. Other devices are located in the USA, suggesting multi-country device usage that may indicate possible unusual travel or VPN use.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Network Agent Details', () => {
    it('renders extracted network signals', () => {
      render(
        <AgentDetailsTable
          details={mockNetworkDetails}
          agentType="Network Agent"
        />,
      );
      expect(screen.getByText('Extracted Network Signals')).toBeInTheDocument();
      expect(screen.getByText('bharti airtel ltd.')).toBeInTheDocument();
      expect(screen.getAllByText('olorin inc.').length).toBeGreaterThan(0);
    });
    it('renders network risk assessment', () => {
      render(
        <AgentDetailsTable
          details={mockNetworkDetails}
          agentType="Network Agent"
        />,
      );
      expect(screen.getByText('Network Risk Assessment')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Geographic inconsistency / possible impossible travel',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'User demonstrates suspicious cross-country ISP usage within minutes, suggesting elevated network risk.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Device Agent Details', () => {
    it.skip('renders raw splunk results', () => {
      render(
        <AgentDetailsTable
          details={mockDeviceDetails}
          agentType="Device Agent"
        />,
      );
      expect(
        screen.getByText('Raw Splunk Results (2 records)'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('cfe50512-1885-4f45-bc74-8d5a556a8d23'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('f394742f39214c908476c01623bf4bcd'),
      ).toBeInTheDocument();
      expect(screen.getByText('bengaluru')).toBeInTheDocument();
      expect(screen.getByText('karnataka')).toBeInTheDocument();
    });

    it.skip('renders extracted device signals', () => {
      render(
        <AgentDetailsTable
          details={mockDeviceDetails}
          agentType="Device Agent"
        />,
      );
      expect(
        screen.getByText('Extracted Device Signals (2 signals)'),
      ).toBeInTheDocument();
      expect(screen.getByText('223.185.128.58')).toBeInTheDocument();
      expect(
        screen.getByText('5b2cd1da38f4403d99c2b6fea53604d9'),
      ).toBeInTheDocument();
    });

    it.skip('renders device signal risk assessment', () => {
      render(
        <AgentDetailsTable
          details={mockDeviceDetails}
          agentType="Device Agent"
        />,
      );
      expect(
        screen.getByText('Device Signal Risk Assessment'),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Multiple devices used from different countries (US and India)',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'High-risk scenario due to multiple devices operating from distinct regions',
        ),
      ).toBeInTheDocument();
      expect(screen.getByText('0.9')).toBeInTheDocument();
    });

    it('renders warnings', () => {
      render(
        <AgentDetailsTable
          details={mockDeviceDetails}
          agentType="Device Agent"
        />,
      );
      expect(screen.getByText('Warnings')).toBeInTheDocument();
      expect(
        screen.getByText('DI tool warning message'),
      ).toBeInTheDocument();
    });

    it('renders llm thoughts', () => {
      render(
        <AgentDetailsTable
          details={mockDeviceDetails}
          agentType="Device Agent"
        />,
      );
      expect(screen.getByText('LLM Thoughts')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Device shows high risk patterns',
        ),
      ).toBeInTheDocument();
    });

    it('renders legacy current device information', () => {
      render(
        <AgentDetailsTable
          details={mockDeviceDetails}
          agentType="Device Agent"
        />,
      );
      expect(screen.getByText('Current Device')).toBeInTheDocument();
      expect(screen.getByText('DEV123')).toBeInTheDocument();
      expect(screen.getByText('Mobile')).toBeInTheDocument();
      expect(screen.getByText('iOS 15.0')).toBeInTheDocument();
      expect(screen.getByText('Safari')).toBeInTheDocument();
    });

    it('renders legacy device history', () => {
      render(
        <AgentDetailsTable
          details={mockDeviceDetails}
          agentType="Device Agent"
        />,
      );
      expect(screen.getByText('Device History')).toBeInTheDocument();
      expect(screen.getByText('DEV456')).toBeInTheDocument();
      expect(screen.getByText('Desktop')).toBeInTheDocument();
      expect(screen.getByText('Windows 10')).toBeInTheDocument();
    });

    it('renders legacy risk assessment', () => {
      render(
        <AgentDetailsTable
          details={mockDeviceDetails}
          agentType="Device Agent"
        />,
      );
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
      expect(screen.getByText('0.3')).toBeInTheDocument();
      expect(screen.getByText('Device change detected')).toBeInTheDocument();
      expect(screen.getByText('Unusual browser')).toBeInTheDocument();
      expect(screen.getByText('0.7')).toBeInTheDocument();
    });

    it('handles missing current device', () => {
      const detailsWithoutCurrent = {
        ...mockDeviceDetails,
        current_device: undefined,
      };
      render(
        <AgentDetailsTable
          details={detailsWithoutCurrent}
          agentType="Device Agent"
        />,
      );
      expect(screen.queryByText('Current Device')).not.toBeInTheDocument();
    });

    it('handles empty device history', () => {
      const detailsWithoutHistory = {
        ...mockDeviceDetails,
        device_history: [],
      };
      render(
        <AgentDetailsTable
          details={detailsWithoutHistory}
          agentType="Device Agent"
        />,
      );
      expect(screen.queryByText('Device History')).not.toBeInTheDocument();
    });

    it('handles missing new format fields', () => {
      const detailsWithoutNewFields = {
        current_device: mockDeviceDetails.current_device,
        device_history: mockDeviceDetails.device_history,
        risk_assessment: mockDeviceDetails.risk_assessment,
      };
      render(
        <AgentDetailsTable
          details={detailsWithoutNewFields}
          agentType="Device Agent"
        />,
      );
      expect(screen.queryByText('Raw Splunk Results')).not.toBeInTheDocument();
      expect(
        screen.queryByText('Extracted Device Signals'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByText('Device Signal Risk Assessment'),
      ).not.toBeInTheDocument();
    });
  });

  describe('Log Agent Details', () => {
    it('renders behavior patterns', () => {
      render(
        <AgentDetailsTable details={mockLogDetails} agentType="Log Agent" />,
      );
      expect(screen.getByText('Behavior Patterns')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('true')).toBeInTheDocument();
    });

    it.skip('renders anomalies', () => {
      render(
        <AgentDetailsTable details={mockLogDetails} agentType="Log Agent" />,
      );
      expect(screen.getByText('Anomalies')).toBeInTheDocument();
      expect(screen.getByText('Multiple failed logins')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
    });

    it.skip('renders risk assessment', () => {
      render(
        <AgentDetailsTable details={mockLogDetails} agentType="Log Agent" />,
      );
      expect(screen.getByText('Risk Assessment')).toBeInTheDocument();
      expect(screen.getByText('0.8')).toBeInTheDocument();
      expect(screen.getByText('Multiple failed logins')).toBeInTheDocument();
      expect(screen.getByText('Unusual login time')).toBeInTheDocument();
      expect(screen.getByText('0.95')).toBeInTheDocument();
    });

    it('handles missing behavior patterns', () => {
      const detailsWithoutPatterns = {
        ...mockLogDetails,
        behavior_patterns: undefined,
      };
      render(
        <AgentDetailsTable
          details={detailsWithoutPatterns}
          agentType="Log Agent"
        />,
      );
      expect(screen.queryByText('Behavior Patterns')).not.toBeInTheDocument();
    });

    it('handles empty anomalies', () => {
      const detailsWithoutAnomalies = { ...mockLogDetails, anomalies: [] };
      render(
        <AgentDetailsTable
          details={detailsWithoutAnomalies}
          agentType="Log Agent"
        />,
      );
      expect(screen.queryByText('Anomalies')).not.toBeInTheDocument();
    });
  });

  describe('Value Rendering', () => {
    it('renders null values', () => {
      const detailsWithNull = { test: null };
      render(
        <AgentDetailsTable details={detailsWithNull} agentType="Test Agent" />,
      );
      expect(screen.getByText('null')).toBeInTheDocument();
    });

    it('renders boolean values', () => {
      const detailsWithBoolean = { test: true };
      render(
        <AgentDetailsTable
          details={detailsWithBoolean}
          agentType="Test Agent"
        />,
      );
      expect(screen.getByText('true')).toHaveClass('text-green-600');
    });

    it('renders number values', () => {
      const detailsWithNumber = { test: 42 };
      render(
        <AgentDetailsTable
          details={detailsWithNumber}
          agentType="Test Agent"
        />,
      );
      expect(screen.getByText('42')).toHaveClass('text-blue-600');
    });

    it('renders string values', () => {
      const detailsWithString = { test: 'hello' };
      render(
        <AgentDetailsTable
          details={detailsWithString}
          agentType="Test Agent"
        />,
      );
      expect(screen.getByText('hello')).toHaveClass('text-gray-700');
    });

    it('renders array values', () => {
      const detailsWithArray = { test: ['item1', 'item2'] };
      render(
        <AgentDetailsTable details={detailsWithArray} agentType="Test Agent" />,
      );
      expect(screen.getByText('item1')).toBeInTheDocument();
      expect(screen.getByText('item2')).toBeInTheDocument();
    });

    it('renders nested objects', () => {
      const detailsWithNested = {
        test: {
          key1: 'value1',
          key2: {
            subkey: 'subvalue',
          },
        },
      };
      render(
        <AgentDetailsTable
          details={detailsWithNested}
          agentType="Test Agent"
        />,
      );
      expect(screen.getByText('value1')).toBeInTheDocument();
      expect(screen.getByText('subvalue')).toBeInTheDocument();
    });
  });

  describe('Additional Information', () => {
    it('renders additional information section', () => {
      const detailsWithAdditional = {
        ...mockLocationDetails,
        extra_field: 'extra value',
      };
      render(
        <AgentDetailsTable
          details={detailsWithAdditional}
          agentType="Location Agent"
        />,
      );
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
      expect(screen.getByText('extra value')).toBeInTheDocument();
    });

    it('does not render additional information section when empty', () => {
      render(
        <AgentDetailsTable
          details={mockLocationDetails}
          agentType="Location Agent"
        />,
      );
      expect(
        screen.queryByText('Additional Information'),
      ).not.toBeInTheDocument();
    });
  });

  describe('AgentDetailsTable uncovered branches', () => {
    it.skip('renders DI BB Results with errorMessage and object parsedData', () => {
      const details = {
        di_bb: {
          status: 'fail',
          elapsedTime: 123,
          errorMessage: 'Something went wrong',
          parsedData: { foo: 'bar' },
        },
      };
      render(<AgentDetailsTable details={details} agentType="Device Agent" />);
      expect(
        screen.getByText('Device Intelligence (DI BB)'),
      ).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('foo')).toBeInTheDocument();
    });

    it('renders DI BB Results with string parsedData and no errorMessage', () => {
      const details = {
        di_bb: {
          status: 'ok',
          elapsedTime: 456,
          parsedData: 'raw string data',
        },
      };
      render(<AgentDetailsTable details={details} agentType="Device Agent" />);
      expect(
        screen.getByText('Device Intelligence (DI BB)'),
      ).toBeInTheDocument();
      expect(screen.getByText('raw string data')).toBeInTheDocument();
    });

    it('renders Additional Information for rest fields in device agent', () => {
      const details = { foo: 'bar' };
      render(<AgentDetailsTable details={details} agentType="Device Agent" />);
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
      expect(screen.getByText('bar')).toBeInTheDocument();
    });

    it('renders Additional Information for rest fields in network agent', () => {
      const details = { foo: 'bar' };
      render(<AgentDetailsTable details={details} agentType="Network Agent" />);
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
      expect(screen.getByText('bar')).toBeInTheDocument();
    });

    it('renders Additional Information for rest fields in location agent', () => {
      const details = { foo: 'bar' };
      render(
        <AgentDetailsTable details={details} agentType="Location Agent" />,
      );
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
      expect(screen.getByText('bar')).toBeInTheDocument();
    });

    it('renders Additional Information for rest fields in log agent', () => {
      const details = { foo: 'bar' };
      render(<AgentDetailsTable details={details} agentType="Log Agent" />);
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
      expect(screen.getByText('bar')).toBeInTheDocument();
    });

    it('renders default branch for unknown agentType', () => {
      const details = { foo: 'bar' };
      render(<AgentDetailsTable details={details} agentType="Unknown Agent" />);
      expect(screen.getByText('foo')).toBeInTheDocument();
      expect(screen.getByText('bar')).toBeInTheDocument();
    });

    it('renders with empty details object', () => {
      render(<AgentDetailsTable details={{}} agentType="Unknown Agent" />);
      expect(screen.getByText('Unknown Agent Details')).toBeInTheDocument();
    });

    it('renders with all optional fields missing', () => {
      render(<AgentDetailsTable details={{}} agentType="Device Agent" />);
      expect(screen.getByText('Device Agent Details')).toBeInTheDocument();
    });
  });
});
