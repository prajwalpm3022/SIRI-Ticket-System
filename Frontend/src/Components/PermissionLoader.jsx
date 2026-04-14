// Placeholder component — permission loading is handled automatically
// by PermissionContext based on currentMenu. This wrapper is kept for
// structural consistency in the route tree and can be removed if no
// additional permission-gate logic is needed in future.
const PermissionLoader = ({ children }) => children;

export default PermissionLoader;
