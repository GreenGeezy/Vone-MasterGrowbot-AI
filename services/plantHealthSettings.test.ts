import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPlantHealthSettings, savePlantHealthSettings } from './plantHealthSettings';

afterEach(() => vi.unstubAllGlobals());
describe('Plant Health selection persistence', () => {
  it('uses Generic with the profile environment until the user selects settings', () => {
    vi.stubGlobal('localStorage',{getItem:()=>null});
    expect(readPlantHealthSettings('Greenhouse')).toEqual({strain:'Generic',growMethod:'Greenhouse'});
  });
  it('restores the page selection instead of overwriting it with profile defaults', () => {
    const store=new Map<string,string>();
    vi.stubGlobal('localStorage',{getItem:(key:string)=>store.get(key),setItem:(key:string,value:string)=>store.set(key,value)});
    savePlantHealthSettings({strain:'My custom strain',growMethod:'Outdoor'});
    expect(readPlantHealthSettings('Indoor')).toEqual({strain:'My custom strain',growMethod:'Outdoor'});
  });
  it('tolerates missing/corrupt storage and invalid values', () => {
    vi.stubGlobal('localStorage',{getItem:()=>'{bad',setItem:()=>{throw Error('storage unavailable');}});
    expect(readPlantHealthSettings()).toEqual({strain:'Generic',growMethod:'Indoor'});
    expect(()=>savePlantHealthSettings({strain:'Generic',growMethod:'Indoor'})).not.toThrow();
    vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify({strain:' ',growMethod:'invalid'})});
    expect(readPlantHealthSettings('Outdoor')).toEqual({strain:'Generic',growMethod:'Outdoor'});
  });
});
