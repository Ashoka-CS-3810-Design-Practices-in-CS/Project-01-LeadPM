import { validateNetwork } from './validateNetwork';
import { requestJson } from '../services/api';
export async function loadNetwork() {
  const { response, data } = await requestJson(`${import.meta.env.BASE_URL}metro-network.json`);
  if (!response.ok) throw new Error('Network unavailable');
  return validateNetwork(data);
}
