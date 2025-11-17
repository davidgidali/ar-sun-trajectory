// Type declarations for iOS DeviceMotionEvent.requestPermission
declare global {
  interface DeviceMotionEventConstructor {
    requestPermission?: () => Promise<PermissionState>;
  }
  
  interface DeviceOrientationEventConstructor {
    requestPermission?: () => Promise<PermissionState>;
  }
}

export {};

