async (page) => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const cases=[];
 await page.setViewportSize({width:402,height:874});
 for(const experience of ['Novice','Intermediate','Expert']){
  await page.goto(`http://127.0.0.1:3011/review/screen?screen=pro&experience=${experience}`);
  await page.getByRole('button',{name:'Get Pro Access',exact:true}).waitFor();
  const heading=await page.getByRole('heading',{level:1}).textContent();
  cases.push({experience,heading});
  const selected=page.locator('[aria-label="Pro billing period"] button[aria-pressed="true"]');
  const box=await selected.boundingBox();
  const footer=await page.locator('footer').boundingBox();
  if(!box||!footer||box.y+box.height>footer.y)throw Error('Selected plan is hidden behind footer');
  await page.screenshot({path:`output/playwright/V6MasterGrowbotPaywall${experience}.png`});
 }
 await page.goto('http://127.0.0.1:3011/review/screen?screen=sample');
 await page.getByRole('button',{name:'Make it yours'}).waitFor();
 const button=await page.getByRole('button',{name:'Make it yours'}).isEnabled();
 if(!button)throw Error('Walkthrough blocks Continue');
 await page.getByRole('button',{name:'Replay photo-to-report animation'}).click();
 await page.locator('.sample-playing').waitFor();
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.reload();
 if(await page.locator('.sample-playing').count())throw Error('Reduced motion still plays');
 await page.screenshot({path:'output/playwright/V6MasterGrowbotSampleReport.png'});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('http://127.0.0.1:3011/review/screen?screen=premium&experience=Expert');
 await page.getByText('Continue with Premium',{exact:true}).waitFor();
 await page.screenshot({path:'output/playwright/V6MasterGrowbotPremiumPaywall.png'});
 await page.setViewportSize({width:1280,height:1000});
 await page.goto('http://127.0.0.1:3011/review');
 await page.getByRole('combobox',{name:'Grower experience'}).selectOption('Expert');
 await page.getByRole('button',{name:'07 Pro subscription'}).click();
 await page.frameLocator('iframe').getByRole('heading',{name:'Your observations. One grow record.'}).waitFor();
 if(errors.length)throw Error(errors.join('; '));
 return {cases,unblockedContinue:button,reducedMotion:true,visibleSelectedPlan:true,pageErrors:errors};
}
