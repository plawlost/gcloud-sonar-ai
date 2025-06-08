export { SonarAI } from './sonar';
export { AuthManager } from './auth';
export { SonarUtils } from './utils';
export * from './types';

// Default export for easier importing
import { SonarAI } from './sonar';
export default SonarAI;

// Version info from package.json
export const version = require('../package.json').version; 