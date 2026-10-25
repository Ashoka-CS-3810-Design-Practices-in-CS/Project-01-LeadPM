import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StationSearch } from '../components/StationSearch';
import { validateNetwork } from '../data/validateNetwork';
import data from './fixtures/sample-network.json';
import { createRouteService } from './referenceRouteService';
import App from '../App';
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === `${import.meta.env.BASE_URL}metro-network.json`) return new Response(JSON.stringify(data));
    throw new Error(`Unexpected request: ${url}`);
  }));
});
describe('user interaction',()=>{
  it('requires an explicit record and supports keyboard selection',async()=>{
    const select=vi.fn(), user=userEvent.setup(); render(<StationSearch label="From" model={validateNetwork(data)} selectedId={null} onSelect={select}/>);
    await user.type(screen.getByRole('combobox'),'rjc'); expect(select).toHaveBeenLastCalledWith(null); await user.keyboard('{Enter}'); expect(select).toHaveBeenLastCalledWith('rajiv-chowk');
  });
  it('shows unknown-query feedback',async()=>{const user=userEvent.setup();render(<StationSearch label="From" model={validateNetwork(data)} selectedId={null} onSelect={()=>{}}/>);await user.type(screen.getByRole('combobox'),'atlantis');expect(screen.getByText(/No matching station found/)).toBeVisible();});
  it('plans a route and clears both details and map highlighting when text changes',async()=>{
    const user=userEvent.setup(); const {container}=render(<App/>); const source=await screen.findByRole('combobox',{name:'From'}); const destination=screen.getByRole('combobox',{name:'To'});
    expect(screen.getByRole('button',{name:/Find fastest route/})).toBeDisabled();
    await user.type(source,'NDL');await user.keyboard('{Enter}');await user.type(destination,'RKA');await user.keyboard('{Enter}');await user.click(screen.getByRole('button',{name:/Find fastest route/}));
    const details=await screen.findByRole('region',{name:'Route details'});expect(within(details).getByText('Change at Rajiv Chowk')).toBeVisible();expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(2);
    await user.type(destination,'x');expect(screen.queryByRole('region',{name:'Route details'})).toBeNull();expect(container.querySelectorAll('[data-highlighted="true"]')).toHaveLength(0);
    await user.click(screen.getByRole('button',{name:'New route'}));expect(screen.getByRole('combobox',{name:'From'})).toHaveValue('');expect(screen.getByRole('combobox',{name:'To'})).toHaveValue('');
  });
});
