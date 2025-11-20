'use client';

interface PermissionModalProps {
  type: 'camera' | 'location' | 'motion';
  onGrant: () => void;
  onDeny?: () => void;
}

export default function PermissionModal({ type, onGrant, onDeny }: PermissionModalProps) {
  const getTitle = () => {
    switch (type) {
      case 'camera':
        return 'Camera Access Required';
      case 'location':
        return 'Location Access Required';
      case 'motion':
        return 'Device Motion Access Required';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'camera':
        return 'This app needs access to your camera to display the AR overlay.';
      case 'location':
        return 'This app needs your location to calculate the sun trajectory.';
      case 'motion':
        return 'This app needs access to device motion to align the AR overlay with your surroundings.';
    }
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h2 className="text-xl font-bold mb-2">{getTitle()}</h2>
        <p className="text-sm text-gray-600 mb-4">{getDescription()}</p>
        <div className="flex gap-2">
          <button
            onClick={onGrant}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Grant Permission
          </button>
          {onDeny && (
            <button
              onClick={onDeny}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Deny
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

