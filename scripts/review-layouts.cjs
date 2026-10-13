async (page) => {
  const screens=['welcome','sample','intent','experience','environment','summary','pro','first','report','journal','references','premium','recovery'];
  const results=[];const failures=[];
  for(const width of [375,390,393,402,414,430,440]){
    await page.setViewportSize({width,height:width===375?667:874});
    for(const screen of screens){
      await page.goto(`http://127.0.0.1:3011/review/screen?screen=${screen}`);
      await page.locator('#root > *').first().waitFor({state:'visible'});
      if(screen==='pro')await page.getByRole('button',{name:'Get Pro Access',exact:true}).waitFor();
      if(screen==='premium')await page.getByText('Continue with Premium',{exact:true}).waitFor();
      const geometry=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,
        footer:[...document.querySelectorAll('.journey-footer button,.journey-screen button')].filter(e=>e.textContent==='Continue').map(e=>({y:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom})),height:innerHeight}));
      if(geometry.documentWidth>width+1||geometry.footer.some(e=>e.bottom>geometry.height+1))failures.push({width,screen,geometry});
      results.push({width,screen});
      if(width===402)await page.screenshot({path:`output/playwright/V5MasterGrowbot-${screen}.png`});
    }
  }
  await page.setViewportSize({width:375,height:667});
  for(const screen of ['intent','environment','summary','pro','premium']){
    await page.goto(`http://127.0.0.1:3011/review/screen?screen=${screen}&text=large`);
    await page.locator('#root > *').first().waitFor({state:'visible'});
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    if(overflow)failures.push({width:375,screen,largeText:true});
  }
  await page.goto('http://127.0.0.1:3011/review/screen?screen=intent');
  await page.getByRole('button',{name:/Keep my grow organized/}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:/Getting started/}).click();await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.reload();await page.getByRole('heading',{name:'What’s your growing goal?'}).waitFor();
  // Gallery links intentionally choose their screen; the application draft remains persisted independently.
  const draft=await page.evaluate(()=>JSON.parse(localStorage.getItem('mg_onboarding_v2')));
  if(draft.profile.onboardingIntent!=='journal'||draft.profile.experience!=='Novice')failures.push({check:'Persisted choices',draft});
  await page.setViewportSize({width:1280,height:1000});await page.goto('http://127.0.0.1:3011/review');
  await page.locator('iframe').waitFor();await page.screenshot({path:'output/playwright/V5MasterGrowbotGallery.png',fullPage:true});
  return {layouts:results.length,largeTextLayouts:5,failures};
}
