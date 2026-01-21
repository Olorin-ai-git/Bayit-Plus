// Compatibility wrapper: use the microservice investigation config as the single source of truth.
// This avoids duplicated configuration logic and keeps validation consistent across the app.
export {
  getInvestigationConfig,
  type InvestigationConfig,
} from '../microservices/investigation/config/investigationConfig';
