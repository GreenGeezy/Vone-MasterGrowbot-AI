import { beforeEach, describe, expect, it, vi } from 'vitest';
const invoke=vi.hoisted(()=>vi.fn());
vi.mock('./supabaseClient',()=>({supabase:{functions:{invoke}}}));
import { diagnosePlant } from './geminiService';
beforeEach(()=>{
  invoke.mockReset();
  invoke.mockResolvedValue({data:{result:JSON.stringify({diagnosis:'Healthy',healthScore:95})},error:null});
});
describe('diagnosis request uses explicit Plant Health context',()=>{
  it.each(['Indoor','Outdoor','Greenhouse'] as const)('passes %s and the selected strain to the AI request',async growMethod=>{
    await diagnosePlant('data:image/png;base64,fixture',{strain:'My selected strain',growMethod,userProfile:{experience:'Novice',grow_mode:'Indoor'}});
    const [name,{body}]=invoke.mock.calls[0];
    expect(name).toBe('gemini-v3');
    expect(body.image).toBe('fixture');
    expect(body.prompt).toContain('- Method: '+growMethod+'.');
    expect(body.prompt).toContain('- Strain: My selected strain');
  });
});
