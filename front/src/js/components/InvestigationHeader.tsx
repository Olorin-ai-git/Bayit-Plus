import React from 'react';
import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { FaComments, FaBars } from 'react-icons/fa';
import Stopwatch from './Stopwatch';

/* eslint-disable @typescript-eslint/no-unused-vars */
interface Props {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  setIsEditModalOpen: (open: boolean) => void;
  isLoading: boolean;
  userId: string;
  setUserId: (id: string) => void;
  handleSubmit: (event: React.FormEvent) => void;
  cancelledRef: React.MutableRefObject<boolean>;
  closeInvestigation: () => void;
  startTime?: Date | null;
  endTime?: Date | null;
  isChatSidebarOpen: boolean;
  setIsChatSidebarOpen: (open: boolean) => void;
  currentInvestigationId: string;
  timeRange: string;
  onTimeRangeChange: (value: string) => void;
  selectedInputType: 'userId' | 'deviceId';
  setSelectedInputType: (type: 'userId' | 'deviceId') => void;
}
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Header component for the investigation page
 * @param {Props} props - Component props
 * @returns {JSX.Element} The rendered header component
 */
const InvestigationHeader: React.FC<Omit<Props, 'useMock'>> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  setIsEditModalOpen,
  isLoading,
  userId,
  setUserId,
  handleSubmit,
  cancelledRef,
  closeInvestigation,
  startTime = null,
  endTime = null,
  isChatSidebarOpen,
  setIsChatSidebarOpen,
  currentInvestigationId,
  timeRange,
  onTimeRangeChange,
  selectedInputType,
  setSelectedInputType,
}) => {
  const timeRangeOptions = [
    '1d',
    '3d',
    '10d',
    '30d',
    '60d',
    '120d',
    '180d',
    '360d',
  ];

  /**
   * Handles the Start investigation button click and triggers form submission.
   * @param {React.MouseEvent<HTMLButtonElement>} e - The click event
   */
  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Create a synthetic form event to match handleSubmit signature
    const { form } = e.currentTarget;
    if (form) {
      const event = new window.Event('submit', {
        bubbles: true,
        cancelable: true,
      });
      form.dispatchEvent(event);
    } else {
      // fallback: call handleSubmit with a dummy event
      handleSubmit(e as React.FormEvent);
    }
  };

  /**
   * Handles stopping the investigation by setting the cancelled flag and closing the investigation.
   */
  const handleStopInvestigation = () => {
    cancelledRef.current = true;
    closeInvestigation();
  };

  return (
    <>
      <div className="sticky top-0 bg-white z-10">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              ATO Fraud Investigation System
            </h1>
            <h2 className="text-lg text-gray-500 mt-1 mb-6">
              Investigation ID:{' '}
              <span className="text-blue-500">{currentInvestigationId}</span>
            </h2>
          </div>
          <div className="mb-4">
            <label htmlFor="timeRange" className="mr-2 font-medium">
              Time Range:
            </label>
            <select
              id="timeRange"
              value={timeRange}
              onChange={(e) => onTimeRangeChange(e.target.value)}
              className="border rounded px-2 py-1"
            >
              {timeRangeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <div className="relative group">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center gap-2"
                aria-label="Toggle Logs Sidebar"
                data-testid="toggle-logs-btn"
              >
                {React.createElement(FaBars as unknown as React.ElementType, {
                  size: 16,
                })}
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                Toggle Logs Sidebar
              </div>
            </div>
            <div className="relative group">
              <button
                type="button"
                onClick={() => setIsChatSidebarOpen(!isChatSidebarOpen)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center gap-2"
                aria-label="Toggle Chat Sidebar"
                data-testid="toggle-chat-btn"
              >
                {React.createElement(
                  FaComments as unknown as React.ElementType,
                  { size: 16 },
                )}
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                Toggle Chat Sidebar
              </div>
            </div>
            <div className="relative group">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className={`px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                aria-label="Edit Steps"
                disabled={isLoading}
                data-testid="edit-steps-btn"
              >
                <PencilSquareIcon className="w-5 h-5 mr-1" />
              </button>
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
                Edit Steps
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Radio button group for input type selection */}
          <div className="flex gap-6">
            <div className="flex items-center">
              <input
                id="user-id-radio"
                name="input-type"
                type="radio"
                value="userId"
                checked={selectedInputType === 'userId'}
                onChange={(e) =>
                  setSelectedInputType(e.target.value as 'userId' | 'deviceId')
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label
                htmlFor="user-id-radio"
                className="ml-2 text-sm font-medium text-gray-700"
              >
                User ID
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="device-id-radio"
                name="input-type"
                type="radio"
                value="deviceId"
                checked={selectedInputType === 'deviceId'}
                onChange={(e) =>
                  setSelectedInputType(e.target.value as 'userId' | 'deviceId')
                }
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <label
                htmlFor="device-id-radio"
                className="ml-2 text-sm font-medium text-gray-700"
              >
                Device ID
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading && userId.trim() !== '') {
                  handleSubmit(e as React.FormEvent);
                }
              }}
              placeholder={
                selectedInputType === 'userId'
                  ? 'Enter User ID'
                  : 'Enter Device ID'
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {!isLoading ? (
              <button
                type="button"
                onClick={handleButtonClick}
                disabled={userId.trim() === '' || isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                title="Start the investigation"
              >
                Start investigation
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopInvestigation}
                disabled={!isLoading}
                className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                title="Stop the investigation"
              >
                Stop investigation
              </button>
            )}
          </div>
          {startTime && (
            <div className="flex justify-end">
              <Stopwatch
                startTime={startTime}
                endTime={endTime}
                label="Investigation Time"
                className="text-lg"
                data-testid="stopwatch"
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InvestigationHeader;
