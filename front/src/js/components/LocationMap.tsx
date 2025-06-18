import React from 'react';

interface LocationData {
  lat: number;
  lng: number;
  type: string;
  title?: string;
  description?: string;
}

interface LocationMapProps {
  locations: LocationData[];
  center?: { lat: number; lng: number };
  zoom?: number;
}

/**
 * LocationMap component displays location data in a table format
 * @param {LocationMapProps} props - Component props containing location data
 * @returns {JSX.Element} The rendered location table component
 */
const LocationMap = ({
  locations = [],
  center,
  zoom,
}: LocationMapProps): JSX.Element => {
  if (!locations || locations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-gray-500 text-lg mb-2">📍</div>
          <p className="text-gray-500">No location data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Location Data</h3>
        {center && (
          <p className="text-sm text-gray-500 mt-1">
            Center: {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
            {zoom && ` | Zoom: ${zoom}`}
          </p>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Coordinates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {locations.map((location, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    location.type === 'customer' 
                      ? 'bg-blue-100 text-blue-800'
                      : location.type === 'merchant'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {location.type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="font-mono">
                    <div>Lat: {location.lat.toFixed(6)}</div>
                    <div>Lng: {location.lng.toFixed(6)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {location.title || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {location.description || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Showing {locations.length} location{locations.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
};

LocationMap.defaultProps = {
  center: { lat: 0, lng: 0 },
  zoom: 10,
};

export default LocationMap;
