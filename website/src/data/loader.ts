import { validateNetwork } from './validateNetwork';
import { requestJson } from '../services/api';
export async function loadNetwork() {
  const { response, data } = await requestJson('/api/network');
  if (!response.ok) throw new Error('Network unavailable');
  return validateNetwork(data);
}
